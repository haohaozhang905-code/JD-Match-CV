"use client";

import { Check, X, ArrowLeft, ArrowRight, FileDown, Target, Sparkles, TrendingUp, Zap, MessageCircle, Brain, Building2, LineChart, ClipboardList, Target as TargetIcon, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MarkdownBold } from "@/components/MarkdownBold";
import { PipelineSteps } from "@/components/PipelineSteps";
import { useCountUp } from "@/hooks/useCountUp";
import type { AnalysisResult } from "@/types/analysis";

// --- UI Design System Constants ---
const UI = {
  // Spacing
  gap_module: "space-y-8",
  gap_section: "space-y-8",
  gap_inner: "space-y-4",
  p_card: "p-8",
  p_inner: "p-6",

  // Radius
  radius_card: "rounded-[24px]",
  radius_inner: "rounded-[16px]",
  radius_button: "rounded-[12px]",

  // Shadows
  shadow_card: "0px 1px 3px 0px rgba(0,0,0,0.08), 0px 1px 2px -1px rgba(0,0,0,0.08)",
  shadow_inner: "0px 1px 2px 0px rgba(0,0,0,0.05)",

  // Colors
  text_primary: "text-[#101828]",
  text_secondary: "text-[#4b5563]",
  text_muted: "text-[#6a7282]",
  accent_blue: "#155dfc",
  accent_bg: "bg-[#eff6ff]",
};

const cardClass = cn(
  UI.radius_card,
  "border border-[#e5e7eb] bg-white overflow-hidden",
  UI.p_card
);

const innerCardClass = cn(
  UI.radius_inner,
  "border border-[#f3f4f6] bg-white transition-all hover:border-[#e5e7eb]",
  UI.p_inner
);

const sectionIconClass = "size-5 text-[#155dfc]";

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
  thinkingText: "",
  pipelineSteps: [],
  marketInsights: { company: [], role: [], extra: [] },
  marketInsightSummary: { markdown: "", sources: [] },
  marketInsightSections: { company: [], role: [], process: [], prep: [] },
};

function getMatchLevel(score: number): string {
  if (score >= 90) return "极度吻合";
  if (score >= 80) return "高度匹配";
  if (score >= 70) return "较为匹配";
  if (score >= 60) return "基本匹配";
  return "需重点提升";
}

function splitSummarySection(item: string, fallbackTitle: string) {
  const match = item.match(/^\*\*(.*?)\*\*(?::|：)?\s*([\s\S]*)$/);
  return {
    title: (match ? match[1] : fallbackTitle).replace(/[:：]$/, ""),
    content: match ? match[2] : item,
  };
}

/**
 * 统一的大模块容器
 */
function ModuleContainer({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) {
  return (
    <div id={id} className={cn(cardClass, className)} style={{ boxShadow: UI.shadow_card }}>
      {children}
    </div>
  );
}

/**
 * 统一的模块标题组件
 */
function ModuleTitle({ icon, title, subtitle, extra }: { icon: React.ReactNode; title: string; subtitle?: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", UI.accent_bg)}>
          {icon}
        </div>
        <div>
          <h2 className={cn("text-[18px] font-bold tracking-tight", UI.text_primary)}>{title}</h2>
          {subtitle && <p className={cn("text-[13px]", UI.text_muted)}>{subtitle}</p>}
        </div>
      </div>
      {extra}
    </div>
  );
}

/**
 * 统一的二级板块标题
 */
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex size-7 items-center justify-center rounded-full bg-[#f8f9fc]">
        {icon}
      </div>
      <h3 className={cn("text-[16px] font-semibold", UI.text_primary)}>{title}</h3>
    </div>
  );
}

function ListDot() {
  return <span className="mt-2 size-2 shrink-0 rounded-full bg-[#93c5fd]" />;
}

