# Proposal

## Why

실데이터 모드의 답변 생성은 Gemini 무료 API에 고정되어 있어, 개발 중 반복 테스트가 호출 한도와 네트워크에 묶이고 질문 내용이 외부로 전송된다. 로컬에 설치된 Ollama `gemma4:e2b`로 답변 생성을 바꿔 쓸 수 있으면, 검색·저장 흐름은 그대로 둔 채 LLM 호출 비용과 한도 없이 테스트할 수 있다.

## What Changes

- 환경변수 `LLM_PROVIDER`로 실데이터 모드의 답변 생성 LLM을 선택한다.
  - 미설정 또는 `gemini`: 기존과 동일하게 `gemini-3.5-flash-lite` 사용 (기본값, 동작 변화 없음)
  - `ollama`: 로컬 Ollama 서버(`OLLAMA_BASE_URL`, 기본 `http://localhost:11434`)의 `OLLAMA_MODEL`(예: `gemma4:e2b`) 사용
  - 그 외 값: 설정 오류(500 + 허용 값 안내)
- `LLM_PROVIDER=ollama`일 때는 `GEMINI_API_KEY`가 필요 없다.
- Ollama 서버에 연결할 수 없거나 모델이 없으면 기존 LLM 실패와 같은 500 오류로 처리하고 대화 기록을 저장하지 않는다.
- 프롬프트, 일반 텍스트 정리(`stripMarkdown`), 응답 형식은 공급자와 무관하게 동일하다.
- Mock 모드(템플릿 답변)와 검색(Pinecone)·저장(Supabase)은 변경하지 않는다.

## Capabilities

### New Capabilities
- (없음)

### Modified Capabilities
- `review-answer-generation`: 실데이터 LLM 답변의 모델이 고정값에서 환경변수 선택으로 바뀌고, 공급자 선택 요구사항과 로컬 LLM 연결 실패 시나리오가 추가된다.

## Impact

- **코드**: `src/lib/rag-chain.ts`(`createChatModel()`에 공급자 분기)
- **의존성**: `@langchain/ollama`(신규, `@langchain/core ^1.0.0` peer 호환)
- **환경변수**: `LLM_PROVIDER`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`(모두 선택). `.env.example`과 README에 추가
- **운영**: 로컬 전용 옵션이다. Vercel 등 배포 환경에서는 `localhost` Ollama에 접근할 수 없으므로 `LLM_PROVIDER`를 설정하지 않는다.
