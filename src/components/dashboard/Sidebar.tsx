import { ShoppingBag, X } from "lucide-react";
import { ModeBadge } from "./ModeBadge";
import { IngestButton } from "./IngestButton";
import { HistoryList } from "./HistoryList";
import type { DataMode } from "@/lib/types";

interface SidebarProps {
  mode: DataMode;
  history: string[];
  open: boolean;
  onClose: () => void;
  onSelectHistory: (question: string) => void;
}

export function Sidebar({
  mode,
  history,
  open,
  onClose,
  onSelectHistory,
}: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 md:static md:translate-x-0 dark:border-zinc-800 dark:bg-zinc-900 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="size-5 text-indigo-600 dark:text-indigo-400" />
            쇼핑 리뷰 AI 분석기
          </h1>
          <ModeBadge mode={mode} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-800"
          aria-label="메뉴 닫기"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
        <IngestButton />
      </div>

      <HistoryList history={history} onSelect={onSelectHistory} />
    </aside>
  );
}
