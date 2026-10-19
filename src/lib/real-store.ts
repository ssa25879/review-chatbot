// 실데이터 모드 저장소: Supabase(reviews, messages) + Pinecone 통합 임베딩 인덱스.
import { getReviewNamespace } from "./pinecone";
import { readReviewCsv } from "./review-csv";
import { createServerSupabase } from "./supabase/server";
import type { StoredMessage } from "./review-store";
import type { SourceReview } from "./types";

// 통합 임베딩 upsertRecords는 요청당 최대 96건이다.
const UPSERT_BATCH_SIZE = 96;
const DEFAULT_CHAT_ID = "default";

/** CSV를 Supabase reviews에 upsert한 뒤 Pinecone에 배치로 적재하고 적재 건수를 반환한다. */
export async function indexRealReviews(): Promise<number> {
  const reviews = await readReviewCsv();
  const supabase = createServerSupabase();

  // 검색 결과의 date를 Supabase에서 보충하므로 Supabase를 먼저 적재한다.
  const { error } = await supabase.from("reviews").upsert(reviews, { onConflict: "id" });
  if (error) throw new Error(`Supabase reviews upsert 실패: ${error.message}`);

  const ns = getReviewNamespace();
  const records = reviews.map((r) => ({
    _id: r.id,
    text: `${r.title} ${r.content}`,
    rating: r.rating,
    author: r.author,
    title: r.title,
    content: r.content,
  }));
  for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
    await ns.upsertRecords({ records: records.slice(i, i + UPSERT_BATCH_SIZE) });
  }
  return reviews.length;
}

/** Pinecone 통합 임베딩 검색으로 관련 리뷰를 찾고, date는 Supabase reviews에서 채운다. */
export async function searchRealReviews(query: string, topK = 5): Promise<SourceReview[]> {
  const res = await getReviewNamespace().searchRecords({
    query: { topK, inputs: { text: query } },
    fields: ["title", "content", "rating", "author"],
  });
  const hits = res.result.hits;
  if (hits.length === 0) return [];

  const ids = hits.map((hit) => hit._id);
  const { data, error } = await createServerSupabase()
    .from("reviews")
    .select("id, date")
    .in("id", ids);
  if (error) throw new Error(`Supabase reviews 조회 실패: ${error.message}`);
  const dates = new Map((data ?? []).map((row) => [String(row.id), String(row.date)]));

  return hits
    .map((hit) => {
      const fields = hit.fields as Record<string, unknown>;
      return {
        id: hit._id,
        rating: Number(fields.rating),
        title: String(fields.title ?? ""),
        content: String(fields.content ?? ""),
        author: String(fields.author ?? ""),
        date: dates.get(hit._id) ?? "",
        score: Math.round(hit._score * 100) / 100,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export async function saveRealMessage(
  chatId: string | undefined,
  message: Omit<StoredMessage, "createdAt">,
): Promise<void> {
  const { error } = await createServerSupabase()
    .from("messages")
    .insert({
      chat_id: chatId || DEFAULT_CHAT_ID,
      role: message.role,
      content: message.content,
      sources: message.sources ?? null,
    });
  if (error) throw new Error(`Supabase messages 저장 실패: ${error.message}`);
}
