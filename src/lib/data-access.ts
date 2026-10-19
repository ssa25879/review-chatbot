// 데이터 접근 계층: 라우트는 이 모듈만 호출하고, USE_MOCK에 따라 Mock 또는 실데이터 구현으로 분기한다.
import { indexRealReviews, saveRealMessage, searchRealReviews } from "./real-store";
import { indexMockReviews, saveMockMessage, searchMockReviews } from "./review-store";
import type { StoredMessage } from "./review-store";
import type { DataMode, SourceReview } from "./types";

export function getDataMode(): DataMode {
  return process.env.USE_MOCK !== "false" ? "mock" : "real";
}

export async function indexReviews(): Promise<number> {
  return getDataMode() === "mock" ? indexMockReviews() : indexRealReviews();
}

export async function searchReviews(query: string, topK = 5): Promise<SourceReview[]> {
  return getDataMode() === "mock"
    ? searchMockReviews(query, topK)
    : searchRealReviews(query, topK);
}

export async function saveMessage(
  chatId: string | undefined,
  message: Omit<StoredMessage, "createdAt">,
): Promise<void> {
  if (getDataMode() === "mock") return saveMockMessage(chatId, message);
  return saveRealMessage(chatId, message);
}
