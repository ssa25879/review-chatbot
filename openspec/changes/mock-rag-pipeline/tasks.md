# Tasks

## 1. 샘플 데이터 보정

- [x] 1.1 `samples/review.csv`의 r007·r013 행 `content`를 큰따옴표로 인용하고, `node -e`로 papaparse(`header: true, skipEmptyLines: true`) 파싱 시 100행·`errors` 0건이며 두 행의 `author`가 각각 "통근러", "직장인A"인지 확인

## 2. Mock 리뷰 저장소 (`src/lib/review-store.ts`)

- [x] 2.1 `Review`/`StoredMessage` 타입과 CSV 로드 함수(`fs.promises.readFile` + papaparse, 숫자 변환, 파싱 오류 시 throw, `globalThis` Promise 캐시·실패 시 캐시 해제)를 구현하고 `npx tsc --noEmit` 통과 확인
- [x] 2.2 `indexMockReviews()`(캐시 무효화 후 재적재, 건수 반환)를 구현하고, 임시 스크립트(`npx tsx` 등, scratchpad)로 두 번 호출해 모두 100을 반환하는지 확인
- [x] 2.3 조사 제거 토큰화와 `searchMockReviews(query, topK = 5)`(design §3의 원점수·매칭 없음 fallback·min-max 0.65~0.98 정규화·결정적 정렬)를 구현하고, 스크립트로 "노이즈캔슬링 성능은 어때?"·"배터리가 오래 가나요?"·"ㅎㅎ" 결과가 스펙 시나리오(키워드 포함, helpful_votes 상위 5건, 점수 범위·내림차순)를 만족하는지 확인
- [x] 2.4 `saveMockMessage(chatId, message)` / `getMockMessages(chatId)`를 `globalThis` Map으로 구현하고 스크립트로 저장 순서대로 조회되는지 확인

## 3. 데이터 접근 계층 (`src/lib/data-access.ts`)

- [x] 3.1 `getDataMode()`, `NotImplementedError`, `indexReviews()`·`searchReviews()`·`saveMessage()`(mock → review-store 위임, real → `NotImplementedError`)를 구현하고 `src/app/page.tsx`의 모드 판정을 `getDataMode()`로 교체한 뒤 `npx tsc --noEmit` 통과 및 모드 배지가 그대로 "Mock 모드"로 보이는지 확인

## 4. 인덱싱 API

- [x] 4.1 `src/app/api/index-data/route.ts` POST 구현(성공 `{ success: true, mode, data: { indexed } }`, `NotImplementedError` → 501, 기타 오류 → 500)하고 `curl -X POST http://localhost:3000/api/index-data`가 `indexed: 100`, `USE_MOCK=false` 기동 시 501을 반환하는지 확인
- [x] 4.2 `src/app/api/ingest/route.ts`를 삭제하고 `Grep`으로 `/api/ingest` 참조가 `src`에 남지 않았는지 확인(api-client 교체는 6.1)

## 5. RAG 체인과 Chat API

- [x] 5.1 `src/lib/rag-context.ts`에 `buildContext(reviews)`(`[리뷰 N] ★{rating} {title} — {content} (작성자: {author})`를 줄바꿈 연결)를 구현하고 `npx tsc --noEmit` 통과 확인
- [x] 5.2 `src/app/api/chat/route.ts`를 교체: `{ query, chatId? }` 검증(400), 검색 → `buildSummaryAnswer`로 `answer`, `retrieval = { query, chatId ?? null, context }` → user/assistant 메시지 저장 → `{ success: true, mode, answer, sources, retrieval }`(sources에 `date` 포함), `NotImplementedError` → 501, 기타 오류 → 500(상세는 `console.error`만). 요청 스크립트로 빈 질문 400, API 키 없이 "통화 품질 괜찮아?"가 200이고 `answer`가 일반 문장(질문·건수·평균 별점·첫 source 작성자 포함), `retrieval.context`가 `[리뷰 1] ★`로 시작해 sources 수만큼 줄을 갖고, chatId 생략 시 `retrieval.chatId`가 `null`인지 확인
- [x] 5.3 `rag-context.ts`에 `buildSummaryAnswer(query, reviews)`(질문·건수·평균 별점·최상위 리뷰 작성자/제목/본문 + "AI 답변 생성 준비 중" 안내, 빈 결과 문구)를 추가하고 `npx tsc --noEmit` 통과 확인

## 6. UI 연결

- [x] 6.1 `src/lib/types.ts`(`SourceReview.date`, `mode?`, `IndexResult { indexed }`)와 `src/lib/api-client.ts`(`sendChat(query, chatId)` → `/api/chat`, `indexSamples()` → `/api/index-data`)를 갱신하고 `npx tsc --noEmit` 통과 확인
- [ ] 6.2 `IngestButton.tsx`가 `indexSamples()`와 `data.indexed`를 사용하고, `Dashboard.tsx`가 `useState(() => crypto.randomUUID())`로 세션 `chatId`를 만들어 `sendChat`에 넘기도록 수정한 뒤, 브라우저에서 [샘플 데이터 인덱싱] 클릭 시 "100건 인덱싱 완료" 표시와 Network 탭에서 연속 질문 두 건의 `chatId`가 같은지 확인
- [x] 6.3 `ChatResponse.retrieval`/assistant 메시지 `retrieval` 타입을 추가하고, `SourceReviews`와 같은 접이식 스타일의 `src/components/chat/RetrievalJson.tsx`("검색 결과 JSON", `{ ...retrieval, sources }`를 `<pre>`에 들여쓰기 출력, 최대 높이 내부 스크롤)를 만들어 `MessageBubble`에서 참고 리뷰 아래에 렌더링하고 `Dashboard`가 응답의 `retrieval`을 메시지에 저장하도록 수정한 뒤 `npx tsc --noEmit`·`npm run lint` 통과 확인

## 7. 통합 검증

- [x] 7.1 `npm run lint`와 `npm run build`가 통과하는지 확인
- [ ] 7.2 `npm run dev`에서 한글 질문(예: "배터리 수명은 어때?")을 Enter로 전송해 요청 1회·AI 버블에 요약 답변·참고 리뷰 카드(별점·작성자·관련도)·펼칠 수 있는 "검색 결과 JSON" 섹션(query·chatId·context·sources)이 표시되는지 확인

## Workflow follow-up

- 단위 작업 완료 후 Conventional Commits 형식의 한국어 커밋 메시지로 커밋한다.
- 검증 완료 후 `/opsx:archive`로 변경을 아카이브하고 메인 스펙(`review-chat`, `review-dashboard`, 신규 `review-retrieval`, `review-answer-generation`) 동기화를 확인한다.
