// 실데이터 모드 답변 생성: 검색된 리뷰 컨텍스트만 근거로 LLM이 답한다 (LCEL 체인).
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { ConfigError, requireEnv } from "@/lib/env";

// 채팅 버블은 텍스트를 그대로 표시하므로 마크다운 서식을 쓰지 않도록 지시한다.
const SYSTEM_PROMPT = `당신은 전자제품 쇼핑몰의 전문 리뷰 분석가입니다.
아래 제공된 [실제 구매 고객 리뷰 데이터]만을 바탕으로 사용자의 질문에 친절하고 솔직하게 답변하세요.
리뷰에 없는 사실을 추측하여 지어내지 마세요.
장점과 단점이 모두 존재한다면 균형 있게 설명하고, 관련 리뷰 작성자의 의견을 인용하세요.
답변은 마크다운 없이 일반 텍스트로만 작성하세요. **, #, -, *, \` 같은 서식 기호나 목록 기호를 쓰지 말고, 필요하면 빈 줄로 문단을 나누세요.`;

// context는 템플릿 변수로 주입해 리뷰 본문의 { } 가 템플릿 문법으로 해석되지 않게 한다.
const prompt = ChatPromptTemplate.fromMessages([
  ["system", `${SYSTEM_PROMPT}\n\n[실제 구매 고객 리뷰 데이터]\n{context}`],
  ["human", "{query}"],
]);

/**
 * LLM_PROVIDER로 답변 생성 모델을 고른다. 미설정이면 Gemini, `ollama`면 로컬 Ollama.
 * Claude로 전환할 때는 이 함수에 ChatAnthropic({ model: "claude-haiku-4-5", ... }) 분기를 추가한다.
 */
function createChatModel() {
  const provider = process.env.LLM_PROVIDER || "gemini";
  if (provider === "gemini") {
    return new ChatGoogleGenerativeAI({
      // 응답 지연이 짧은 lite 모델을 버전 고정으로 사용한다. (gemini-2.5-flash는 신규 사용자에게 404)
      model: "gemini-3.5-flash-lite",
      apiKey: requireEnv("GEMINI_API_KEY"),
    });
  }
  if (provider === "ollama") {
    // 로컬 테스트 전용. 배포 환경에서는 localhost Ollama에 접근할 수 없다.
    return new ChatOllama({
      model: requireEnv("OLLAMA_MODEL"),
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      // 첫 호출의 모델 로드(수 분)를 반복하지 않도록 마지막 호출 후 30분간 메모리에 유지한다.
      keepAlive: "30m",
    });
  }
  throw new ConfigError("LLM_PROVIDER 값이 올바르지 않습니다. gemini 또는 ollama 중 하나로 설정하세요.");
}

/** 지시를 어기고 섞여 나온 마크다운 서식 기호를 제거한다. 문장 내용은 바꾸지 않는다. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[^\n]*\n?/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g, "$1$2")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateReviewAnswer(query: string, context: string): Promise<string> {
  const chain = prompt
    .pipe(createChatModel())
    .pipe(new StringOutputParser())
    .pipe(stripMarkdown);
  return chain.invoke({ query, context });
}
