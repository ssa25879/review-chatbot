// 임시 스텁: 후속 변경(Mock RAG 파이프라인)에서 키워드 검색 + LLM 생성으로 교체한다.
import type { ChatResponse, SourceReview } from "@/lib/types";

const STUB_DELAY_MS = 800;

const SAMPLE_SOURCES: SourceReview[] = [
  {
    id: "r003",
    rating: 5,
    title: "노이즈 캔슬링 대박",
    content:
      "독서실이랑 카페에서 공부할 때 쓰는데 에어컨 소리나 말소리 거의 완벽하게 차단해 줍니다. 집중력 완전 올라갔어요.",
    author: "열공생",
    score: 0.92,
  },
  {
    id: "r002",
    rating: 4,
    title: "음질 좋지만 통화 품질은 아쉬워요",
    content:
      "음악 들을 때 저음 타격감이랑 해상력은 가격 대비 훌륭합니다. 다만 지하철에서 통화할 때 상대방이 제 목소리보다 주변 소음이 더 크게 들린다고 하네요.",
    author: "사운드매니아",
    score: 0.81,
  },
  {
    id: "r039",
    rating: 2,
    title: "노이즈캔슬링 강도가 약합니다",
    content:
      "ANC 켜도 카페 말소리가 다 들립니다. 저가형 수준이에요. 기대가 컸나 봅니다.",
    author: "깐깐이",
    score: 0.74,
  },
];

export async function POST(request: Request) {
  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    if (typeof body.question === "string") question = body.question.trim();
  } catch {
    // 잘못된 JSON 본문은 빈 질문으로 처리
  }

  if (!question) {
    return Response.json(
      { success: false, error: "질문을 입력해 주세요." } satisfies ChatResponse,
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, STUB_DELAY_MS));

  return Response.json({
    success: true,
    answer: `(임시 응답) "${question}"에 대한 리뷰 분석 기능은 준비 중입니다. 아래는 예시 참고 리뷰입니다.`,
    sources: SAMPLE_SOURCES,
  } satisfies ChatResponse);
}
