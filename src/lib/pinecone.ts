// Pinecone 통합 임베딩 인덱스(review-chatbot, llama-text-embed-v2) 접근.
// 임베딩은 인덱스가 수행하므로 upsertRecords / searchRecords만 사용한다.
import { Pinecone } from "@pinecone-database/pinecone";
import type { Index } from "@pinecone-database/pinecone";
import { requireEnv } from "@/lib/env";

const NAMESPACE = "reviews";

let reviewNamespace: Index | undefined;

/** 'reviews' 네임스페이스 클라이언트를 반환한다. 최초 호출 시 생성해 재사용한다. */
export function getReviewNamespace(): Index {
  if (!reviewNamespace) {
    const pc = new Pinecone({ apiKey: requireEnv("PINECONE_API_KEY") });
    reviewNamespace = pc
      .index({ name: requireEnv("PINECONE_INDEX_NAME"), host: requireEnv("PINECONE_HOST") })
      .namespace(NAMESPACE);
  }
  return reviewNamespace;
}
