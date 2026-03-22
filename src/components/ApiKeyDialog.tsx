"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

const t = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } as const;

const STORAGE_KEY = "jd-match-cv-api-key";
const THINKING_MODE_KEY = "jd-match-cv-thinking-mode";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  // 优先使用 sessionStorage（更安全），关闭浏览器后自动清除
  return sessionStorage.getItem(STORAGE_KEY) || "";
}

export function setStoredApiKey(key: string) {
  if (typeof window === "undefined") return;
  if (key) sessionStorage.setItem(STORAGE_KEY, key);
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function getStoredThinkingMode(): boolean {
  if (typeof window === "undefined") return true;
  // 思考模式使用 localStorage，因为不是敏感信息
  const stored = localStorage.getItem(THINKING_MODE_KEY);
  return stored === null ? true : stored === "true";
}

export function setStoredThinkingMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THINKING_MODE_KEY, enabled ? "true" : "false");
}

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (key: string) => void;
}

export function ApiKeyDialog({ open, onOpenChange, onSave }: ApiKeyDialogProps) {
  const [key, setKey] = useState("");
  const [enableThinking, setEnableThinking] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(getStoredApiKey());
      setEnableThinking(getStoredThinkingMode());
    }
  }, [open]);

  const handleSave = () => {
    const trimmed = key.trim();
    setStoredApiKey(trimmed);
    onSave(trimmed);
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="apikey-backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={t}
          style={{
            backgroundColor: "rgba(248, 250, 252, 0.6)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
          }}
        >
          <motion.div
            key="apikey-modal"
            className="w-full max-w-md rounded-2xl p-6"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={t}
            style={{
              backdropFilter: "blur(24px) saturate(150%)",
              backgroundColor: "rgba(255, 255, 255, 0.72)",
              border: "1px solid rgba(255, 255, 255, 0.9)",
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.1), 0 24px 48px rgba(0,0,0,0.08)",
            }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Key className="size-5 text-[#155dfc]" />
              <h2 className="text-lg font-semibold text-[#101828]">配置 API Key</h2>
            </div>
            <p className="mb-4 text-sm text-[#6a7282]">
              前往
              <a
                href="https://bailian.console.aliyun.com/cn-beijing?tab=api#/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#155dfc] hover:underline"
              >
                「阿里云百炼大模型平台」
              </a>
              申请 <strong className="font-semibold text-[#101828]">「API Key（北京）」</strong> 并填写即可使用。
              <br />
              <span className="text-xs text-[#9ca3af]">注：API Key 仅保存在当前浏览器会话中，关闭浏览器后自动清除。</span>
            </p>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
              className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
            <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Brain className="size-5 shrink-0 text-[#9C27B0]" />
                <div>
                  <p className="text-sm font-semibold text-[#101828]">深度思考模式</p>
                  <p className="text-xs text-[#6a7282]">开启后，大模型将进行更复杂的逻辑推理，耗时可能增加，但匹配评估结果更精准。</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enableThinking}
                onClick={() => {
                  const next = !enableThinking;
                  setStoredThinkingMode(next);
                  setEnableThinking(next);
                }}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  enableThinking ? "bg-[#155dfc]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    enableThinking ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>保存配置</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
