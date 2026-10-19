import type { SourceReview } from "./types";

/** 검색된 리뷰를 LLM 프롬프트에 넣을 컨텍스트 문자열로 조립한다. */
export function buildContext(reviews: SourceReview[]): string {
  return reviews
    .map(
      (review, i) =>
        `[리뷰 ${i + 1}] ★${review.rating} ${review.title} — ${review.content} (작성자: ${review.author})`,
    )
    .join("\n");
}

/** LLM 연동 전 임시 답변: 검색 결과를 요약한 템플릿 문장을 만든다. */
export function buildSummaryAnswer(query: string, reviews: SourceReview[]): string {
  if (reviews.length === 0) {
    return `"${query}"와 관련된 리뷰를 찾지 못했습니다. 다른 표현으로 다시 질문해 주세요.`;
  }

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const top = reviews[0];
  return [
    `"${query}"와 관련된 리뷰 ${reviews.length}건을 찾았습니다. 이 리뷰들의 평균 별점은 ★${average.toFixed(1)}입니다.`,
    `가장 관련도가 높은 리뷰는 ${top.author}님의 「${top.title}」(★${top.rating})입니다: "${top.content}"`,
    "※ AI 답변 생성은 준비 중입니다. 아래 참고 리뷰와 검색 결과 JSON에서 근거를 확인해 주세요.",
  ].join("\n\n");
}
