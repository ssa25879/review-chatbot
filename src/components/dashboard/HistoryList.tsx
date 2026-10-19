import { History, MessageSquare } from "lucide-react";

interface HistoryListProps {
  history: string[];
  onSelect: (question: string) => void;
}

export function HistoryList({ history, onSelect }: HistoryListProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        <History className="size-4" />
        최근 분석 질문
      </h2>
      {history.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          아직 분석한 질문이 없습니다
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col gap-0.5 overflow-y-auto">
          {history.map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => onSelect(question)}
                title={question}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <MessageSquare className="size-4 shrink-0 text-zinc-400" />
                <span className="truncate">{question}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
