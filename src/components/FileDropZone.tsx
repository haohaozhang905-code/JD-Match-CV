"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { validateFileSize } from "@/lib/parse";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  accept: string;
  maxSizeLabel: string;
  type: "jd" | "resume";
  className?: string;
  children?: React.ReactNode;
}

export function FileDropZone({
  onFileSelect,
  selectedFile,
  accept,
  maxSizeLabel,
  type,
  className,
  children,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const sizeError = validateFileSize(file, type);
      if (sizeError) {
        setError(sizeError);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect, type]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  if (selectedFile) {
    return null;
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "relative flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        isDragging && "border-[#155dfc] bg-[#eff6ff]/50",
        !isDragging && "border-gray-200 bg-gray-50/50",
        className
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={onInputChange}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      {children || (
        <>
          <Upload className="mb-4 size-12 text-gray-400" />
          <p className="mb-1 text-sm font-medium text-[#101828]">
            点击或拖拽上传
          </p>
          <p className="text-xs text-[#6a7282]">{maxSizeLabel}</p>
        </>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export const JD_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
export const RESUME_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
