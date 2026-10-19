# 쇼핑 리뷰 AI 분석기

Next.js 16(App Router) 기반의 쇼핑 리뷰 RAG 챗봇입니다. 상품 리뷰를 검색해 질문에 답하고, 답변 근거가 된 리뷰를 함께 보여줍니다.

- **Mock 모드**(기본): `samples/review.csv`를 서버 메모리에 올려 키워드로 검색하고, 검색 결과를 요약한 템플릿 답변을 돌려줍니다. 외부 API·DB를 전혀 사용하지 않습니다.
- **실데이터 모드**(`USE_MOCK=false`): Pinecone 통합 임베딩 인덱스로 의미 검색, Gemini로 답변 생성, Supabase에 리뷰와 대화 기록을 저장합니다.

> 이 저장소에는 API 키나 DB 접속 정보가 포함되어 있지 않습니다. 실데이터 모드는 **본인 계정의 키**를 `.env.local`에 넣어야 동작합니다.

## 빠른 시작 (Mock 모드)

```bash
npm install
cp .env.example .env.local   # USE_MOCK=true 그대로 두면 됩니다
npm run dev
```

http://localhost:3000 에서 [샘플 데이터 인덱싱]을 누른 뒤 질문해 보세요.

## 실데이터 모드

1. 본인 계정으로 다음을 준비합니다.
   - **Pinecone**: 통합 임베딩 인덱스 생성 (모델 `llama-text-embed-v2`, 1024 dim, cosine, 필드 맵 `text`)
   - **Supabase**: 프로젝트 생성 후 SQL Editor에서 [`supabase/sql/001_reviews_messages.sql`](supabase/sql/001_reviews_messages.sql) 실행
   - **Gemini**: [Google AI Studio](https://aistudio.google.com/)에서 API 키 발급
2. `.env.local`에 값을 채우고 `USE_MOCK=false`로 바꿉니다. 필요한 변수는 [`.env.example`](.env.example)에 있습니다.
3. `npm run dev` 후 [샘플 데이터 인덱싱]으로 Supabase·Pinecone에 리뷰 100건을 적재합니다.

필요한 환경변수가 비어 있으면 API가 어떤 변수가 빠졌는지 알려주는 오류를 반환합니다.

### 보안 참고

서버는 Supabase **공개(publishable) 키**로 접근하며, SQL 파일의 RLS 정책은 `reviews` 조회·추가·수정과 `messages` 추가만 허용합니다. 공개 키는 브라우저에 노출될 수 있으므로 외부에 배포한다면 서버 전용 secret 키로 바꾸고 공개 키의 쓰기 정책을 제거하세요.

## 구조

| 경로 | 역할 |
|---|---|
| `src/app/api/index-data/route.ts` | 샘플 리뷰 인덱싱 API |
| `src/app/api/chat/route.ts` | 질문 → 검색 → 답변 API |
| `src/lib/data-access.ts` | `USE_MOCK`에 따른 Mock/실데이터 분기 |
| `src/lib/review-store.ts` | Mock 저장소 (CSV 캐시, 키워드 검색, 대화 기록) |
| `src/lib/real-store.ts` | 실데이터 저장소 (Supabase, Pinecone) |
| `src/lib/rag-chain.ts` | LangChain LCEL 답변 생성 체인 |
| `openspec/` | OpenSpec 기반 기능 명세와 변경 이력 |

## 명령어

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run lint    # ESLint
```
