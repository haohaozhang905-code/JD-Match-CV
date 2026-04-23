"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PipelineStep {
  step: string;
  data: Record<string, unknown>;
}

interface PipelineStepsProps {
  steps: PipelineStep[];
  compact?: boolean;
}

function renderPipelineLabel(s: PipelineStep): string {
  switch (s.step) {
    case "extracting_jd_meta": {
      const { company, role } = s.data as { company?: string; role?: string };
      return company || role ? `提取关键词：${[company, role].filter(Boolean).join(" / ")}` : "提取JD关键词";
    }
    case "searching_company":
      return "搜索公司动态（已获取）";
    case "searching_role":
      return "搜索岗位行情（已获取）";
    case "searching_extra":
      return "搜索扩展维度（能力/流程/文化等）";
    case "summarizing_market":
      return "生成市场洞察总结（含数据源）";
    case "building_context": {
      const len = (s.data as { contextLength?: number }).contextLength;
      return `上下文构建完成${len ? `（${len}字符）` : ""}`;
    }
    default:
      return s.step;
  }
}

interface SearchItem { title: string; content: string; url: string }

function renderPipelineDetail(s: PipelineStep): { text?: string; items?: SearchItem[] } | null {
  switch (s.step) {
    case "extracting_jd_meta": {
      const { company, role } = s.data as { company?: string; role?: string };
      const parts = [];
      if (company) parts.push(`公司：${company}`);
      if (role) parts.push(`岗位：${role}`);
      return parts.length > 0 ? { text: parts.join("\n") } : null;
    }
    case "searching_company": {
      const items = (s.data as { items?: SearchItem[] }).items;
      if (items && items.length > 0) return { items };
      const results = (s.data as { results?: string }).results;
      return results ? { text: `公司动态搜索结果：\n${results.slice(0, 500)}${results.length > 500 ? "..." : ""}` } : null;
    }
    case "searching_role": {
      const items = (s.data as { items?: SearchItem[] }).items;
      if (items && items.length > 0) return { items };
      const results = (s.data as { results?: string }).results;
      return results ? { text: `岗位行情搜索结果：\n${results.slice(0, 500)}${results.length > 500 ? "..." : ""}` } : null;
    }
    case "searching_extra": {
      const items = (s.data as { items?: SearchItem[] }).items;
      if (items && items.length > 0) return { items };
      return null;
    }
    case "summarizing_market": {
      const summary = (s.data as { summary?: string }).summary;
      return summary ? { text: `洞察总结：\n${summary}` } : null;
    }
    case "building_context": {
      const len = (s.data as { contextLength?: number }).contextLength;
      return len ? { text: `上下文总长度：${len} 字符` } : null;
    }
    default:
      return null;
  }
}

export function PipelineSteps({ steps, compact = false }: PipelineStepsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!steps.length) return null;

  return (
    <div className={compact ? "mb-4 space-y-1 border-b border-gray-100 pb-4" : "space-y-2"}>
      {steps.map((s, i) => {
        const detail = renderPipelineDetail(s);
        const isExpanded = expandedIndex === i;

        return (
          <div key={i}>
            <button
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
              className={`flex w-full items-center gap-2 text-xs transition-colors ${compact ? "text-[#6b7280] hover:text-[#374151]" : "rounded-lg px-3 py-2 text-[#6a7282] hover:bg-gray-50 hover:text-[#101828]"}`}
            >
              <Check className="size-3 shrink-0 text-[#22c55e]" strokeWidth={3} />
              <span className="flex-1 text-left">{renderPipelineLabel(s)}</span>
              {detail && (
                <ChevronDown className={`size-3 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              )}
            </button>
            <AnimatePresence>
              {isExpanded && detail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pl-5"
                >
                  <div className={`text-xs leading-relaxed ${compact ? "text-[#6b7280]" : "my-1 rounded-lg bg-gray-50 px-3 py-2 text-[#6a7282]"}`}>
                    {detail.items ? (
                      <ul className="flex flex-col gap-2">
                        {detail.items.map((item, j) => (
                          <li key={j}>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-[#155dfc] hover:underline"
                            >
                              {item.title}
                            </a>
                            <p className="mt-0.5 break-words text-[#6b7280]">
                              {item.content.slice(0, 150)}{item.content.length > 150 ? "..." : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{detail.text}</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
