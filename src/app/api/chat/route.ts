// Mock 모드는 검색 결과 요약 템플릿으로, 실데이터 모드는 리뷰 근거 LLM(LCEL 체인)으로 답변한다.
import { getDataMode, saveMessage, searchReviews } from "@/lib/data-access";
import { ConfigError } from "@/lib/env";
import { generateReviewAnswer } from "@/lib/rag-chain";
import { buildContext, buildSummaryAnswer } from "@/lib/rag-context";
import type { ChatResponse, DataMode, SourceReview } from "@/lib/types";

const TOP_K = 5;
const NO_SOURCES_ANSWER =
  "질문과 관련된 리뷰를 찾지 못했습니다. 아직 리뷰가 적재되지 않았다면 [샘플 데이터 인덱싱]을 먼저 실행해 주세요.";

/** LLM 호출 실패를 검색·저장 오류와 구분해 다른 안내 문구를 보여주기 위한 표식 */
class AnswerGenerationError extends Error {}

async function createAnswer(
  mode: DataMode,
  query: string,
  sources: SourceReview[],
  context: string,
): Promise<string> {
  if (mode === "mock") return buildSummaryAnswer(query, sources);
  if (sources.length === 0) return NO_SOURCES_ANSWER;
  try {
    return await generateReviewAnswer(query, context);
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    throw new AnswerGenerationError("LLM 호출 실패", { cause: error });
  }
}

export async function POST(request: Request) {
  const mode = getDataMode();

  let query = "";
  let chatId: string | undefined;
  try {
    const body = (await request.json()) as { query?: unknown; chatId?: unknown };
    if (typeof body.query === "string") query = body.query.trim();
    if (typeof body.chatId === "string" && body.chatId) chatId = body.chatId;
  } catch {
    // 잘못된 JSON 본문은 빈 질문으로 처리
  }

  if (!query) {
    return Response.json(
      { success: false, mode, error: "질문을 입력해 주세요." } satisfies ChatResponse,
      { status: 400 },
    );
  }

  try {
    const sources = await searchReviews(query, TOP_K);
    const retrieval = { query, chatId: chatId ?? null, context: buildContext(sources) };
    const answer = await createAnswer(mode, query, sources, retrieval.context);

    await saveMessage(chatId, { role: "user", content: query });
    await saveMessage(chatId, { role: "assistant", content: answer, sources });

    return Response.json({
      success: true,
      mode,
      answer,
      sources,
      retrieval,
    } satisfies ChatResponse);
  } catch (error) {
    if (error instanceof ConfigError) {
      return Response.json(
        { success: false, mode, error: error.message } satisfies ChatResponse,
        { status: 500 },
      );
    }
    console.error("[chat] 응답 생성 실패:", error);
    return Response.json(
      {
        success: false,
        mode,
        error:
          error instanceof AnswerGenerationError
            ? "AI 답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      } satisfies ChatResponse,
      { status: 500 },
    );
  }
}
