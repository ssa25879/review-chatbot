// 데이터 접근 계층: 라우트는 이 모듈만 호출하고, USE_MOCK에 따라 Mock 또는 실데이터 구현으로 분기한다.
import { indexMockReviews, saveMockMessage, searchMockReviews } from "./review-store";
import type { StoredMessage } from "./review-store";
import type { DataMode, SourceReview } from "./types";

/** 실데이터 모드(Pinecone/Supabase)가 아직 구현되지 않았음을 나타낸다. 라우트에서 HTTP 501로 매핑한다. */
export class NotImplementedError extends Error {
  constructor(message = "실데이터 모드는 아직 지원되지 않습니다. USE_MOCK을 해제해 Mock 모드로 실행해 주세요.") {
    super(message);
    this.name = "NotImplementedError";
  }
}

export function getDataMode(): DataMode {
  return process.env.USE_MOCK !== "false" ? "mock" : "real";
}

export async function indexReviews(): Promise<number> {
  if (getDataMode() === "mock") return indexMockReviews();
  throw new NotImplementedError();
}

export async function searchReviews(query: string, topK = 5): Promise<SourceReview[]> {
  if (getDataMode() === "mock") return searchMockReviews(query, topK);
  throw new NotImplementedError();
}

export async function saveMessage(
  chatId: string | undefined,
  message: Omit<StoredMessage, "createdAt">,
): Promise<void> {
  if (getDataMode() === "mock") return saveMockMessage(chatId, message);
  throw new NotImplementedError();
}
