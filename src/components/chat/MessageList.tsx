"use client";

import { useEffect, useRef } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "@/lib/types";

const EXAMPLE_QUESTIONS = [
  "음질은 어떤가요?",
  "배터리 수명은 만족스러운가요?",
  "노이즈캔슬링 성능에 대한 평가는?",
  "장시간 착용하면 귀가 아픈가요?",
];

interface MessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
  onSelectExample: (question: string) => void;
}

export function MessageList({
  messages,
  isSending,
  onSelectExample,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
        {messages.length === 0 && !isSending ? (
          <EmptyState onSelectExample={onSelectExample} />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {isSending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function EmptyState({
  onSelectExample,
}: {
  onSelectExample: (question: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <Sparkles className="size-6" />
      </div>
      <div>
        <p className="text-lg font-semibold">리뷰에 대해 무엇이든 물어보세요</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          실제 구매 리뷰를 근거로 AI가 답변하고, 참고한 리뷰도 함께 보여드려요.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelectExample(question)}
            className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-sm text-zinc-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" role="status">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
        <Bot className="size-4" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <Loader2 className="size-4 animate-spin" />
        리뷰를 분석하고 있어요
      </div>
    </div>
  );
}
