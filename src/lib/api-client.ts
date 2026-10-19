import type { ApiResponse, ChatResponse, IngestResult } from "./types";

const NETWORK_ERROR = "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";

/**
 * fetch 실패, non-2xx, JSON 파싱 실패를 모두 `{ success: false, error }`로 정규화한다.
 * 호출부는 throw를 신경 쓰지 않고 `success`만 분기하면 된다.
 */
async function postJson<T extends { success: boolean; error?: string }>(
  url: string,
  body?: unknown,
): Promise<T | { success: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { success: false, error: NETWORK_ERROR };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      success: false,
      error: `서버 응답을 해석할 수 없습니다. (HTTP ${res.status})`,
    };
  }

  const parsed = json as Partial<T> | null;
  if (!res.ok || !parsed || parsed.success !== true) {
    return {
      success: false,
      error:
        (typeof parsed?.error === "string" && parsed.error) ||
        `요청에 실패했습니다. (HTTP ${res.status})`,
    };
  }
  return parsed as T;
}

export function sendChat(question: string): Promise<ChatResponse> {
  return postJson<ChatResponse>("/api/chat", { question });
}

export function ingestSamples(): Promise<ApiResponse<IngestResult>> {
  return postJson<ApiResponse<IngestResult>>("/api/ingest");
}
