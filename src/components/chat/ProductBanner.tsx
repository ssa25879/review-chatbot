import { Headphones, MessageSquareText, Star } from "lucide-react";
import type { ProductInfo } from "@/lib/types";

export function ProductBanner({ product }: { product: ProductInfo }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <Headphones className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{product.name}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{product.category}</span>
          <span className="flex items-center gap-1">
            <MessageSquareText className="size-3.5" />
            리뷰 {product.reviewCount}건
          </span>
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            평균 {product.averageRating.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
