import { Cloud, Database } from "lucide-react";
import type { DataMode } from "@/lib/types";

export function ModeBadge({ mode }: { mode: DataMode }) {
  if (mode === "mock") {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
        <Database className="size-3.5" />
        Mock 모드
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      <Cloud className="size-3.5" />
      실데이터 모드
    </span>
  );
}
