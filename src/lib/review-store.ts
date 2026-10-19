// Mock 모드 데이터 저장소: samples/review.csv를 서버 메모리에 캐싱하고 키워드 검색과 대화 기록을 제공한다.
import { promises as fs } from "fs";
import path from "path";
import Papa from "papaparse";
import type { SourceReview } from "./types";

export interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  date: string;
  helpful_votes: number;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

type RawRow = Record<keyof Review, string>;

const CSV_PATH = path.join(process.cwd(), "samples", "review.csv");
const DEFAULT_CHAT_ID = "default";
const MIN_SCORE = 0.65;
const MAX_SCORE = 0.98;
const TITLE_WEIGHT = 2;
const VOTES_WEIGHT = 0.5;
// 긴 조사부터 검사해야 "에서"가 "에"로 잘못 잘리지 않는다.
const PARTICLES = [
  "에서", "으로", "이랑", "한테",
  "은", "는", "이", "가", "을", "를", "에", "로", "와", "과", "도", "만", "의", "랑",
];

// dev HMR로 모듈이 다시 평가돼도 캐시와 대화 기록이 유지되도록 globalThis에 둔다.
const store = globalThis as typeof globalThis & {
  __mockReviews?: Promise<Review[]>;
  __mockMessages?: Map<string, StoredMessage[]>;
};

async function readReviews(): Promise<Review[]> {
  const text = await fs.readFile(CSV_PATH, "utf8");
  const parsed = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(`review.csv 파싱 실패 (row ${first.row}): ${first.message}`);
  }
  return parsed.data.map((row) => ({
    id: row.id,
    rating: Number(row.rating),
    title: row.title,
    content: row.content,
    author: row.author,
    date: row.date,
    helpful_votes: Number(row.helpful_votes) || 0,
  }));
}

/** 캐시된 리뷰를 반환하고, 없으면 CSV를 읽어 적재한다. 실패 시 다음 호출에서 재시도한다. */
function loadReviews(): Promise<Review[]> {
  if (!store.__mockReviews) {
    store.__mockReviews = readReviews().catch((error) => {
      store.__mockReviews = undefined;
      throw error;
    });
  }
  return store.__mockReviews;
}

/** CSV를 다시 읽어 메모리에 적재하고 적재 건수를 반환한다. */
export async function indexMockReviews(): Promise<number> {
  store.__mockReviews = undefined;
  const reviews = await loadReviews();
  return reviews.length;
}

function stripParticle(token: string): string {
  for (const particle of PARTICLES) {
    if (token.length - particle.length >= 2 && token.endsWith(particle)) {
      return token.slice(0, -particle.length);
    }
  }
  return token;
}

/** 질문을 공백·문장부호로 나누고 끝 조사를 제거한 2글자 이상 키워드를 추출한다. */
export function tokenize(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[\s.,!?~"'()[\]]+/)
    .map(stripParticle)
    .filter((token) => token.length >= 2);
  return [...new Set(tokens)];
}

function countOccurrences(text: string, keyword: string): number {
  let count = 0;
  for (let i = text.indexOf(keyword); i !== -1; i = text.indexOf(keyword, i + keyword.length)) {
    count++;
  }
  return count;
}

function byRawScore(
  a: { review: Review; raw: number },
  b: { review: Review; raw: number },
): number {
  return (
    b.raw - a.raw ||
    b.review.helpful_votes - a.review.helpful_votes ||
    a.review.id.localeCompare(b.review.id)
  );
}

/** 선택된 결과의 원점수를 0.65~0.98 범위로 min-max 정규화한다. */
function toSourceReviews(ranked: { review: Review; raw: number }[]): SourceReview[] {
  const raws = ranked.map((r) => r.raw);
  const min = Math.min(...raws);
  const max = Math.max(...raws);
  return ranked.map(({ review, raw }) => {
    const ratio = max === min ? 1 : (raw - min) / (max - min);
    const score = Math.round((MIN_SCORE + (MAX_SCORE - MIN_SCORE) * ratio) * 100) / 100;
    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      content: review.content,
      author: review.author,
      date: review.date,
      score,
    };
  });
}

/**
 * 키워드 출현 횟수(title 가중)와 helpful_votes로 관련 리뷰를 고른다.
 * 매칭되는 리뷰가 없으면 helpful_votes 상위 리뷰를 반환한다.
 */
export async function searchMockReviews(query: string, topK = 5): Promise<SourceReview[]> {
  const reviews = await loadReviews();
  const keywords = tokenize(query);

  const matched = reviews
    .map((review) => {
      const title = review.title.toLowerCase();
      const content = review.content.toLowerCase();
      const hits = keywords.reduce(
        (sum, keyword) =>
          sum +
          countOccurrences(title, keyword) * TITLE_WEIGHT +
          countOccurrences(content, keyword),
        0,
      );
      return { review, hits, raw: hits + Math.log1p(review.helpful_votes) * VOTES_WEIGHT };
    })
    .filter((candidate) => candidate.hits > 0);

  const candidates =
    matched.length > 0
      ? matched
      : reviews.map((review) => ({ review, raw: Math.log1p(review.helpful_votes) }));

  return toSourceReviews([...candidates].sort(byRawScore).slice(0, topK));
}

function messageStore(): Map<string, StoredMessage[]> {
  store.__mockMessages ??= new Map();
  return store.__mockMessages;
}

export function saveMockMessage(
  chatId: string | undefined,
  message: Omit<StoredMessage, "createdAt">,
): void {
  const key = chatId || DEFAULT_CHAT_ID;
  const messages = messageStore().get(key) ?? [];
  messages.push({ ...message, createdAt: new Date().toISOString() });
  messageStore().set(key, messages);
}

export function getMockMessages(chatId?: string): StoredMessage[] {
  return [...(messageStore().get(chatId || DEFAULT_CHAT_ID) ?? [])];
}
