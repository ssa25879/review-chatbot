export type DataMode = "mock" | "real";

export interface SourceReview {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  /** 작성일 (YYYY-MM-DD) */
  date: string;
  /** 질문과의 관련도 점수 (0.65~0.98) */
  score: number;
}

/** 답변 생성에 사용된 검색 근거 */
export interface Retrieval {
  query: string;
  chatId: string | null;
  /** 프롬프트에 넣는 리뷰 컨텍스트 문자열 */
  context: string;
}

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      sources?: SourceReview[];
      retrieval?: Retrieval;
      isError?: boolean;
    };

export interface ChatResponse {
  success: boolean;
  mode?: DataMode;
  answer?: string;
  sources?: SourceReview[];
  retrieval?: Retrieval;
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  mode?: DataMode;
  data?: T;
  error?: string;
}

export interface IndexResult {
  indexed: number;
}

export interface ProductInfo {
  name: string;
  category: string;
  reviewCount: number;
  averageRating: number;
}
