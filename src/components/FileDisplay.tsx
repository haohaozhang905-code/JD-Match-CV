"use client";

import { useEffect, useMemo } from "react";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDisplayProps {
  file: File;
  onRemove: () => void;
  className?: string;
  showPreview?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDisplay({
  file,
  onRemove,
  className,
  showPreview = false,
}: FileDisplayProps) {
  const isImage = ["image/jpeg", "image/png", "image/jpg"].includes(file.type);
  const previewUrl = useMemo(() => {
    if (!showPreview || !isImage) return null;
    return URL.createObjectURL(file);
  }, [file, showPreview, isImage]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[12px] border border-[#e5e7eb] bg-white p-4",
        className
      )}
    >
      {showPreview && isImage && previewUrl ? (
        <div className="size-12 shrink-0 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white">
          <img src={previewUrl} alt="" className="size-full object-cover" />
        </div>
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-[#e5e7eb] bg-[#f8fafc]">
          <FileText className="size-6 text-[#6a7282]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#101828]">{file.name}</p>
        <p className="text-xs text-[#6a7282]">{formatFileSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 rounded-lg p-2 text-[#6a7282] hover:bg-gray-100 hover:text-[#101828]"
        aria-label="删除文件"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
