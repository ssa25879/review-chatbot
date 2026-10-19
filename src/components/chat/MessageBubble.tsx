import { AlertCircle, Bot, User } from "lucide-react";
import { SourceReviews } from "./SourceReviews";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex flex-row-reverse items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
          <User className="size-4" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm whitespace-pre-wrap break-words text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
        <Bot className="size-4" />
      </div>
      <div className="flex max-w-[80%] min-w-0 flex-col gap-2">
        {message.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="whitespace-pre-wrap break-words">
              {message.content}
            </span>
          </div>
        ) : (
          <div className="rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-2.5 text-sm whitespace-pre-wrap break-words dark:border-zinc-800 dark:bg-zinc-900">
            {message.content}
          </div>
        )}
        {message.sources && message.sources.length > 0 && (
          <SourceReviews sources={message.sources} />
        )}
      </div>
    </div>
  );
}
