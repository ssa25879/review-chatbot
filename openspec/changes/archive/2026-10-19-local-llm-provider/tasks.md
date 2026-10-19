# Tasks

## 1. 공급자 선택 구현

- [x] 1.1 `npm install @langchain/ollama`로 의존성을 추가하고 `package.json`에 버전이 고정 범위로 기록됐는지 확인
- [x] 1.2 `src/lib/rag-chain.ts`의 `createChatModel()`에 `LLM_PROVIDER` 분기(gemini 기본 / ollama `ChatOllama` + `OLLAMA_MODEL` 필수 + `OLLAMA_BASE_URL` 기본값 + `keepAlive: "30m"` / 그 외 `ConfigError`)를 구현하고 `npx tsc --noEmit`·`npm run lint` 통과 확인
- [x] 1.3 `.env.example`에 `LLM_PROVIDER`·`OLLAMA_MODEL`·`OLLAMA_BASE_URL`(로컬 전용 주석 포함)을, README 실데이터 모드 절에 로컬 LLM 사용법과 첫 호출 지연 안내를 추가하고 `.env.local` 값이 포함되지 않았는지 확인

## 2. 검증

- [x] 2.1 scratchpad 스크립트로 `LLM_PROVIDER=ollama`, `OLLAMA_MODEL=gemma4:e2b`, `GEMINI_API_KEY` 미설정 상태에서 `generateReviewAnswer`가 마크다운 없는 문자열을 반환하는지, `LLM_PROVIDER=openai`와 `OLLAMA_MODEL` 누락이 허용 값/변수명을 담은 `ConfigError`를 던지는지 확인
- [x] 2.2 `npm run build` 후 `USE_MOCK=false`, `LLM_PROVIDER=ollama`, `OLLAMA_MODEL=gemma4:e2b`로 서버를 띄워 `/api/chat` "통화 품질 괜찮아?"가 200·일반 텍스트 답변·sources 1~5건인지, 두 번째 호출이 수 초 안에 끝나는지 확인
- [x] 2.3 `OLLAMA_BASE_URL=http://localhost:1`(연결 불가)로 서버를 띄워 `/api/chat`이 500 + "AI 답변을 생성하지 못했습니다"이고 `messages`에 해당 chat_id 행이 추가되지 않는지 확인
- [x] 2.4 `LLM_PROVIDER` 미설정 회귀: 실데이터 모드 `/api/chat`이 Gemini로 200 응답하는지, Mock 모드 `verify-api.mjs`가 이전과 같은지 확인

## Workflow follow-up

- `feat/local-llm-provider` 브랜치에서 Conventional Commits 형식의 한국어 메시지로 커밋하고 push한다.
- 검증 후 `main`에 병합하고 `/opsx:archive`로 아카이브해 `review-answer-generation` 메인 스펙을 동기화한다.
