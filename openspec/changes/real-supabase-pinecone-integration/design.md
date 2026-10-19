# Design

## Context

- 모드 분기는 `src/lib/data-access.ts` 한 곳에 있다. `indexReviews()`, `searchReviews()`, `saveMessage()`의 real 분기는 현재 `NotImplementedError`(라우트에서 501로 바뀜)를 던진다. 라우트와 UI는 응답 형식만 맞으면 모드를 몰라도 된다.
- CSV 파싱(`readReviews`)은 `src/lib/review-store.ts` 안에 private으로 있다. 답변은 `rag-context.ts`의 `buildContext()`와 `buildSummaryAnswer()`가 만든다. LCEL 체인은 아직 구현하지 않았다. 요청에서 말하는 "기존 LCEL 체인"은 실제로는 없으므로 이번에 새로 만든다.
- Anthropic 키를 쓸 수 없어 사용자가 Gemini 무료 API(`GEMINI_API_KEY`)로 개발하기로 했다. CLAUDE.md는 `gemini-2.5-flash`를 예로 들었지만, 이 모델은 신규 사용자에게 404(no longer available)를 반환했다. 이어서 쓴 `gemini-3.8-flash`는 실데이터 채팅 1회에 약 67초가 걸려, 같은 조건에서 약 1.5초인 `gemini-3.5-flash-lite`(버전 고정, `-latest` 별칭은 대상이 바뀔 수 있어 기각)로 사용자 결정에 따라 변경했다(구현 중 확인).
- 설치된 SDK는 `@pinecone-database/pinecone@9.0.0`이다. 타입 정의 기준으로 `upsertRecords`는 `{ records }` 객체를 받고, 응답은 `searchRecords(...).result.hits[]`이며 각 hit은 `_id`·`_score`·`fields`를 가진다. `pc.index(name, host)` 위치 인자 방식은 deprecated이고 `pc.index({ name, host })` 옵션 방식이 권장된다.
- `@supabase/supabase-js@2`는 이미 설치되어 있다. 이 프로젝트에는 Supabase CLI 프로젝트(`supabase/config.toml`)가 없어 마이그레이션 도구를 쓸 수 없다. 그래서 SQL 파일을 두고 사용자가 SQL Editor에서 실행한다.
- `.env.local`에는 Pinecone 3종과 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 있다. 마지막 키는 CLAUDE.md 규칙의 이름(`..._PUBLISHABLE_DEFAULT_KEY`)과 달라서, 사용자가 이름을 바꾸기로 했다.

## Goals / Non-Goals

**Goals:**
- `data-access.ts`의 real 분기만 채워서 실데이터 모드를 동작시킨다. 라우트에서 바뀌는 곳은 답변 생성 분기(Mock 템플릿 / Real LLM) 하나로 한정한다.
- Mock 모드의 동작, 응답, 테스트 결과는 지금과 같게 유지한다.

**Non-Goals:**
- Mock 모드에 LLM 답변을 적용하는 것. Mock은 API 키 없이 동작하는 것이 목표다.
- 대화 기록 조회 API와 멀티턴 문맥(이전 메시지를 프롬프트에 넣기).
- 사용자 인증과 사용자별 RLS. 인증이 없으므로 이번에는 anon 역할 기준으로 정책을 만든다.
- 스트리밍 응답, Vercel 배포 설정.
- Claude(`claude-haiku-4-5`)로의 전환 — 키 확보 후 `rag-chain.ts`의 모델 생성부만 교체.

## Decisions