export function ResultDashboard({ result, onBack }: ResultDashboardProps) {
  const r = { ...defaultResult, ...result };
  const animatedScore = useCountUp(r.matchScore, 1200);

  const handleExportPdf = () => window.print();

  const marketSections = r.marketInsightSections ?? {
    company: [],
    role: [],
    process: [],
    prep: [],
  };

  const companyItems = marketSections.company.map((item, index) => ({ ...splitSummarySection(item, "公司实时信号"), index }));
  const roleItems = marketSections.role.map((item, index) => ({ ...splitSummarySection(item, "岗位趋势与画像"), index }));
  const processItems = marketSections.process.map((item, index) => ({ ...splitSummarySection(item, "招聘流程与风格"), index }));
  const prepItems = marketSections.prep.map((item, index) => ({ ...splitSummarySection(item, "针对性准备策略"), index }));
  const rolePrimaryItems = roleItems.length % 2 === 1 ? roleItems.slice(0, -1) : roleItems;
  const roleTailItem = roleItems.length % 2 === 1 ? roleItems[roleItems.length - 1] : null;

  return (
    <div className={cn("mx-auto w-full max-w-4xl", UI.gap_module)}>
      {/* 顶部操作栏 */}
      <div className="flex h-10 items-center justify-between px-0 print:hidden">
        <Button variant="ghost" onClick={onBack} className="h-auto gap-2 px-0 text-[14px] font-medium text-[#6a7282] hover:bg-transparent hover:text-[#101828]">
          <ArrowLeft className="size-4" />
          重新分析
        </Button>
        <Button variant="outline" onClick={handleExportPdf} className={cn("h-10 gap-2 px-5 text-[14px] font-bold text-[#364153] shadow-sm hover:bg-gray-50", UI.radius_button)}>
          <FileDown className="size-4" />
          导出 PDF 报告
        </Button>
      </div>

      {r.thinkingText && (
        <ModuleContainer>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="reasoning" className="border-0">
              <AccordionTrigger className="flex w-full items-center justify-between px-0 py-0 hover:no-underline [&>svg]:hidden">
                <ModuleTitle
                  icon={<Brain className="size-5 text-[#155dfc]" />}
                  title="AI 深度推理过程"
                  subtitle="展开查看模型的完整推理链路"
                  extra={<ChevronDown className="size-5 text-[#9ca3af] transition-transform duration-200 group-data-[state=open]:rotate-180" />}
                />
              </AccordionTrigger>
              <AccordionContent className="max-h-[calc(100vh-200px)] overflow-y-auto pt-6 pr-4">
                {r.pipelineSteps && r.pipelineSteps.length > 0 && (
                  <div className="mb-6 border-b border-[#f3f4f6] pb-6">
                    <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-[#9ca3af]">执行步骤</p>
                    <PipelineSteps steps={r.pipelineSteps} compact={true} />
                  </div>
                )}
                <div className="text-[13px] leading-[1.6] text-[#374151]">
                  <div className="font-mono break-words [&_strong]:font-semibold [&_strong]:text-[#101828] [&_ul]:my-2 [&_ul]:list-inside [&_ul]:list-disc [&_ol]:my-2 [&_ol]:list-inside [&_ol]:list-decimal">
                    <ReactMarkdown
                      remarkPlugins={[remarkBreaks]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-[#111827]">{children}</strong>,
                        li: ({ children }) => <li className="my-0.5">{children}</li>
                      }}
                    >
                      {r.thinkingText}
                    </ReactMarkdown>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ModuleContainer>
      )}

      <ModuleContainer>
        <ModuleTitle icon={<Target className="size-5 text-[#155dfc]" />} title="综合匹配度" />
        <div className="flex flex-col items-center gap-10 md:flex-row md:items-center">
          <div className="relative size-44 shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="10" strokeDasharray={`${(animatedScore / 100) * 264} 264`} strokeLinecap="round" className="transition-all duration-[1200ms] ease-out" />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[44px] font-extrabold leading-none text-[#101828]">
                {animatedScore}
                <span className="ml-1 text-[18px] font-semibold text-[#6b7280]">%</span>
              </span>
              <span className="mt-1 text-[14px] font-bold text-[#22c55e] tracking-tight">{getMatchLevel(r.matchScore)}</span>
            </span>
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-[15px] font-medium leading-[1.75] text-[#4b5563]">
              <MarkdownBold text={r.matchSummary} />
            </p>
          </div>
        </div>
      </ModuleContainer>

      {r.marketInsightSummary?.markdown && (
        <ModuleContainer>
          <ModuleTitle
            icon={<LineChart className="size-5 text-[#155dfc]" />}
            title="实时市场洞察"
            extra={
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ecfdf3] px-3 py-1.5 text-[13px] font-bold text-[#0f9d58]">
                <span className="size-2 rounded-full bg-[#10b981]" />
                实时更新
              </span>
            }
          />

          <div className={UI.gap_section}>
            <section>
              <SectionTitle icon={<Building2 className="size-4 text-[#155dfc]" />} title="公司实时信号" />
              <div className="relative pl-4">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#f3f4f6]" />
                <div className="space-y-6">
                  {companyItems.length > 0 ? companyItems.map((item) => (
                    <div key={item.index} className="flex items-center gap-4">
                      <span className="size-1.5 shrink-0 rounded-full bg-[#93c5fd] ring-4 ring-white" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className={cn("text-[15px] font-semibold leading-snug", UI.text_primary)}>
                          {item.index + 1}. {item.title}
                        </p>
                        <div className={cn("text-[14px] leading-[1.7]", UI.text_secondary)}>
                          <MarkdownBold text={item.content} as="span" variant="gray" />
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="pl-1 text-[14px] text-[#6b7280]">暂无足够高相关信息</p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <SectionTitle icon={<LineChart className="size-4 text-[#155dfc]" />} title="岗位趋势与画像" />
              <div className="grid gap-4 md:grid-cols-2">
                {roleItems.length > 0 ? (
                  <>
                    {rolePrimaryItems.map((item) => (
                      <div key={item.index} className={innerCardClass} style={{ boxShadow: UI.shadow_inner }}>
                        <div className="mb-3 flex items-center gap-3">
                          <p className={cn("text-[15px] font-semibold leading-tight", UI.text_primary)}>{item.index + 1}. {item.title}</p>
                        </div>
                        <div className={cn("text-[14px] leading-[1.7]", UI.text_secondary)}>
                          <MarkdownBold text={item.content} as="span" variant="gray" />
                        </div>
                      </div>
                    ))}
                    {roleTailItem && (
                      <div className={cn(innerCardClass, "md:col-span-2")} style={{ boxShadow: UI.shadow_inner }}>
                        <div className="mb-3 flex items-center gap-3">
                          <p className={cn("text-[15px] font-semibold leading-tight", UI.text_primary)}>{roleTailItem.index + 1}. {roleTailItem.title}</p>
                        </div>
                        <div className={cn("text-[14px] leading-[1.7]", UI.text_secondary)}>
                          <MarkdownBold text={roleTailItem.content} as="span" variant="gray" />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#e5e7eb] px-4 py-8 text-center text-[14px] text-[#6b7280] md:col-span-2">暂无足够高相关信息</div>
                )}
              </div>
            </section>

            <section>
              <SectionTitle icon={<ClipboardList className="size-4 text-[#155dfc]" />} title="招聘流程与风格" />
              <div className="space-y-3">
                {processItems.length > 0 ? processItems.map((item) => (
                  <div key={item.index} className={innerCardClass} style={{ boxShadow: UI.shadow_inner }}>
                    <div className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className={cn("mb-1.5 text-[15px] font-semibold", UI.text_primary)}>{item.index + 1}. {item.title}</p>
                        <div className={cn("text-[14px] leading-[1.7]", UI.text_secondary)}>
                          <MarkdownBold text={item.content} as="span" variant="gray" />
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-[14px] text-[#6b7280]">暂无足够高相关信息</p>
                )}
              </div>
            </section>

            <section>
              <SectionTitle icon={<TargetIcon className="size-4 text-[#155dfc]" />} title="针对性准备策略" />
              <div className={cn("border border-[#fef3c7] bg-[#fffef5]", UI.radius_inner, UI.p_inner)} style={{ boxShadow: UI.shadow_inner }}>
                <div className="space-y-5">
                  {prepItems.length > 0 ? prepItems.map((item) => (
                    <div key={item.index} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={cn("mb-1.5 text-[15px] font-semibold", UI.text_primary)}>{item.index + 1}. {item.title}</p>
                        <div className={cn("text-[14px] leading-[1.7]", UI.text_secondary)}>
                          <MarkdownBold text={item.content} as="span" variant="amber" />
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[14px] text-[#6b7280]">暂无足够高相关信息</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {(r.marketInsightSummary.sources?.length ?? 0) > 0 && (
            <div className="mt-8 border-t border-[#f3f4f6] pt-2">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="sources" className="border-0">
                  <AccordionTrigger className="flex items-center gap-2 px-0 py-2 text-[12px] font-bold text-[#6a7282] hover:no-underline [&>svg]:size-3.5">
                    查看数据源
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="flex flex-col gap-2 pt-2">
                      {(r.marketInsightSummary.sources ?? []).map((s, i) => (
                        <li key={i} className="text-[12px] text-[#4b5563]">
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#155dfc] transition-colors hover:text-[#0047e1] hover:underline">
                            [{i + 1}] {s.title || s.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </ModuleContainer>
      )}

      {r.jdTranslations.length > 0 && (
        <ModuleContainer>
          <ModuleTitle icon={<Sparkles className="size-5 text-[#155dfc]" />} title="JD 黑话翻译器" />
          <div className="space-y-6">
            {r.jdTranslations.map((item, i) => (
              <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={cn(innerCardClass, "relative border-none bg-[#f9fafb] hover:bg-[#f3f4f6]")}>
                  <span className="absolute -top-2.5 left-5 rounded-md bg-[#e5e7eb] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#4b5563] shadow-sm">
                    JD 原文
                  </span>
                  <div className={cn("text-[14px] leading-[1.8] text-[#4b5563] italic")}>
                    &quot;<MarkdownBold text={item.original} />&quot;
                  </div>
                </div>
                <div className={cn(innerCardClass, "relative border-none bg-[#f0f7ff] hover:bg-[#e0efff]")}>
                  <span className="absolute -top-2.5 left-5 rounded-md bg-[#dbeafe] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#155dfc] shadow-sm">
                    潜台词
                  </span>
                  <div className={cn("text-[14px] font-bold leading-[1.8] text-[#1e293b]")}>
                    <MarkdownBold text={item.translation} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ModuleContainer>
      )}

      <ModuleContainer>
        <ModuleTitle icon={<TrendingUp className="size-5 text-[#155dfc]" />} title="能力雷达与 Gap 分析" />
        <div className="grid gap-6 md:grid-cols-2">
          {/* 优势契合点 */}
          <div className={cn("flex flex-col border border-[#dcfce7] bg-[#f0fdf4]/50", UI.radius_inner, UI.p_inner)}>
            <h3 className="mb-5 flex items-center gap-3 text-[16px] font-bold text-[#166534]">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
                <Check className="size-3.5 text-white stroke-[3.5]" />
              </div>
              核心优势契合点
            </h3>
            <ul className="space-y-4">
              {r.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] font-normal leading-[1.7] text-[#14532d]">
                  <span className="mt-0.5 w-5 shrink-0 text-[#22c55e]">{i + 1}.</span>
                  <MarkdownBold text={s} />
                </li>
              ))}
            </ul>
          </div>

          {/* 核心短板 */}
          <div className={cn("flex flex-col border border-[#fee2e2] bg-[#fef2f2]/50", UI.radius_inner, UI.p_inner)}>
            <h3 className="mb-5 flex items-center gap-3 text-[16px] font-bold text-[#991b1b]">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ef4444]">
                <X className="size-3.5 text-white stroke-[3.5]" />
              </div>
              需警惕的核心短板
            </h3>
            <ul className="space-y-4">
              {r.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] font-normal leading-[1.7] text-[#7f1d1d]">
                  <span className="mt-0.5 w-5 shrink-0 text-[#ef4444]">{i + 1}.</span>
                  <MarkdownBold text={w} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ModuleContainer>

      {r.interviewQuestions.length > 0 && (
        <ModuleContainer>
          <ModuleTitle
            icon={<Zap className="size-5 text-[#155dfc]" />}
            title="定制化面试突击题库"
            subtitle="根据简历短板与岗位核心诉求预测的 3 道高频题"
          />
          <Accordion type="single" collapsible className="w-full space-y-4">
            {r.interviewQuestions.map((q, i) => (
              <AccordionItem
                key={i}
                value={`q-${i}`}
                className={cn(
                  "border border-[#f3f4f6] transition-all duration-200",
                  "data-[state=open]:border-[#dbeafe] data-[state=open]:bg-[#f8fbff]/50 data-[state=open]:shadow-sm",
                  UI.radius_inner
                )}
              >
                <AccordionTrigger className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:no-underline [&>svg]:size-4 [&>svg]:text-[#9ca3af]">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-[12px] font-bold text-[#155dfc]">
                      Q{i + 1}
                    </span>
                    <span className={cn("text-[15px] font-bold leading-snug tracking-tight", UI.text_primary)}>
                      <MarkdownBold text={q.question} />
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-0">
                  <div className="mt-2 flex items-center gap-4 rounded-xl border border-[#f3f4f6] bg-white p-5 shadow-sm">
                    <MessageCircle className="size-5 shrink-0 text-[#155dfc]" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[14px] leading-[1.8]", UI.text_secondary)}>
                        <span className="font-bold text-[#101828]">回答思路：</span>
                        <MarkdownBold text={q.suggestion} />
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ModuleContainer>
      )}

      {/* 页脚区域 */}
      <footer className="pt-4 pb-12 text-center print:hidden">
        <p className="text-[13px] font-medium text-[#9ca3af]">
          © {new Date().getFullYear()} VibeMatch AI · 职场竞争力深度分析报告
        </p>
      </footer>
    </div>
  );
}
