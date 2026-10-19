"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import type { SourceReview } from "@/lib/types";

export function ReviewCard({ review }: { review: SourceReview }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  // line-clamp-3 상태에서 본문이 잘리는지 측정해 "더보기" 노출 여부를 정한다.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || expanded) return;
    const observer = new ResizeObserver(() => {
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="flex items-center gap-0.5"
          aria-label={`별점 ${review.rating}점`}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`size-3.5 ${
                n <= review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-zinc-300 dark:text-zinc-600"
              }`}
            />
          ))}
        </span>
        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {review.author}
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          관련도 {Math.round(review.score * 100)}%
        </span>
      </div>
      <h3 className="text-sm font-semibold">{review.title}</h3>
      <p
        ref={contentRef}
        className={`mt-1 text-sm text-zinc-600 dark:text-zinc-300 ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {review.content}
      </p>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </article>
  );
}