### 1. 모듈 구조
```
src/lib/env.ts             requireEnv(name), ConfigError — 실데이터 필수 환경변수 검사
src/lib/review-csv.ts      readReviewCsv(): Review[] — review-store의 CSV 파싱을 이동해 Mock/Real 공용으로
src/lib/pinecone.ts        getReviewNamespace() — Pinecone 클라이언트와 'reviews' 네임스페이스(지연 생성·재사용)
src/lib/supabase/server.ts createServerSupabase() — 서버 전용 supabase-js 클라이언트
src/lib/real-store.ts      indexRealReviews(), searchRealReviews(), saveRealMessage()
src/lib/rag-chain.ts       generateReviewAnswer(query, context) — LCEL 체인
src/lib/data-access.ts     real 분기 → real-store 위임 (NotImplementedError 제거)
src/app/api/chat/route.ts  mode에 따라 buildSummaryAnswer 또는 generateReviewAnswer 호출
```
- 대안으로 data-access 안에 real 구현을 직접 넣는 방법이 있었다. 하지만 Mock 구현이 `review-store.ts`에 따로 있는 기존 구조와 대칭이 깨지므로 별도 파일로 분리했다.
- `NotImplementedError`와 501 매핑을 제거하고, 같은 자리(라우트의 catch 분기)에서 `ConfigError`를 500 + 설정 안내 메시지로 매핑한다.

### 2. 환경변수와 클라이언트
- `requireEnv(name)`은 값이 비어 있으면 `ConfigError("환경변수 ${name}가 설정되지 않았습니다.")`를 던진다. 메시지에는 변수 이름만 넣고 값은 넣지 않는다.
- Supabase 키는 `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` 순서로 읽는다. 둘 다 없으면 두 이름을 모두 담은 `ConfigError`를 던진다.
- Supabase 클라이언트는 `createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })`로 만든다. 쿠키 기반 인증이 없으므로 `@supabase/ssr`이 아니라 supabase-js를 직접 쓴다.
- Pinecone 클라이언트는 `new Pinecone({ apiKey })` 다음 `pc.index({ name: PINECONE_INDEX_NAME, host: PINECONE_HOST }).namespace('reviews')`로 만든다. 요청 코드의 위치 인자 `pc.index(name, host)`는 deprecated라서 같은 의미의 옵션 방식으로 바꿨다. 모듈 스코프에 캐싱해 요청마다 다시 만들지 않는다.

### 3. 인덱싱 (`indexRealReviews`)
1. `readReviewCsv()`로 100건을 읽는다(파싱 오류가 있으면 throw).
2. Supabase에 `from('reviews').upsert(rows, { onConflict: 'id' })`로 한 번에 넣는다. 100행이라 분할하지 않는다. 오류가 나면 throw한다.
3. Pinecone 레코드 `{ _id: r.id, text: `${r.title} ${r.content}`, rating: r.rating, author, title, content }`를 96건 단위로 잘라 `for` 루프로 순차 `await ns.upsertRecords({ records: batch })`를 실행한다(100건 → 96건 + 4건). 통합 임베딩 upsert는 요청당 96건이 상한이다.
4. 적재 건수(rows.length)를 반환한다.
- 순서를 Supabase 다음 Pinecone으로 정한 이유: 검색 결과의 `date`를 Supabase에서 보충하므로, Pinecone에 레코드가 있는데 Supabase 행이 없는 상태를 피하기 위해서다.
- 같은 `_id`/`id`로 upsert하므로 반복 호출해도 중복이 생기지 않는다.

### 4. 검색 (`searchRealReviews`)
```ts
const res = await ns.searchRecords({
  query: { topK, inputs: { text: query } },
  fields: ['title', 'content', 'rating', 'author'],
});
const hits = res.result.hits;
```
- hit의 `_id`·`_score`·`fields`를 `SourceReview`로 바꾼다. `fields`는 `unknown`이므로 `String()`/`Number()`로 변환하고, `score`는 `Math.round(_score * 100) / 100`으로 반올림한다.
- `date`는 Pinecone 레코드에 없다. 그래서 `from('reviews').select('id, date').in('id', ids)`를 한 번 조회해 채우고, 행이 없으면 `""`로 둔다. 대안은 Pinecone 레코드에 `date`를 추가하는 것인데, 요청에서 레코드 형식이 고정되어 있어 기각했다.
- hits가 0건이면 Supabase를 조회하지 않고 `[]`를 반환한다.
- Pinecone이 이미 점수 순으로 반환하지만, 스펙의 정렬 보장을 위해 `score` 내림차순으로 한 번 더 정렬한다.

