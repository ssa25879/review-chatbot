import { Suspense } from "react";
import { io } from "next/cache";
import { Loader2 } from "lucide-react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PRODUCT } from "@/config/product";
import { getDataMode } from "@/lib/data-access";

// cacheComponents 환경에서는 `dynamic = 'force-dynamic'`을 쓸 수 없으므로,
// io()로 정적 셸에서 제외해 USE_MOCK을 요청 시점에 읽는다.
async function DashboardWithMode() {
  await io();
  return <Dashboard mode={getDataMode()} product={PRODUCT} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-zinc-400">
          <Loader2 className="size-6 animate-spin" aria-label="불러오는 중" />
        </div>
      }
    >
      <DashboardWithMode />
    </Suspense>
  );
}
