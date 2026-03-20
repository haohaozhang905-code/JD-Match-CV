"use client";

import { useState, useEffect } from "react";
import { Key, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "jd-match-cv-api-key";
const THINKING_MODE_KEY = "jd-match-cv-thinking-mode";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function setStoredApiKey(key: string) {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(STORAGE_KEY, key);
  else localStorage.removeItem(STORAGE_KEY);
}

export function getStoredThinkingMode(): boolean {
  if (typeof window === "undefined") return true;
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
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
            阿里云百炼大模型平台
          </a>
          申请 API Key（北京）并填写即可使用，API Key 仅保存在本地，不会上传。
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
          <Button onClick={handleSave}>✓ 保存配置</Button>
        </div>
      </div>
    </div>
  );
}
