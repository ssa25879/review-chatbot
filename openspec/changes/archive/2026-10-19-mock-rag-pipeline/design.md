# Design

## Context

- `src/app/api/chat/route.ts`, `src/app/api/ingest/route.ts`는 지연 후 고정 응답을 돌려주는 스텁이다. UI(`Dashboard.tsx`, `IngestButton.tsx`)는 `src/lib/api-client.ts`의 `sendChat(question)` / `ingestSamples()`를 통해서만 API를 호출하고, `success`만 분기한다.
- `samples/review.csv`는 UTF-8, 헤더 `id,rating,title,content,author,date,helpful_votes,verified_purchase`, 100행이다. papaparse(`header: true`)로 파싱 시 r007, r013 두 행이 본문의 비인용 쉼표 때문에 `TooManyFields` 오류를 내며 `author`/`date`가 밀린다(관찰된 사실).
- 의존성 `papaparse`, `@langchain/core`, `@langchain/anthropic`은 이미 `package.json`에 추가되어 있다. 테스트 러너는 없다(검증은 `tsc`/`lint`/`build`와 `curl` 기반).
- 현재 `ANTHROPIC_API_KEY`가 없어 LLM을 호출할 수 없다. 그래서 이번에는 검색 결과를 JSON으로 그대로 보여주어 검색 품질과 컨텍스트 조립을 눈으로 검증한다.
- CLAUDE.md 제약: `PineconeStore`·외부 임베딩 금지, 환경변수는 `process.env.*`로만 참조.

## Goals / Non-Goals

**Goals:**
- 라우트가 모드를 몰라도 되도록 데이터 접근을 한 모듈(`data-access`)로 모으고, Mock 구현은 `review-store`에 둔다.
- 4단계에서 `data-access`의 real 분기만 채우면(Pinecone `searchRecords` / Supabase) 라우트·UI 변경 없이 전환되게 한다.

**Non-Goals:**
- 실데이터 모드 구현(Pinecone/Supabase) — 이번에는 501 "미지원" 오류만 반환.
- LLM 답변 생성(LCEL 체인, `claude-haiku-4-5`) — API 키 확보 후 후속 변경에서 추가.
- 대화 기록을 프롬프트에 넣는 멀티턴 문맥 — 기록은 저장만 하고, 답변은 단일 질문 기준으로 생성.
- 스트리밍 응답, 대화 기록 조회 API/UI.

## Decisions

### 1. 모듈 구조
```
src/lib/review-store.ts   Mock 구현: CSV 로드·캐시, indexMockReviews, searchMockReviews, saveMockMessage, getMockMessages
src/lib/data-access.ts    getDataMode(), indexReviews(), searchReviews(), saveMessage() — 모드 분기, real은 NotImplementedError
src/lib/rag-context.ts    buildContext(reviews), buildSummaryAnswer(query, reviews) — 컨텍스트 문자열·임시 템플릿 답변 조립
src/app/api/index-data/route.ts, src/app/api/chat/route.ts — 입력 검증 + data-access/rag-context 호출 + 응답 포맷
```
- 대안: 라우트 안에서 `if (USE_MOCK)` 분기 → 4단계에서 라우트를 다시 고쳐야 하고 모드 판정이 흩어져 기각.
- `getDataMode()`는 기존 대시보드 모드 배지 판정(`USE_MOCK !== 'false'`)과 동일 로직이며, 배지 렌더링도 이 함수를 재사용하도록 바꿔 판정 지점을 하나로 만든다.
- `NotImplementedError`(자체 Error 서브클래스)를 라우트에서 잡아 HTTP 501로 매핑한다.

### 2. CSV 로드와 캐시
- `fs.promises.readFile(path.join(process.cwd(), 'samples', 'review.csv'), 'utf8')` → `Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true })`.
- `rating`·`helpful_votes`는 `Number()`로 변환, BOM은 papaparse가 처리. 파싱 `errors`가 있으면 throw(→ 500)해 필드 밀림을 조용히 넘기지 않는다. 이를 위해 CSV의 r007·r013 행 본문을 큰따옴표로 인용 보정한다(대안: 파서에서 초과 필드를 content에 합치기 → 데이터 결함을 코드로 숨기므로 기각).
- 캐시는 `globalThis`에 `Promise<Review[]>`로 보관해 동시 요청 시 한 번만 읽고, dev HMR에서도 재로드되지 않게 한다. 실패하면 캐시를 비워 다음 요청에서 재시도.
- `indexMockReviews()`는 캐시를 무효화하고 다시 읽은 뒤 건수를 반환(파일 수정 반영 + 중복 적재 없음). `searchMockReviews()`는 캐시가 없으면 자동 로드.

