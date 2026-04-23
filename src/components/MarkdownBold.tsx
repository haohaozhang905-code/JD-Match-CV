"use client";

import { Fragment } from "react";

export type MarkdownBoldVariant = "blue" | "purple" | "gray" | "amber" | "green" | "red";

function isNumericHighlight(text: string) {
  return /^(?:\d+(?:\.\d+)?%?|\d+(?:\.\d+)?[人项个]|\d+[万千百]?)$/.test(text);
}

export function MarkdownBold({
  text,
  as: Component = "span",
  variant = "blue"
}: {
  text: string;
  as?: "span" | "p";
  variant?: MarkdownBoldVariant;
}) {
  if (!text) return null;

  const variants = {
    blue: "text-[#2563eb]",
    purple: "bg-[#f5f0ff] text-[#7c3aed]",
    gray: "text-[#4b5563]",
    amber: "text-[#b45309]",
    green: "text-[#047857]",
    red: "text-[#b91c1c]",
  };

  const regex = /\*\*([\s\S]+?)\*\*|__([\s\S]+?)__/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    const content = match[1] ?? match[2];
    const highlighted = variant === "purple" && isNumericHighlight(content);

    parts.push(
      <strong
        key={key++}
        className={highlighted ? `rounded-[4px] px-1 py-0.5 font-semibold ${variants[variant]}` : "font-semibold"}
      >
        {content}
      </strong>
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