### 5. 답변 생성 (`rag-chain.ts`)
```ts
const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT + "\n\n[실제 구매 고객 리뷰 데이터]\n{context}"],
  ["human", "{query}"],
]);
const chain = prompt
  .pipe(new ChatGoogleGenerativeAI({ model: "gemini-3.5-flash-lite", apiKey: requireEnv("GEMINI_API_KEY") }))
  .pipe(new StringOutputParser());
return chain.invoke({ context, query });
```
- `@langchain/google-genai`의 `ChatGoogleGenerativeAI`를 사용한다. 기본 환경변수(`GOOGLE_API_KEY`)가 아니라 `.env.local`에 있는 `GEMINI_API_KEY`를 `apiKey`로 명시 전달한다. 대안: Google GenAI SDK 직접 호출 → LCEL 체인 구성 요구와 맞지 않아 기각.
- 채팅 버블은 텍스트를 그대로 표시하므로 답변은 일반 텍스트여야 한다. 시스템 프롬프트에 "마크다운·목록 기호 금지, 빈 줄로 문단 구분"을 지시하고, 체인 끝에 `stripMarkdown`(굵게·기울임·제목·목록·코드 표기 제거, 문장 내용 유지)을 `.pipe()`로 연결해 지시를 어긴 출력도 정리한다. 대안: UI에 마크다운 렌더러 추가 → 사용자 요청(마크다운으로 표기하지 않음)과 다르고 Mock 템플릿과 표시 방식이 갈라져 기각.
- 모델 생성을 `createChatModel()` 한 함수로 모아, Claude 전환 시 `new ChatAnthropic({ model: "claude-haiku-4-5", ... })`로 이 함수만 바꾸게 한다.
- SYSTEM_PROMPT는 mock-rag-pipeline 요청에 있던 문구(전자제품 쇼핑몰 리뷰 분석가, 제공된 리뷰만 근거로 답함, 지어내지 않음, 장단점 균형, 작성자 인용)를 그대로 쓴다.
- `context`는 템플릿 변수로 넣는다. 리뷰 본문에 `{`나 `}`가 있어도 템플릿 문법으로 해석되지 않게 하기 위해서다.
- chat 라우트에서 mode가 `real`이면 다음 순서로 처리한다.
  1. sources가 0건이면 LLM을 부르지 않고 고정 안내 문장을 반환한다.
  2. 1건 이상이면 `generateReviewAnswer(query, retrieval.context)`를 호출한다.
  3. 성공한 뒤에만 메시지를 저장한다.
- mode가 `mock`이면 기존 `buildSummaryAnswer`를 그대로 쓴다.
- LLM 예외는 `console.error`에만 기록하고, 응답에는 "AI 답변을 생성하지 못했습니다." 같은 일반 문구만 넣는다.

### 6. 대화 기록 (`saveRealMessage`)
- `saveMessage(chatId, { role, content, sources? })`처럼 `sources`를 선택 인자로 추가한다. Mock 구현은 이 인자를 무시한다.
- Supabase에는 `from('messages').insert({ chat_id: chatId ?? 'default', role, content, sources: sources ?? null })`로 넣는다.
- user 행과 assistant 행을 순서대로 저장한다. 원자성은 보장하지 않으며, 실습 범위에서는 이를 허용한다.

