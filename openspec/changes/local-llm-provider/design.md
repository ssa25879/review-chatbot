# Design

## Context

- `src/lib/rag-chain.ts`의 `createChatModel()`이 `ChatGoogleGenerativeAI({ model: "gemini-3.5-flash-lite", apiKey: requireEnv("GEMINI_API_KEY") })`를 반환하고, LCEL 체인(`prompt → model → StringOutputParser → stripMarkdown`)은 모델 객체만 받는다. 공급자 교체 지점은 이 함수 하나다.
- chat 라우트는 `ConfigError`를 500 + 원문 메시지로, 그 외 LLM 예외를 `AnswerGenerationError` → 500 + "AI 답변을 생성하지 못했습니다"로 매핑한다. 이 동작을 그대로 재사용한다.
- 로컬에 Ollama가 설치되어 서버(`localhost:11434`)가 실행 중이며 `gemma4:e2b`(5.1B)가 있다. 프로젝트 프롬프트로 직접 호출한 결과: 첫 호출(모델 로드) 약 128초, 이후 약 4초, 마크다운 없는 한국어 답변. 다만 작성자 이름 인용은 하지 않았다.

## Goals / Non-Goals

**Goals:**
- 환경변수만으로 Gemini ↔ 로컬 Ollama를 전환하고, 기본값(미설정)은 현재 동작과 완전히 같게 유지한다.

**Non-Goals:**
- Mock 모드에 LLM 답변 적용 (사용자가 "실데이터 모드의 LLM만 교체"를 선택).
- 임베딩·검색의 로컬화 (Pinecone 통합 임베딩 유지, CLAUDE.md 제약).
- 모델별 프롬프트 튜닝, 스트리밍, 모델 사전 로드(warm-up) 엔드포인트.

## Decisions

### 1. 공급자 분기
```ts
function createChatModel() {
  const provider = process.env.LLM_PROVIDER || "gemini";
  if (provider === "gemini") return new ChatGoogleGenerativeAI({ model: "gemini-3.5-flash-lite", apiKey: requireEnv("GEMINI_API_KEY") });
  if (provider === "ollama") return new ChatOllama({
    model: requireEnv("OLLAMA_MODEL"),
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    keepAlive: "30m",
  });
  throw new ConfigError(`LLM_PROVIDER 값이 올바르지 않습니다: gemini 또는 ollama 중 하나로 설정하세요.`);
}
```
- `@langchain/ollama`의 `ChatOllama`를 쓴다. LCEL 체인과 `StringOutputParser`를 그대로 쓸 수 있다. 대안: Ollama의 OpenAI 호환 엔드포인트 + `@langchain/openai` → OpenAI 패키지 추가가 필요하고 CLAUDE.md의 "OpenAI 계열 라이브러리 추가 금지" 취지와 충돌할 여지가 있어 기각.
- `OLLAMA_MODEL`은 필수로 둔다. 기본 모델을 코드에 숨겨 두면 설치되지 않은 모델로 조용히 실패하기 때문이다. `.env.example`에는 `gemma4:e2b`를 예시로 적는다.
- 잘못된 `LLM_PROVIDER` 값의 오류 메시지에는 허용 값만 넣고 입력값은 넣지 않는다(환경변수 값 비노출 원칙과 일관).
- `ConfigError`는 `createChatModel()` 안에서 던져지므로, 라우트의 `createAnswer`가 이미 `ConfigError`를 그대로 다시 던지는 경로로 500 + 안내 문구가 된다. 코드 변경 없이 스펙의 설정 오류 시나리오를 만족한다.

### 2. 콜드 스타트
- `keepAlive: "30m"`으로 마지막 호출 뒤 30분간 모델을 메모리에 유지해 반복 테스트에서 128초 로드를 피한다. 첫 질문은 여전히 오래 걸린다.
- Next.js 라우트(로컬 `next dev`/`next start`)에는 기본 요청 타임아웃이 없어 첫 호출이 끝까지 기다린다. 브라우저 fetch에도 타임아웃을 두지 않았으므로 UI는 로딩 표시를 유지한다.

## Risks / Trade-offs

- [첫 질문 2분 내외 대기] → `keepAlive`로 이후 호출은 수 초. README에 "첫 호출은 모델 로드로 오래 걸림"을 안내하고, 필요하면 `ollama run gemma4:e2b`로 미리 띄우도록 적는다.
- [작은 모델의 지시 이행 약화(작성자 인용 누락 등)] → 로컬 테스트용 옵션으로 한정하고, 스펙의 "인용 요구"는 시스템 지시에 대한 요구사항이라 공급자와 무관하게 충족된다. 품질 비교는 수동 확인 항목으로 둔다.
- [배포 환경에서 `LLM_PROVIDER=ollama` 설정 시 모든 답변 실패] → `.env.example`·README에 로컬 전용임을 명시. 실패해도 기존 500 경로로 처리되어 데이터 손상은 없다.

## Migration Plan

- 추가 설정이 없으면 기존과 동일하므로 별도 이전 절차가 없다. 로컬 테스트 시 `.env.local`에 `LLM_PROVIDER=ollama`, `OLLAMA_MODEL=gemma4:e2b`를 넣고 dev 서버를 재시작한다. 되돌리려면 `LLM_PROVIDER`를 지운다.
