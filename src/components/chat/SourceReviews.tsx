"use client";

import { useId, useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { ReviewCard } from "./ReviewCard";
import type { SourceReview } from "@/lib/types";

const MAX_SOURCES = 5;

export function SourceReviews({ sources }: { sources: SourceReview[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const visible = sources.slice(0, MAX_SOURCES);

  if (visible.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <BookOpen className="size-3.5" />
        참고 리뷰 {visible.length}건
        <ChevronDown
          className={`ml-auto size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul id={panelId} className="flex flex-col gap-2 px-3 pb-3">
          {visible.map((review) => (
            <li key={review.id}>
              <ReviewCard review={review} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
