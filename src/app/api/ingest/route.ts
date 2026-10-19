// 임시 스텁: 후속 변경에서 CSV 파싱 + 인메모리/Pinecone 적재로 교체한다.
import type { ApiResponse, DataMode, IngestResult } from "@/lib/types";

const STUB_DELAY_MS = 1200;

export async function POST() {
  const mode: DataMode = process.env.USE_MOCK !== "false" ? "mock" : "real";

  await new Promise((resolve) => setTimeout(resolve, STUB_DELAY_MS));

  return Response.json({
    success: true,
    data: { count: 100, mode },
  } satisfies ApiResponse<IngestResult>);
}
