// samples/review.csv 파싱: Mock 저장소와 실데이터 적재가 함께 사용한다.
import { promises as fs } from "fs";
import path from "path";
import Papa from "papaparse";

export interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  date: string;
  helpful_votes: number;
  verified_purchase: boolean;
}

type RawRow = Record<keyof Review, string>;

const CSV_PATH = path.join(process.cwd(), "samples", "review.csv");

/** CSV를 읽어 리뷰 목록으로 변환한다. 필드 밀림을 숨기지 않도록 파싱 오류가 있으면 throw한다. */
export async function readReviewCsv(): Promise<Review[]> {
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
    verified_purchase: row.verified_purchase === "true",
  }));
}
