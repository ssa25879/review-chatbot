"use client";

import { useId, useState } from "react";
import { Braces, ChevronDown } from "lucide-react";
import type { Retrieval, SourceReview } from "@/lib/types";

interface RetrievalJsonProps {
  retrieval: Retrieval;
  sources: SourceReview[];
}

export function RetrievalJson({ retrieval, sources }: RetrievalJsonProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <Braces className="size-3.5" />
        검색 결과 JSON
        <ChevronDown
          className={`ml-auto size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <pre
          id={panelId}
          className="mx-3 mb-3 max-h-80 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
        >
          {JSON.stringify({ ...retrieval, sources }, null, 2)}
        </pre>
      )}
    </div>
  );
}
