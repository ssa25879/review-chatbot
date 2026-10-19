export type DataMode = "mock" | "real";

export interface SourceReview {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  /** 질문과의 관련도 점수 (0~1) */
  score: number;
}

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      sources?: SourceReview[];
      isError?: boolean;
    };

export interface ChatResponse {
  success: boolean;
  answer?: string;
  sources?: SourceReview[];
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IngestResult {
  count: number;
  mode: DataMode;
}

export interface ProductInfo {
  name: string;
  category: string;
  reviewCount: number;
  averageRating: number;
}
