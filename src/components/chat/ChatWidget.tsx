import { useEffect, useRef, useState } from "react";
import { chatGreeting, quickReplies, type QuickReply } from "@/data/chatScript";

interface Msg {
  from: "bot" | "user";
  text: string;
}

/* Figma AI chat widget (1:5346): floating launcher + scripted quick-reply panel.
   Site-wide via PageShell. Replace the script with a live agent/AI backend later. */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: chatGreeting }]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const ask = (q: QuickReply) => {
    setMessages((m) => [...m, { from: "user", text: q.label }, { from: "bot", text: q.answer }]);
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="LOOK assistant"
          className="fixed right-4 bottom-24 z-50 flex h-[480px] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.6)] sm:right-6"
        >
          <div className="flex items-center justify-between bg-accent px-5 py-4 text-white">
            <div>
              <p className="text-[15px] font-medium">LOOK Assistant</p>
              <p className="text-[12px] text-white/75">Typically replies instantly</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/15"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-[20px] ${
                    m.from === "user"
                      ? "rounded-br-sm bg-accent text-white"
                      : "rounded-bl-sm bg-surface text-body"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-line px-4 py-3">
            <p className="mb-2 text-[12px] text-muted">Choose a topic</p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => ask(q)}
                  className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[13px] text-body transition-colors hover:border-accent hover:text-accent"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat assistant"}
        aria-expanded={open}
        className="fixed right-4 bottom-6 z-50 flex size-14 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_30px_rgba(225,29,42,0.45)] transition-transform hover:scale-105 sm:right-6"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H9l-4 3.5V16H5.5A1.5 1.5 0 014 14.5v-9z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>
    </>
  );
}