### 3. 토큰화와 점수
- 토큰화: 소문자화 → `/[\s.,!?~"'()\[\]]+/`로 분리 → 각 토큰 끝의 조사를 긴 것부터 1회 제거(`에서|으로|이랑|한테|은|는|이|가|을|를|에|로|와|과|도|만|의|랑`) → 길이 2 이상만, 중복 제거. 형태소 분석기는 의존성 대비 효과가 낮아 기각.
- 원점수: `raw = Σ(title 출현 수 × 2 + content 출현 수) + log1p(helpful_votes) × 0.5`. 출현 수 합이 0인 리뷰는 후보에서 제외.
- 후보가 없으면 `helpful_votes` 내림차순 상위 topK를 후보로 하고 `raw = log1p(helpful_votes)`.
- 정규화: 선택된 topK의 raw를 min-max로 `score = 0.65 + 0.33 × (raw − min) / (max − min)`, max = min이면 모두 0.98. 소수 둘째 자리 반올림. 결과의 상대 순서가 UI 배지에 자연스럽게 보이도록 하는 표시용 점수이며 확률적 의미는 없다.
- 동점은 `helpful_votes` 내림차순, 그 다음 `id` 오름차순으로 결정적으로 정렬.

### 4. 대화 기록
- `globalThis`의 `Map<string, StoredMessage[]>`; `StoredMessage = { role: 'user' | 'assistant', content, createdAt: ISO string }`. `chatId` 생략 시 `"default"`.
- chat 라우트는 답변 생성 성공 후 user·assistant를 순서대로 저장한다(실패 시 저장 안 함 — 스펙 시나리오와 일치).
- 클라이언트 `chatId`는 `Dashboard`에서 `useState(() => crypto.randomUUID())`로 세션 동안 고정한다.

### 5. 템플릿 답변 + 검색 근거 (LLM 생략)
```ts
const context = buildContext(sources);
const answer = buildSummaryAnswer(query, sources);   // 건수·평균 별점·최상위 리뷰 요약 + "AI 답변 준비 중" 안내
const retrieval = { query, chatId: chatId ?? null, context };
return { success: true, mode, answer, sources, retrieval };
```
- 채팅 버블은 기존처럼 자연어 답변만 보여주고, 근거 JSON은 `retrieval` 필드로 분리한다. 처음에는 `answer`에 JSON을 넣었으나 답변 형태가 깨져 사용자 요청으로 변경했다.
- `retrieval`은 LLM 도입 후에도 "모델에 실제로 넘긴 근거"를 확인하는 용도로 유지할 수 있으므로 실데이터 모드에서도 같은 형식으로 반환한다(UI 모드 무관 원칙).
- UI: `RetrievalJson` 컴포넌트를 `SourceReviews`와 같은 접이식 카드 스타일로 만들고, `{ ...retrieval, sources }`를 `JSON.stringify(_, null, 2)`로 `<pre>`(고정폭, 최대 높이 + 내부 스크롤)에 출력한다. `sources`를 응답에서 중복 전송하지 않으려고 클라이언트에서 합친다.
- `buildContext`를 지금 구현해 두면, 후속 변경에서는 `answer` 생성부만 `ChatPromptTemplate.fromMessages([...]).pipe(new ChatAnthropic({ model: "claude-haiku-4-5", ... })).pipe(new StringOutputParser())`로 교체하면 된다. 이때 context는 시스템 문자열에 이어 붙이지 말고 템플릿 변수로 주입해 리뷰 본문의 `{`·`}`가 변수로 해석되지 않게 한다.
- 예기치 않은 예외는 `console.error`로만 상세를 남기고 응답에는 일반 문구만 노출한다.

### 6. API 계약과 클라이언트
- `types.ts`: `SourceReview`에 `date: string` 추가, `ChatResponse`/`ApiResponse`에 `mode?: DataMode`, `IngestResult` → `IndexResult { indexed: number }`.
- `api-client.ts`: `sendChat(query, chatId)` → `/api/chat` `{ query, chatId }`, `indexSamples()` → `/api/index-data`. `IngestButton`은 `res.data.indexed`를 표시. 기존 `postJson`의 오류 정규화는 그대로 재사용.
- `/api/ingest`는 삭제(호출부가 api-client 한 곳뿐이므로 호환 레이어 불필요).

## Risks / Trade-offs

- [서버 메모리 상태는 서버리스 인스턴스 간 공유되지 않음] → Mock 모드 한정 동작으로 명시. 검색은 자동 로드되므로 인덱싱 없이도 동작해 영향이 작다.
- [Vercel 배포 시 `samples/review.csv`가 함수 번들에 포함되지 않을 수 있음] → `process.cwd()` 기준 읽기로 Next 파일 트레이싱에 맡기고, 배포 단계(4단계 이후)에서 필요 시 `outputFileTracingIncludes`로 보강.
- [단순 부분 문자열 매칭이라 "노이즈캔슬링" vs "노이즈 캔슬링" 같은 표기 차이를 놓침] → 질문 키워드는 공백 분리 후 각각 매칭되므로 일부 완화. 정밀 검색은 4단계 벡터 검색이 담당.
- [점수 0.65~0.98은 표시용 상대값] → 스펙에 범위·내림차순만 보장하고 의미는 부여하지 않는다.
- [템플릿 답변은 질문 의도(장단점 등)를 해석하지 못함] → "AI 답변 준비 중" 안내를 함께 표시하고 LLM 연동 변경에서 교체한다.

## Migration Plan

- 요청/응답 계약이 바뀌므로 API 라우트와 `api-client`·UI를 같은 커밋에서 변경한다. 롤백은 해당 커밋 revert.
