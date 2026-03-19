"use client";

import { useEffect, useState } from "react";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (showPreview && isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, showPreview, isImage]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4",
        className
      )}
    >
      {showPreview && isImage && previewUrl ? (
        <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <img
            src={previewUrl}
            alt=""
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
          <FileText className="size-6 text-[#6a7282]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#101828]">
          {file.name}
        </p>
        <p className="text-xs text-[#6a7282]">{formatFileSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 rounded-lg p-2 text-[#6a7282] hover:bg-gray-200 hover:text-[#101828]"
        aria-label="删除文件"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
