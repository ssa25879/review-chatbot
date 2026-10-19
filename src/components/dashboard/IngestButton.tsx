"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, DatabaseZap, Loader2 } from "lucide-react";
import { indexSamples } from "@/lib/api-client";

type IngestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; count: number }
  | { status: "error"; error: string };

export function IngestButton() {
  const [state, setState] = useState<IngestState>({ status: "idle" });
  const isLoading = state.status === "loading";

  const handleClick = async () => {
    if (isLoading) return;
    setState({ status: "loading" });
    const res = await indexSamples();
    setState(
      res.success && res.data
        ? { status: "success", count: res.data.indexed }
        : { status: "error", error: res.error ?? "인덱싱에 실패했습니다." },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            인덱싱 중...
          </>
        ) : (
          <>
            <DatabaseZap className="size-4" />
            샘플 데이터 인덱싱
          </>
        )}
      </button>

      {state.status === "success" && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5 shrink-0" />
          {state.count}건 인덱싱 완료
        </p>
      )}
      {state.status === "error" && (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {state.error}
        </p>
      )}
    </div>
  );
}
