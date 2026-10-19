"use client";

import { useCallback, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ProductBanner } from "@/components/chat/ProductBanner";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { sendChat } from "@/lib/api-client";
import type { ChatMessage, DataMode, ProductInfo } from "@/lib/types";

const MAX_HISTORY = 20;

interface DashboardProps {
  mode: DataMode;
  product: ProductInfo;
}

export function Dashboard({ mode, product }: DashboardProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  // state는 비동기로 갱신되므로 같은 틱의 중복 호출은 ref로 막는다.
  const inFlightRef = useRef(false);
  const nextIdRef = useRef(0);

  const nextId = () => `msg-${++nextIdRef.current}`;

  const fillDraft = useCallback((text: string) => {
    setDraft(text);
    setSidebarOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const question = draft.trim();
    if (!question || isSending || inFlightRef.current) return;

    inFlightRef.current = true;
    setIsSending(true);
    setDraft("");
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: question },
    ]);
    setHistory((prev) =>
      [question, ...prev.filter((q) => q !== question)].slice(0, MAX_HISTORY),
    );

    try {
      const res = await sendChat(question);
      setMessages((prev) => [
        ...prev,
        res.success
          ? {
              id: nextId(),
              role: "assistant",
              content: res.answer ?? "",
              sources: res.sources,
            }
          : {
              id: nextId(),
              role: "assistant",
              content: res.error ?? "답변을 가져오지 못했습니다.",
              isError: true,
            },
      ]);
    } finally {
      inFlightRef.current = false;
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        mode={mode}
        history={history}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectHistory={fillDraft}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="메뉴 열기"
          >
            <Menu className="size-5" />
          </button>
          <ProductBanner product={product} />
        </header>

        <MessageList
          messages={messages}
          isSending={isSending}
          onSelectExample={fillDraft}
        />

        <ChatInput
          ref={inputRef}
          value={draft}
          onChange={setDraft}
          onSubmit={handleSend}
          isSending={isSending}
        />
      </main>
    </div>
  );
}
