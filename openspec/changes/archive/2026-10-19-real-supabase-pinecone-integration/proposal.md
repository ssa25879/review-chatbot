# Proposal

## Why

Mock 모드로 UI와 RAG 파이프라인 형태는 완성됐지만, `USE_MOCK=false`에서는 인덱싱·채팅 API가 501을 반환해 실제 데이터 영속화와 의미 기반 검색을 쓸 수 없다. 프로젝트 4단계로 Pinecone 통합 임베딩 인덱스와 Supabase PostgreSQL을 연결해 실데이터 모드를 동작시키고, 이후 Vercel 배포의 기반을 마련한다.

## What Changes

- **실데이터 인덱싱**: `USE_MOCK=false`에서 `POST /api/index-data`가 `samples/review.csv`를 Supabase `reviews` 테이블에 `id` 기준 upsert하고, Pinecone `review-chatbot` 인덱스의 `reviews` 네임스페이스에 `{ _id, text, rating, author, title, content }` 레코드를 96건 이하 배치로 순차 `upsertRecords` 한다. 응답은 `{ success: true, mode: "real", data: { indexed: 100 } }`.
- **실데이터 검색**: `USE_MOCK=false`에서 `/api/chat`이 Pinecone `searchRecords`(통합 임베딩 텍스트 검색)로 상위 5건을 조회하고, hit의 `_id`/`_score`/`fields`를 `sources`로 변환한다.
- **실데이터 답변 생성**: 검색된 리뷰를 LangChain LCEL 체인(`ChatPromptTemplate → ChatGoogleGenerativeAI(gemini-3.5-flash-lite) → StringOutputParser`)에 넣어 답변을 생성한다. 현재 사용 가능한 Gemini 무료 API로 개발하며, 모델 객체만 교체하면 Claude(`claude-haiku-4-5`)로 전환할 수 있게 한다. Mock 모드의 요약 템플릿 답변은 그대로 유지한다.
- **대화 기록 영속화**: 실데이터 모드에서 사용자 질문과 AI 답변(답변에는 `sources` jsonb 포함)을 Supabase `messages` 테이블에 저장한다.
- **DB 스키마**: `reviews`·`messages` 테이블 생성, RLS 활성화, 공개 키(anon) 역할에 필요한 최소 권한 정책을 담은 SQL 파일을 추가한다. 사용자가 Supabase SQL Editor에서 실행한다.
- 실데이터 모드의 501 "미지원" 응답을 제거한다. **BREAKING**(실데이터 모드 한정): 필수 환경변수가 없으면 501 대신 500 + 설정 안내 오류를 반환한다.
- Mock 모드(`USE_MOCK !== 'false'`) 동작과 API 응답 형식은 변경하지 않는다.

## Capabilities

### New Capabilities
- (없음)

### Modified Capabilities
- `review-retrieval`: 데이터 모드 결정(501 제거), 인덱싱 API의 실데이터 적재, 관련도 점수 범위(Mock 한정), 대화 기록 저장(Supabase)이 바뀌고, 실데이터 의미 검색 요구사항이 추가된다.
- `review-answer-generation`: 요약 답변이 Mock 모드 한정이 되고, 실데이터 모드의 LLM 근거 답변과 LLM 실패 처리 요구사항이 추가된다.

## Impact

- **코드**: `src/lib/data-access.ts`(real 분기 구현), `src/lib/real-store.ts`(신규), `src/lib/env.ts`(신규), `src/lib/pinecone.ts`(신규), `src/lib/supabase/server.ts`(신규), `src/lib/review-csv.ts`(신규, CSV 파싱 공용화), `src/lib/review-store.ts`(CSV 파싱 공용 모듈 사용), `src/lib/rag-chain.ts`(신규, LCEL), `src/app/api/chat/route.ts`(모드별 답변 생성 분기)
- **DB**: `supabase/sql/001_reviews_messages.sql`(신규) — Supabase 프로젝트에 수동 적용 필요
- **의존성**: `@pinecone-database/pinecone`, `@supabase/supabase-js`, `@langchain/core`(이미 설치됨), `@langchain/google-genai`(신규 설치, `@langchain/core ^1.2.11` peer 호환). `@langchain/anthropic`은 설치된 채 미사용.
- **환경변수**(실데이터 모드 필수): `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `PINECONE_HOST`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`(또는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `GEMINI_API_KEY`.
- **보안**: 서버가 공개 키로 쓰기를 수행하므로, 같은 키를 가진 누구나 `reviews`/`messages`에 쓸 수 있다(실습 범위에서 허용, design.md 참고).
- **제약 준수**: `PineconeStore`·외부 Embeddings 미사용(임베딩은 Pinecone 통합 추론만 사용, Gemini는 답변 생성 전용).
