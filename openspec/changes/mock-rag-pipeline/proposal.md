# Proposal

## Why

현재 `/api/chat`과 `/api/ingest`는 고정 응답을 돌려주는 임시 스텁이라, 대시보드 UI가 완성됐음에도 실제 리뷰 기반 답변을 확인할 수 없다. 외부 인프라(Pinecone/Supabase) 설정 없이 `samples/review.csv`만으로 검색 → 프롬프트 조립 → LLM 생성까지 동작하는 RAG 파이프라인을 먼저 완성해, 4단계에서 데이터 접근 계층만 교체하면 실데이터 모드로 확장할 수 있게 한다.

## What Changes

- **로컬 Mock 리뷰 저장소** 추가: `samples/review.csv`(100건)를 파싱해 서버 메모리에 캐싱하고, 키워드 매칭 + `helpful_votes` 기반 점수(0.65~0.98)로 상위 5건을 검색한다. 매칭 키워드가 없으면 `helpful_votes` 상위 5건을 반환한다.
- **대화 기록 인메모리 저장**: 질문·답변을 `chatId` 단위로 서버 메모리에 저장/조회한다.
- **데이터 접근 계층 분리**: 라우트는 모드 분기 함수(인덱싱·검색·메시지 저장)만 호출하고, Mock 구현은 별도 모듈에 둔다. 실데이터 구현은 이번 범위에서 "미지원" 오류를 반환하는 자리만 마련한다.
- **BREAKING** 인덱싱 API 경로를 `POST /api/ingest` → `POST /api/index-data`로 변경하고 응답을 `{ success, mode, data: { indexed } }`로 바꾼다. 기존 `/api/ingest`는 제거한다.
- **BREAKING** Chat API 요청 본문을 `{ question }` → `{ query, chatId? }`로 변경한다. 응답에 `mode`를 추가하고, `sources` 각 항목에 `date`를 추가한다.
- Chat API는 LLM 호출 없이 검색 결과를 요약한 템플릿 문장을 `answer`로 반환하고, 검색 근거(`query`, `chatId`, 프롬프트용 `context`)를 `retrieval` 필드로 함께 반환한다. 현재 `ANTHROPIC_API_KEY`가 없으므로 LLM 연동(LCEL 체인, `claude-haiku-4-5`)은 키 확보 후 후속 변경에서 `answer` 생성부만 교체한다.
- 채팅 UI는 AI 답변 아래에 [참고 리뷰]와 같은 형태의 접이식 [검색 결과 JSON] 섹션을 추가해 `retrieval`과 `sources`를 JSON으로 보여준다.
- UI의 [샘플 데이터 인덱싱] 버튼과 채팅 입력창을 새 API 계약에 연결한다(세션별 `chatId` 생성·전송 포함).
- `samples/review.csv`에서 따옴표 없이 쉼표를 포함한 2개 행(r007, r013)을 CSV 규격에 맞게 인용 처리한다.

## Capabilities

### New Capabilities
- `review-retrieval`: 리뷰 데이터 적재(인덱싱 API 포함)와 질문 기반 관련 리뷰 검색, 대화 기록 저장 — Mock/실데이터 모드 분기의 경계를 소유한다.
- `review-answer-generation`: Chat API가 질문에 대한 답변 응답을 만드는 서버 측 동작(입력 검증, 응답 형식, 오류 처리). 이번에는 검색 결과 요약 템플릿 답변과 검색 근거를 반환하며, 후속 변경에서 LLM 답변으로 교체한다.

### Modified Capabilities
- `review-chat`: 전송 요청 본문이 `{ query, chatId }`로 바뀌고, Chat API 응답 계약에 `mode`, `retrieval`, `SourceReview.date`가 추가되며, 답변 하단에 검색 결과 JSON 섹션이 추가된다.
- `review-dashboard`: [샘플 데이터 인덱싱] 버튼이 `POST /api/index-data`를 호출하고 `data.indexed`로 처리 건수를 표시한다.

## Impact

- **코드**: `src/lib/review-store.ts`(신규), `src/lib/data-access.ts`(신규, 모드 분기), `src/lib/rag-context.ts`(신규, 컨텍스트 조립), `src/app/api/index-data/route.ts`(신규), `src/app/api/chat/route.ts`(교체), `src/app/api/ingest/route.ts`(삭제), `src/lib/types.ts`, `src/lib/api-client.ts`, `src/components/dashboard/Dashboard.tsx`, `src/components/dashboard/IngestButton.tsx`, `src/components/chat/MessageBubble.tsx`, `src/components/chat/RetrievalJson.tsx`(신규)
- **데이터**: `samples/review.csv` 2개 행 인용 보정
- **의존성**: `papaparse`, `@types/papaparse` (이미 `package.json`에 추가된 상태). `@langchain/core`, `@langchain/anthropic`도 설치되어 있으나 이번 변경에서는 사용하지 않는다.
- **환경변수**: `USE_MOCK`(미설정 시 Mock). `ANTHROPIC_API_KEY`는 이번 변경에서 필요 없다.
- **제약**: 서버 메모리 상태는 프로세스 재시작/서버리스 인스턴스 간 공유되지 않음 — Mock 모드 한정으로 허용
