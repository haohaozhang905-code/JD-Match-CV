"use client";

import Link from "next/link";
import { FileText, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onOpenApiKey?: () => void;
}

export function Header({ onOpenApiKey }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#eff6ff]">
            <FileText className="size-5 text-[#155dfc]" />
          </div>
          <span className="text-xl font-semibold text-[#101828]">
            VibeMatch AI
          </span>
        </Link>
        {onOpenApiKey && (
          <Button
            variant="outline"
            size="default"
            onClick={onOpenApiKey}
            className="gap-2"
          >
            <Key className="size-4" />
            API Key
          </Button>
        )}
      </div>
    </header>
  );
}
