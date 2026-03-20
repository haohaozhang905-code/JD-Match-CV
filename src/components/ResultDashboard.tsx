"use client";

import { Check, X, ArrowLeft, ArrowRight, FileDown, Target, Sparkles, TrendingUp, Zap, MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MarkdownBold } from "@/components/MarkdownBold";
import { useCountUp } from "@/hooks/useCountUp";
import type { AnalysisResult } from "@/types/analysis";

interface ResultDashboardProps {
  result: AnalysisResult;
  onBack: () => void;
}

const defaultResult: Required<AnalysisResult> = {
  matchScore: 0,
  matchSummary: "",
  jdTranslations: [],
  strengths: [],
  weaknesses: [],
  interviewQuestions: [],
};

function getMatchLevel(score: number): string {
  if (score >= 90) return "极度吻合";
  if (score >= 80) return "高度匹配";
  if (score >= 70) return "较为匹配";
  if (score >= 60) return "基本匹配";
  return "需重点提升";
}

export function ResultDashboard({ result, onBack }: ResultDashboardProps) {
  const r = { ...defaultResult, ...result };
  const animatedScore = useCountUp(r.matchScore, 1200);

  const handleExportPdf = () => window.print();

  const cardShadow = "0px 8px 30px 0px rgba(0,0,0,0.04)";

  return (
    <div className="w-full max-w-4xl space-y-8">
      {/* 顶部操作栏 */}
      <div className="flex h-[38px] items-center justify-between px-0 print:hidden">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-auto gap-2 px-0 text-[14px] text-[#6a7282] hover:bg-transparent hover:text-[#101828]"
        >
          <ArrowLeft className="size-4" />
          重新分析
        </Button>
        <Button
          variant="outline"
          onClick={handleExportPdf}
          className="h-[38px] gap-2 rounded-[10px] border-[#e5e7eb] px-4 text-[14px] font-medium text-[#364153] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-gray-50"
        >
          <FileDown className="size-4" />
          导出 PDF 报告
        </Button>
      </div>

      {/* 板块一：综合匹配度 - 左右布局，设计稿：饱和绿、加粗字 */}
      <div
        className="relative overflow-hidden rounded-[24px] border border-[#f3f4f6] bg-white p-8"
        style={{ boxShadow: cardShadow }}
      >
        <h2 className="relative mb-6 flex items-center gap-2 text-[20px] font-bold text-[#1A1A1A]">
          <Target className="size-5 shrink-0 text-[#155dfc]" />
          综合匹配度
        </h2>
        <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
          {/* 左侧：环形进度 - 鲜亮草绿 #22c55e */}
          <div className="relative shrink-0 size-40 md:size-44">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#22c55e"
                strokeWidth="10"
                strokeDasharray={`${(animatedScore / 100) * 264} 264`}
                strokeLinecap="round"
                className="transition-all duration-[1200ms] ease-out"
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[40px] font-extrabold leading-none text-[#1A1A1A]">
                {animatedScore}
                <span className="ml-0.5 text-base font-medium text-[#555555]">%</span>
              </span>
              <span className="mt-1.5 text-[13px] font-bold text-[#22c55e]">
                {getMatchLevel(r.matchScore)}
              </span>
            </span>
          </div>
          {/* 右侧：描述文案 - 深灰、加粗 */}
          <p className="flex-1 text-[14px] font-medium leading-[22px] text-[#555555] md:pl-2">
            <MarkdownBold text={r.matchSummary} />
          </p>
        </div>
      </div>

      {/* 板块二：JD黑话翻译器 - 设计稿：紫色图标、左灰右紫框 */}
      {r.jdTranslations.length > 0 && (
        <div
          className="overflow-hidden rounded-[24px] border border-[#f3f4f6] bg-white p-8"
          style={{ boxShadow: cardShadow }}
        >
          <h2 className="mb-6 flex items-center gap-2 text-[20px] font-semibold text-[#101828]">
            <Sparkles className="size-5 shrink-0 text-[#9C27B0]" />
            JD黑话翻译器
          </h2>
          <div className="flex flex-col gap-6">
            {r.jdTranslations.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
              >
                {/* 左：JD原文 - 设计稿 bg-[#f9fafb] border-[#f3f4f6] */}
                <div className="relative rounded-2xl border border-[#f3f4f6] bg-[#f9fafb] px-4 py-5">
                  <span className="absolute -top-3 left-4 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4a5565]" style={{ backgroundColor: "#e5e7eb" }}>
                    JD原文
                  </span>
                  <p className="text-[14px] leading-[22.75px] text-[#6a7282]">
                    &quot;<MarkdownBold text={item.original} />&quot;
                  </p>
                </div>
                <div className="hidden items-center justify-center md:flex">
                  <ArrowRight className="size-5 shrink-0 text-[#9ca3af]" />
                </div>
                {/* 右：大白话潜台词 - 上下间距一致 py-5 */}
                <div className="relative rounded-2xl border border-[#f3e8ff] px-4 py-5" style={{ backgroundColor: "rgba(250,245,255,0.5)" }}>
                  <span className="absolute -top-3 left-4 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8200db]" style={{ backgroundColor: "#e9d4ff" }}>
                    大白话潜台词
                  </span>
                  <p className="text-[14px] font-medium leading-[22.75px] text-[#59168b]">
                    <MarkdownBold text={item.translation} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 板块三：能力雷达与 Gap 分析 - 设计稿：绿 #016630 / 红 #9f0712 */}
      <div
        className="overflow-hidden rounded-[24px] border border-[#f3f4f6] bg-white p-8"
        style={{ boxShadow: cardShadow }}
      >
        <h2 className="mb-6 flex items-center gap-2 text-[20px] font-semibold text-[#101828]">
          <TrendingUp className="size-5 shrink-0 text-[#9C27B0]" />
          能力雷达与 Gap 分析
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* 核心优势 - 设计稿 bg rgba(240,253,244,0.5) border #dcfce7 */}
          <div
            className="rounded-2xl border border-[#dcfce7] p-6"
            style={{ backgroundColor: "rgba(240,253,244,0.5)" }}
          >
            <h3 className="mb-4 flex items-center gap-2 text-[16px] font-semibold text-[#0d542b]">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#05df72]">
                <Check className="size-4 text-white stroke-[3]" />
              </div>
              核心优势契合点
            </h3>
            <ul className="flex flex-col gap-3">
              {r.strengths.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[14px] font-medium leading-[22.75px] text-[#016630]"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#05df72]" />
                  <MarkdownBold text={s} />
                </li>
              ))}
            </ul>
          </div>
          {/* 需警惕的核心短板 - 设计稿 bg rgba(254,242,242,0.5) border #ffe2e2 */}
          <div
            className="rounded-2xl border border-[#ffe2e2] p-6"
            style={{ backgroundColor: "rgba(254,242,242,0.5)" }}
          >
            <h3 className="mb-4 flex items-center gap-2 text-[16px] font-semibold text-[#82181a]">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ff6467]">
                <X className="size-4 text-white stroke-[3]" />
              </div>
              需警惕的核心短板
            </h3>
            <ul className="flex flex-col gap-3">
              {r.weaknesses.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[14px] font-medium leading-[22.75px] text-[#9f0712]"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#ff6467]" />
                  <MarkdownBold text={w} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 板块四：定制化面试突击题库 - 设计稿：展开 border #bedbff、内层白卡片 */}
      {r.interviewQuestions.length > 0 && (
        <div
          className="overflow-hidden rounded-[24px] border border-[#f3f4f6] bg-white p-8"
          style={{ boxShadow: cardShadow }}
        >
          <h2 className="mb-2 flex items-center gap-2 text-[20px] font-semibold text-[#101828]">
            <Zap className="size-5 shrink-0 text-[#EAB308]" />
            定制化面试突击题库
          </h2>
          <p className="mb-6 text-[14px] text-[#6a7282]">
            AI结合你的简历短板与岗位核心诉求，预测出最可能被问到的 3 道高频面试题。
          </p>
          <Accordion className="flex w-full flex-col gap-4">
            {r.interviewQuestions.map((q, i) => (
              <AccordionItem
                key={i}
                value={`q-${i}`}
                className="overflow-hidden rounded-2xl border border-[#f3f4f6] transition-colors data-open:border-[#bedbff] data-open:bg-[rgba(239,246,255,0.3)] data-open:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
              >
                <AccordionTrigger className="flex min-h-[52px] items-center justify-between gap-3 px-5 py-4 text-left hover:no-underline [&>svg]:size-5 [&>svg]:shrink-0">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-[12px] font-bold text-[#1447e6]">
                      Q{i + 1}
                    </span>
                    <span className="text-[14px] font-medium leading-[1.5] text-[#101828]">
                      <MarkdownBold text={q.question} />
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t border-[rgba(219,234,254,0.5)] px-5 pb-2.5 pt-2">
                    <div className="flex gap-3 rounded-[14px] border border-[#f3f4f6] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]">
                      <MessageCircle className="mt-0.5 size-5 shrink-0 text-[#155dfc]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-[22.75px] text-[#4a5565]">
                          <span className="font-medium text-[#374151]">回答思路：</span>
                          <MarkdownBold text={q.suggestion} />
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
