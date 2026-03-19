"use client";

import { useState, useEffect } from "react";
import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "jd-match-cv-api-key";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function setStoredApiKey(key: string) {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(STORAGE_KEY, key);
  else localStorage.removeItem(STORAGE_KEY);
}

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (key: string) => void;
}

export function ApiKeyDialog({ open, onOpenChange, onSave }: ApiKeyDialogProps) {
  const [key, setKey] = useState("");

  useEffect(() => {
    if (open) setKey(getStoredApiKey());
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
          前往阿里云百炼大模型平台申请
          <a
            href="https://bailian.console.aliyun.com/cn-beijing?tab=api#/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#155dfc] hover:underline"
          >
            API Key（北京）
          </a>
          即可使用，API Key 保存在本地，不会上传。
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-..."
          className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
