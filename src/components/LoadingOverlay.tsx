"use client";

import { useEffect } from "react";
import type { ProgressStep } from "@/types/progress";
import { PROGRESS_LABELS, PROGRESS_ORDER } from "@/types/progress";
import { Sparkles } from "lucide-react";

interface LoadingOverlayProps {
  isActive: boolean;
  step?: ProgressStep | null;
}

export function LoadingOverlay({ isActive, step }: LoadingOverlayProps) {
  const stepIndex = step ? PROGRESS_ORDER.indexOf(step) : 0;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F8F9FB]">
      <div className="flex flex-col items-center gap-8">
        {/* 中心：蓝色圆 + 白色 sparkle 图标，带柔和阴影 */}
        <div className="relative flex items-center justify-center">
          <div className="absolute size-32 rounded-full border border-[#E0E7FF]/60 animate-loading-pulse-1" />
          <div className="absolute size-24 rounded-full border border-[#C7D2FE]/50 animate-loading-pulse-2" />
          <div className="relative flex size-16 items-center justify-center rounded-full bg-[#3B82F6] shadow-[0_4px_14px_rgba(59,130,246,0.4)]">
            <Sparkles className="size-8 text-white" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xl font-bold text-[#1e293b]">
            {step ? PROGRESS_LABELS[step] : "处理中..."}
          </p>
          <p className="flex items-center justify-center gap-2 text-sm text-[#6a7282]">
            <span className="size-4 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#3B82F6]" />
            正在深度思考中...
          </p>
        </div>

        {/* 进度圆点 - 动态闪烁 */}
        <div className="flex gap-2.5">
          {PROGRESS_ORDER.map((_, i) => (
            <div
              key={i}
              className={`size-2.5 rounded-full animate-dot-blink ${
                i <= stepIndex ? "bg-[#3B82F6]" : "bg-gray-300"
              }`}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
