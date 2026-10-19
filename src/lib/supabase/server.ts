// 서버 전용 Supabase 클라이언트. 쿠키 기반 인증이 없으므로 supabase-js를 직접 사용한다.
import { createClient } from "@supabase/supabase-js";
import { ConfigError, requireEnv } from "@/lib/env";

export function createServerSupabase() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new ConfigError(
      "환경변수 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
