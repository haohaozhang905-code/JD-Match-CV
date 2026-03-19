"use client";

import { Check, X, ArrowLeft, ArrowRight, FileDown, Target, Sparkles, TrendingUp, Zap, MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-[#6a7282] hover:text-[#101828] print:hidden"
        >
          <ArrowLeft className="size-4" />
          重新分析
        </Button>
        <Button
          variant="outline"
          onClick={handleExportPdf}
          className="gap-2 print:hidden"
        >
          <FileDown className="size-4" />
          导出 PDF 报告
        </Button>
      </div>

      {/* 板块一：综合匹配度 - 设计稿：蓝色靶心图标、绿色分段环形、极度吻合绿色 */}
      <div
        className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)]"
        style={{ boxShadow: "0px 4px 24px 0px rgba(0,0,0,0.04)" }}
      >
        <h2 className="mb-8 flex items-center gap-2 text-xl font-bold text-[#101828]">
          <Target className="size-5 text-[#155dfc]" />
          综合匹配度
        </h2>
        <div className="flex flex-col items-center gap-6 pt-4 pb-8">
          <div className="relative size-52">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              {/* 内圈：浅灰细线 */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              {/* 外圈：浅灰背景轨道 */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              {/* 外圈：亮绿色分段进度条 */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#00C853"
                strokeWidth="10"
                strokeDasharray={`${(animatedScore / 100) * 264} 264`}
                strokeLinecap="round"
                className="transition-all duration-[1200ms] ease-out"
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[48px] font-bold leading-none text-[#101828]">
                {animatedScore}
                <span className="ml-0.5 text-2xl font-medium text-[#9ca3af]">%</span>
              </span>
              <span className="mt-2 text-base font-medium text-[#00C853]">
                {getMatchLevel(r.matchScore)}
              </span>
            </span>
          </div>
          <p className="max-w-md text-center text-[15px] leading-6 text-[#6a7282]">
            {r.matchSummary}
          </p>
        </div>
      </div>

      {/* 板块二：JD 黑话翻译器 - 设计稿：紫色图标、左灰右紫框 */}
      {r.jdTranslations.length > 0 && (
        <div
          className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)]"
          style={{ boxShadow: "0px 4px 24px 0px rgba(0,0,0,0.04)" }}
        >
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#101828]">
            <Sparkles className="size-5 text-[#9C27B0]" />
            JD 黑话翻译器
          </h2>
          <div className="space-y-6">
            {r.jdTranslations.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
              >
                {/* 左：JD 原文 - 浅灰背景 */}
                <div className="rounded-xl bg-gray-50 p-4">
                  <span className="mb-2 inline-block rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-[#6a7282]">
                    JD 原文
                  </span>
                  <p className="text-sm leading-[22px] text-[#6a7282]">
                    &quot;{item.original}&quot;
                  </p>
                </div>
                <div className="hidden items-center justify-center md:flex">
                  <ArrowRight className="size-5 shrink-0 text-[#9ca3af]" />
                </div>
                {/* 右：大白话潜台词 - 白底+淡紫边框 */}
                <div className="rounded-xl border border-[#E1BEE7] bg-[#F8F5F9] p-4">
                  <span className="mb-2 inline-block rounded-full bg-[#E1BEE7] px-2.5 py-0.5 text-xs font-medium text-[#7B1FA2]">
                    大白话潜台词
                  </span>
                  <p className="text-sm leading-[22px] text-[#4A148C]">
                    {item.translation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 板块三：能力雷达与 Gap 分析 - 设计稿：紫色波浪图标、绿/红深色文字 */}
      <div
        className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)]"
        style={{ boxShadow: "0px 4px 24px 0px rgba(0,0,0,0.04)" }}
      >
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#101828]">
          <TrendingUp className="size-5 text-[#9C27B0]" />
          能力雷达与 Gap 分析
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-green-800">
              <div className="flex size-6 items-center justify-center rounded-full bg-green-100">
                <Check className="size-3.5 text-green-600" />
              </div>
              核心优势契合点
            </h3>
            <ul className="space-y-3">
              {r.strengths.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm leading-[22px] text-green-800"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-green-600" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-800">
              <div className="flex size-6 items-center justify-center rounded-full bg-red-100">
                <X className="size-3.5 text-red-600" />
              </div>
              需警惕的核心短板
            </h3>
            <ul className="space-y-3">
              {r.weaknesses.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm leading-[22px] text-red-800"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-600" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 板块四：定制化面试突击题库 - 设计稿：黄色闪电、蓝色展开态、气泡图标 */}
      {r.interviewQuestions.length > 0 && (
        <div
          className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)]"
          style={{ boxShadow: "0px 4px 24px 0px rgba(0,0,0,0.04)" }}
        >
          <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-[#101828]">
            <Zap className="size-5 text-[#EAB308]" />
            定制化面试突击题库
          </h2>
          <p className="mb-6 text-sm text-[#6a7282]">
            AI 结合你的简历短板与岗位核心诉求，预测出最可能被问到的 3 道高频面试题。
          </p>
          <Accordion className="w-full">
            {r.interviewQuestions.map((q, i) => (
              <AccordionItem
                key={i}
                value={`q-${i}`}
                className="border border-blue-100 rounded-xl overflow-hidden mb-3 last:mb-0"
              >
                <AccordionTrigger className="flex items-start gap-3 px-5 py-5 text-left font-medium text-[#101828] bg-blue-50 hover:bg-blue-50 hover:no-underline [&[data-state=open]]:bg-blue-50">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded bg-[#155dfc]/20 text-xs font-semibold text-[#155dfc]">
                    Q{i + 1}
                  </span>
                  <span className="text-sm font-medium flex-1">{q.question}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex gap-3 rounded-b-xl bg-white px-5 pb-5 pt-2">
                    <MessageCircle className="mt-0.5 size-5 shrink-0 text-[#155dfc]" />
                    <div>
                      <p className="text-sm leading-[22px] text-[#101828]">
                        <span className="font-medium text-[#374151]">回答思路：</span>
                        {q.suggestion}
                      </p>
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
