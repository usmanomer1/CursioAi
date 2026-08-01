"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { X, Send, Loader2, User, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { MarkdownMessage } from "@/components/markdown-message";

interface Job {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_description: string;
  job_description_clean?: string;
  match_score?: number;
  missing_skills?: string[];
}

interface JobChatPanelProps {
  job: Job;
  resumeText?: string;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Am I a good fit for this role?",
  "How should I address the missing skills?",
  "Draft 3 interview questions they might ask.",
  "Write a short cover letter intro.",
];

function ChatThread({
  job,
  resumeText,
  onClose,
  initialMessages,
  initialThreadId,
}: JobChatPanelProps & {
  initialMessages: Message[];
  initialThreadId: string | null;
}) {
  const createThread = useAction(api.agents.actions.createJobChatThread);
  const sendMessage = useAction(api.agents.actions.sendJobChatMessage);

  // A thread created during this session takes precedence; otherwise fall back
  // to the persisted id as the query catches up — no effect needed, and the
  // component never remounts mid-conversation.
  const [createdThreadId, setCreatedThreadId] = useState<string | null>(null);
  const threadId = createdThreadId ?? initialThreadId;

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ensureThread = useCallback(async (): Promise<string> => {
    if (threadId) return threadId;
    const result = await createThread({
      jobId: job.job_id,
      jobContext: {
        title: job.job_title,
        company: job.employer_name,
        description: job.job_description_clean ?? job.job_description,
        matchScore: job.match_score,
        missingSkills: job.missing_skills,
        resumeText,
      },
    });
    setCreatedThreadId(result.threadId);
    return result.threadId;
  }, [threadId, createThread, job, resumeText]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || loading) return;
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setLoading(true);
      try {
        const activeThreadId = await ensureThread();
        const response = await sendMessage({
          threadId: activeThreadId,
          message,
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.text },
        ]);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to send message"
        );
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [loading, ensureThread, sendMessage]
  );

  const showWelcome = messages.length === 0 && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end sm:items-end sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full flex-col border-line-strong bg-surface shadow-2xl sm:h-[640px] sm:max-w-md sm:rounded-2xl sm:border [animation:var(--animate-slide-up)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 ring-1 ring-brand-500/25">
              <LogoMark className="h-5 w-5" id="chat-hdr" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-fg">Job Coach</p>
              <p className="max-w-[240px] truncate text-xs text-subtle">
                {job.job_title} · {job.employer_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {showWelcome && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15">
                <Sparkles className="h-6 w-6 text-brand-500" />
              </div>
              <p className="mb-1 font-medium text-fg">
                Your AI coach for this role
              </p>
              <p className="mb-5 max-w-xs text-sm text-subtle">
                Resume and job context are loaded. Ask anything.
              </p>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-lg border border-line bg-raised px-3 py-2 text-left text-sm text-muted transition-colors hover:border-brand-500/40 hover:bg-raised"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user"
                    ? "bg-fg"
                    : "bg-brand-500/10 ring-1 ring-brand-500/20"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="h-4 w-4 text-canvas" />
                ) : (
                  <LogoMark className="h-4 w-4" id="chat-msg" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-fg text-canvas"
                    : "bg-raised text-fg"
                }`}
              >
                {msg.role === "assistant" ? (
                  <MarkdownMessage content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-subtle">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-line p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this job…"
              className="flex-1 rounded-xl border border-line-strong bg-raised px-4 py-2.5 text-sm text-fg placeholder:text-subtle focus:border-brand-500 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && void send(input)}
              disabled={loading}
            />
            <Button
              size="icon"
              variant="brand"
              className="rounded-xl"
              onClick={() => void send(input)}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobChatPanel({ job, resumeText, onClose }: JobChatPanelProps) {
  const existingThread = useQuery(api.jobChat.getJobChatThread, {
    jobId: job.job_id,
  });
  const history = useQuery(api.jobChat.listMessages, { jobId: job.job_id });

  // Only block on the very first load — don't unmount mid-conversation when
  // Convex queries refresh after createThread / saveChatMessages. Latching in
  // state (not a ref written during render) keeps this React-safe.
  const loaded = history !== undefined && existingThread !== undefined;
  const [hasLoaded, setHasLoaded] = useState(loaded);
  if (loaded && !hasLoaded) setHasLoaded(true); // render-phase state update, allowed

  if (!hasLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-stretch justify-end sm:items-end sm:p-6">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative flex h-full w-full items-center justify-center bg-surface shadow-2xl sm:h-[640px] sm:max-w-md sm:rounded-2xl sm:border sm:border-line-strong">
          <Loader2 className="h-6 w-6 animate-spin text-subtle" />
        </div>
      </div>
    );
  }

  const initialMessages =
    history?.map((m) => ({ role: m.role, content: m.content })) ?? [];

  return (
    <ChatThread
      key={job.job_id}
      job={job}
      resumeText={resumeText}
      onClose={onClose}
      initialMessages={initialMessages}
      initialThreadId={existingThread?.agentThreadId ?? null}
    />
  );
}
