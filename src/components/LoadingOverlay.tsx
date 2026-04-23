"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Info, Check, Loader2 } from "lucide-react";
import { PROGRESS_LABELS, PROGRESS_ORDER } from "@/types/progress";
import type { ProgressStep } from "@/types/progress";

interface LoadingOverlayProps {
  isActive: boolean;
  step?: ProgressStep | null;
  thinkingText?: string;
  enableThinking?: boolean;
  pipelineSteps?: Array<{ step: string; data: Record<string, unknown> }>;
}

function renderPipelineStep(s: { step: string; data: Record<string, unknown> }): string {
  switch (s.step) {
    case "extracting_jd_meta": {
      const { company, role } = s.data as { company?: string; role?: string };
      return company || role ? `提取关键词：${[company, role].filter(Boolean).join(" / ")}` : "提取JD关键词";
    }
    case "searching_company":
      return "搜索公司动态（已获取）";
    case "searching_role":
      return "搜索岗位行情（已获取）";
    case "building_context": {
      const len = (s.data as { contextLength?: number }).contextLength;
      return `上下文构建完成${len ? `（${len}字符）` : ""}`;
    }
    default:
      return s.step;
  }
}

function PipelineStepsCompact({ steps }: { steps: Array<{ step: string; data: Record<string, unknown> }> }) {
  if (!steps.length) return null;
  return (
    <div className="mb-4 space-y-1 border-b border-gray-100 pb-4">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-[#6b7280]">
          <Check className="size-3 shrink-0 text-[#22c55e]" strokeWidth={3} />
          <span>{renderPipelineStep(s)}</span>
        </div>
      ))}
    </div>
  );
}

const MAX_DISPLAY_LENGTH = 5000;

export function LoadingOverlay({ isActive, step, thinkingText, enableThinking, pipelineSteps = [] }: LoadingOverlayProps) {
  const thinkingRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // 只显示最后 5000 字符，避免渲染超长文本
  const displayThinkingText = (thinkingText?.length ?? 0) > MAX_DISPLAY_LENGTH
    ? thinkingText!.slice(-MAX_DISPLAY_LENGTH)
    : thinkingText;

  useEffect(() => {
    if (!enableThinking || !isActive) return;
    const el = thinkingRef.current;
    if (!el) return;
    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
      autoScrollRef.current = atBottom;
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [enableThinking, isActive]);

  useEffect(() => {
    if (thinkingText && thinkingRef.current && autoScrollRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinkingText]);

  useEffect(() => {
    if (isActive) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isActive]);

  if (!isActive) return null;

  const stepIndex = step ? PROGRESS_ORDER.indexOf(step) : 0;
  const t = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } as const;

  if (enableThinking) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={t}
        style={{
          backgroundColor: "rgba(248, 250, 252, 0.6)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <motion.div
          className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[16px]"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={t}
          style={{
            backdropFilter: "blur(24px) saturate(150%)",
            backgroundColor: "rgba(255, 255, 255, 0.72)",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.1), 0 24px 48px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eff6ff]">
                <Info className="size-5 text-[#155dfc]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#101828]">深度思考模式已开启</p>
                <p className="text-xs text-[#6a7282]">正在进行高维逻辑推演...</p>
              </div>
            </div>
          </div>
          <div className="min-h-[280px] p-6">
            <PipelineStepsCompact steps={pipelineSteps} />
            <div ref={thinkingRef} className="max-h-[420px] overflow-y-auto overflow-x-hidden text-sm leading-[1.7] text-[#374151]">
              {displayThinkingText ? (
                <div className="font-mono break-words [&_strong]:font-semibold [&_strong]:text-[#101828] [&_em]:italic [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-1">
                  {(thinkingText?.length ?? 0) > MAX_DISPLAY_LENGTH && (
                    <p className="mb-2 text-xs text-[#9ca3af]">... (显示最后 {MAX_DISPLAY_LENGTH} 字符)</p>
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkBreaks]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-[#101828]">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside my-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside my-1">{children}</ol>,
                      li: ({ children }) => <li className="my-0.5">{children}</li>,
                    }}
                  >
                    {displayThinkingText}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="font-mono text-[#9ca3af]">等待AI开始思考...</div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[#9ca3af]">
              <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-[#155dfc]" />
              <span className="text-sm font-mono">推理中...</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={t}
      style={{
        backgroundColor: "rgba(248, 250, 252, 0.6)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-[16px] px-8 py-10"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={t}
        style={{
          backdropFilter: "blur(24px) saturate(150%)",
          backgroundColor: "rgba(255, 255, 255, 0.72)",
          border: "1px solid rgba(255, 255, 255, 0.9)",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.1), 0 24px 48px rgba(0,0,0,0.08)",
        }}
      >
        <div className="space-y-0">
          <PipelineStepsCompact steps={pipelineSteps} />
          {PROGRESS_ORDER.map((s, i) => {
            const status = i < stepIndex ? "completed" : i === stepIndex ? "active" : "pending";
            return (
              <div key={s} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex size-8 shrink-0 items-center justify-center">
                    {status === "completed" && (
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: [0.5, 1.2, 1] }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex size-6 items-center justify-center rounded-full bg-[#22c55e]"
                      >
                        <Check className="size-4 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                    {status === "active" && (
                      <div className="flex size-6 items-center justify-center">
                        <Loader2 className="size-5 animate-spin text-[#3B82F6]" />
                      </div>
                    )}
                    {status === "pending" && <div className="size-2 rounded-full bg-gray-300 opacity-40" />}
                  </div>
                  {i < PROGRESS_ORDER.length - 1 && (
                    <div className="relative mt-1 h-8 w-px overflow-hidden bg-gray-200">
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: i < stepIndex ? 1 : 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-x-0 top-0 h-full origin-top bg-[#22c55e]"
                      />
                    </div>
                  )}
                </div>
                <div className="flex min-h-8 flex-1 items-center">
                  <p className={`m-0 text-sm leading-normal transition-colors ${status === "active" ? "font-medium text-[#111827]" : status === "completed" ? "text-[#6b7280]" : "text-gray-400"}`}>
                    {PROGRESS_LABELS[s]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