### 7. DB 스키마 (`supabase/sql/001_reviews_messages.sql`)
```sql
create table if not exists public.reviews (
  id text primary key,                      -- CSV id(r001…)를 그대로 사용 (Pinecone _id와 동일)
  rating smallint not null check (rating between 1 and 5),
  title text not null,
  content text not null,
  author text not null,
  date date not null,
  helpful_votes integer not null default 0 check (helpful_votes >= 0),
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  chat_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_chat_id_created_at_idx on public.messages (chat_id, created_at);

alter table public.reviews enable row level security;
alter table public.messages enable row level security;

-- 서버가 publishable(anon) 키로 접근하므로 anon에 필요한 최소 권한만 부여
grant select, insert, update on public.reviews to anon;
grant insert on public.messages to anon;

create policy "anon can read reviews"   on public.reviews  for select to anon using (true);
create policy "anon can insert reviews" on public.reviews  for insert to anon with check (true);
create policy "anon can update reviews" on public.reviews  for update to anon using (true) with check (true);
create policy "anon can insert messages" on public.messages for insert to anon with check (true);
```
- upsert는 INSERT, UPDATE, 그리고 충돌한 행을 읽기 위한 SELECT가 모두 필요하다. 그래서 `reviews`에는 세 가지 정책을 모두 둔다.
- 적용 대상 프로젝트에는 테이블이 이미 있었고(`messages.id`는 uuid), `Allow all access to messages`(ALL, public) 정책이 있어 공개 키로 대화 조회·수정·삭제가 가능했다. SQL 파일에서 이 정책과 같은 이름 규칙의 `reviews` 정책을 제거한다. 코드는 `id` 타입에 의존하지 않으므로 기존 테이블을 그대로 사용한다.
- `messages`는 insert만 허용한다. 대화 내용을 공개 키로 조회할 수 없게 하기 위해서다. supabase-js의 기본값 `returning: minimal`에서는 insert에 SELECT 권한이 필요 없다.
- `CREATE TABLE`만으로 Data API에 자동 노출되지 않는 프로젝트 설정일 수 있다. 그래서 `GRANT`를 명시한다(Supabase 문서 권고).
- `id`는 외부(CSV)에서 정한 자연키여서 text PK로 둔다. `messages`는 identity bigint를 쓴다.

## Risks / Trade-offs

- [공개 키로 쓰기가 허용되어 키를 아는 누구나 `reviews`를 수정하거나 `messages`를 추가할 수 있음] → 실습 범위에서 허용한다. 배포 전에는 서버 전용 secret 키(`SUPABASE_SECRET_KEY`)로 바꾸고 anon 쓰기 정책을 제거하는 후속 변경을 권장한다. `NEXT_PUBLIC_` 변수는 브라우저에 노출되므로 secret 키에 이 접두사를 붙이면 안 된다.
- [Pinecone은 upsert 직후 바로 검색되지 않을 수 있음(최종 일관성)] → 인덱싱 직후 첫 질문은 결과가 비어 있을 수 있다. "검색 결과 없음" 안내 문구로 대응하고, 검증할 때는 몇 초 기다린 뒤 검색한다.
- [Supabase는 성공하고 Pinecone이 실패하는 부분 적재] → 두 쪽 모두 upsert라 재실행하면 일관된 상태로 수렴한다. 오류 응답 후 사용자가 다시 시도하면 된다.
- [실데이터 `score`는 코사인 유사도 원값이라 Mock의 0.65~0.98 범위와 다름] → UI는 점수를 배지로만 표시하므로 문제없다. 스펙에서 범위 보장은 Mock에만 적용했다.
- [Gemini 무료 티어의 분당 호출 한도(429), 무료 티어 입력은 Google 개선에 쓰일 수 있음] → 컨텍스트를 최대 5건으로 제한하고 검색 결과가 0건이면 호출하지 않으며, 한도 초과는 500 + 일반 안내로 처리한다. 샘플 리뷰 외 민감 데이터는 넣지 않는다.
- [`.env.local`의 Supabase 키 이름 불일치] → 그대로 두면 `ConfigError` 안내 문구에 기대하는 변수 이름이 표시된다. tasks 1단계에 이름 변경을 포함했다.

## Migration Plan

1. `.env.local`에서 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`의 이름을 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`로 바꾼다.
2. Supabase SQL Editor에서 `supabase/sql/001_reviews_messages.sql`을 실행한다.
3. 코드를 배포하고 `USE_MOCK=false`로 실행한다.
4. `POST /api/index-data`로 적재한 뒤 채팅을 확인한다.
- 롤백: `USE_MOCK`을 다시 켜면(설정하지 않거나 `true`) 즉시 Mock 모드로 돌아간다. DB 테이블은 남아 있어도 Mock 모드에 영향이 없다.
