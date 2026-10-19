import { NotImplementedError, getDataMode, indexReviews } from "@/lib/data-access";
import type { ApiResponse, IndexResult } from "@/lib/types";

export async function POST() {
  const mode = getDataMode();
  try {
    const indexed = await indexReviews();
    return Response.json({
      success: true,
      mode,
      data: { indexed },
    } satisfies ApiResponse<IndexResult>);
  } catch (error) {
    if (error instanceof NotImplementedError) {
      return Response.json(
        { success: false, mode, error: error.message } satisfies ApiResponse,
        { status: 501 },
      );
    }
    console.error("[index-data] 인덱싱 실패:", error);
    return Response.json(
      {
        success: false,
        mode,
        error: "샘플 데이터를 인덱싱하지 못했습니다.",
      } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
