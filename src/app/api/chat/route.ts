// LLM 답변 생성은 API 키 확보 후 후속 변경에서 추가한다. 지금은 검색 결과 요약 템플릿으로 답변한다.
import { NotImplementedError, getDataMode, saveMessage, searchReviews } from "@/lib/data-access";
import { buildContext, buildSummaryAnswer } from "@/lib/rag-context";
import type { ChatResponse } from "@/lib/types";

const TOP_K = 5;

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
    const answer = buildSummaryAnswer(query, sources);
    const retrieval = { query, chatId: chatId ?? null, context: buildContext(sources) };

    await saveMessage(chatId, { role: "user", content: query });
    await saveMessage(chatId, { role: "assistant", content: answer });

    return Response.json({
      success: true,
      mode,
      answer,
      sources,
      retrieval,
    } satisfies ChatResponse);
  } catch (error) {
    if (error instanceof NotImplementedError) {
      return Response.json(
        { success: false, mode, error: error.message } satisfies ChatResponse,
        { status: 501 },
      );
    }
    console.error("[chat] 응답 생성 실패:", error);
    return Response.json(
      {
        success: false,
        mode,
        error: "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      } satisfies ChatResponse,
      { status: 500 },
    );
  }
}
