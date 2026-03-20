"use client";

import { Fragment } from "react";

/**
 * 将文本中的 **加粗** 或 __加粗__ 渲染为 <strong>
 * 仅支持 Markdown 加粗语法，用于 AI 输出中的重点标注
 */
export function MarkdownBold({ text, as: Component = "span" }: { text: string; as?: "span" | "p" }) {
  if (!text) return null;

  const regex = /\*\*([\s\S]+?)\*\*|__([\s\S]+?)__/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>
      );
    }
    parts.push(
      <strong key={key++}>{match[1] ?? match[2]}</strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(<Fragment key={key}>{text.slice(lastIndex)}</Fragment>);
  }

  if (parts.length === 0) {
    return <Component>{text}</Component>;
  }

  return <Component>{parts}</Component>;
}
