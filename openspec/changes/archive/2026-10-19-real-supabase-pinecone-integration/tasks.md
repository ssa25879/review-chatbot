# Tasks

## 1. 환경 준비 (사용자 작업 포함)

- [x] 1.1 `supabase/sql/001_reviews_messages.sql`을 design §7 내용으로 작성하고, 사용자에게 Supabase SQL Editor 실행을 요청한 뒤 publishable 키 supabase-js로 `reviews` select(0행 이상)가 오류 없이 되는지 확인
- [x] 1.2 `.env.local`에 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`(사용자 이름 변경 완료)와 `GEMINI_API_KEY`가 있는지 값 출력 없이 존재 여부만 확인

## 2. 공용 모듈

- [x] 2.1 `src/lib/review-csv.ts`로 CSV 파싱(`readReviewCsv`, `verified_purchase` 포함)을 옮기고 `review-store.ts`가 이를 사용하도록 바꾼 뒤, 기존 scratchpad `verify-store.mts`가 이전과 같은 결과(100건, 검색 결과·점수 동일)를 내는지 확인
- [x] 2.2 `src/lib/env.ts`(`ConfigError`, `requireEnv`)를 구현하고 `npx tsc --noEmit` 통과 확인

## 3. 외부 클라이언트

- [x] 3.1 `src/lib/supabase/server.ts`(`createServerSupabase`, 키 fallback `PUBLISHABLE_DEFAULT_KEY ?? ANON_KEY`, 세션 비영속)를 구현하고 `tsc` 통과 확인
- [x] 3.2 `src/lib/pinecone.ts`(`getReviewNamespace`, `pc.index({ name, host }).namespace('reviews')`, 모듈 캐시)를 구현하고 `tsc` 통과 및 `PineconeStore`/Embeddings import가 없는지 `Grep`으로 확인

## 4. 실데이터 저장소와 분기

- [x] 4.1 `src/lib/real-store.ts`의 `indexRealReviews()`(Supabase upsert → Pinecone 96건 배치 순차 `upsertRecords({ records })`)를 구현하고, scratchpad 스크립트로 두 번 실행해 둘 다 100을 반환하며 Supabase `reviews` 행 수가 100인지 확인
- [x] 4.2 `searchRealReviews(query, topK)`(`searchRecords` → hits 매핑, `score` 반올림·내림차순, Supabase에서 `date` 보충, 0건이면 `[]`)를 구현하고 스크립트로 "노캔 성능 어때?" 결과가 5건 이하·필드 완비·내림차순인지 확인
- [x] 4.3 `saveRealMessage(chatId, { role, content, sources? })`를 구현하고, `data-access.ts`의 real 분기를 real-store로 연결(`NotImplementedError` 제거, `saveMessage`에 `sources` 선택 인자 추가)한 뒤 `tsc` 통과 확인

## 5. 답변 생성과 라우트

- [x] 5.1 `npm install @langchain/google-genai`로 의존성을 추가하고, `src/lib/rag-chain.ts`에 `createChatModel()`(`ChatGoogleGenerativeAI`, `gemini-3.5-flash-lite`, `requireEnv('GEMINI_API_KEY')`)과 LCEL 체인 `generateReviewAnswer(query, context)`(시스템 프롬프트, context 템플릿 변수 주입)를 구현한 뒤 `tsc` 통과 및 scratchpad 스크립트로 샘플 context 1회 호출이 문자열 답변을 반환하는지 확인
- [x] 5.2 `/api/chat`에서 mode별 답변 분기(mock: 요약 템플릿, real: 0건 안내 / LLM), assistant 저장 시 `sources` 전달, `ConfigError`·기타 오류 → 500 매핑을 구현하고 `/api/index-data`도 `ConfigError` → 500으로 바꾼 뒤 `npm run lint` 통과 확인

- [x] 5.3 모델을 `gemini-3.5-flash-lite`로 바꾸고, 시스템 프롬프트에 일반 텍스트 지시를 추가하며 체인 끝에 `stripMarkdown`을 연결한 뒤, scratchpad 케이스 테스트(굵게·목록·제목·기울임·코드·수식 보존) 전체 통과와 실데이터 채팅 답변에 마크다운 기호가 없고 응답이 수 초 이내인지 확인

## 6. 통합 검증

- [x] 6.1 Mock 회귀: `npm run build` 후 `USE_MOCK` 기본값으로 서버를 띄워 기존 `verify-api.mjs`가 이전과 동일하게 통과하는지 확인
- [x] 6.2 실데이터: `USE_MOCK=false`로 서버를 띄워 `POST /api/index-data` 두 번 → `{ mode: "real", indexed: 100 }`, 수 초 후 `/api/chat` "통화 품질 괜찮아?" → 200·LLM 답변·sources 1~5건(`date` 포함)·`retrieval`, Supabase `messages`에 user/assistant 2행(assistant `sources` jsonb) 추가를 확인
- [x] 6.3 실데이터 오류: `PINECONE_API_KEY`를 비운 채 인덱싱 시 500 + 변수명 안내(값 미노출), 잘못된 `GEMINI_API_KEY`로 채팅 시 500이며 `messages`에 행이 추가되지 않는지 확인
- [x] 6.4 브라우저(`USE_MOCK=false`): "실데이터 모드" 배지, 인덱싱 버튼 "100건 인덱싱 완료", 질문 시 LLM 답변·참고 리뷰·검색 결과 JSON 표시 확인

## Workflow follow-up

- 단위 작업 완료 후 Conventional Commits 형식의 한국어 커밋 메시지로 커밋한다.
- 검증 완료 후 `/opsx:archive`로 아카이브하고 `review-retrieval`, `review-answer-generation` 메인 스펙 동기화를 확인한다.
- 배포 전 후속 변경: 서버 전용 secret 키로 전환하고 anon 쓰기 정책 제거.
