import { NextRequest } from "next/server";

const QWEN_API = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

/**
 * 流式分析 API - 使用 Qwen 模型，支持流式输出
 */
export async function POST(request: NextRequest) {
  const { jd, resume, apiKey } = await request.json();

  if (!jd || !resume) {
    return new Response(
      JSON.stringify({ error: "请提供 JD 和简历内容" }),
      { status: 400 }
    );
  }

  if (!apiKey || typeof apiKey !== "string") {
    return new Response(
      JSON.stringify({ error: "请先配置 API Key" }),
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const systemPrompt = `你是一个专业的简历与 JD 匹配分析助手。请根据用户提供的 JD 和简历，输出结构化的 JSON 分析结果。

必须严格按以下 JSON 格式输出，不要包含其他文字：
{
  "matchScore": 0-100 的整数,
  "matchSummary": "一句话总结匹配度及建议",
  "jdTranslations": [
    { "original": "JD 原文摘录", "translation": "大白话翻译" }
  ],
  "strengths": ["核心优势1", "核心优势2", ...],
  "weaknesses": ["核心短板1", "核心短板2", ...],
  "interviewQuestions": [
    { "question": "面试题", "suggestion": "回答思路与建议话术" }
  ]
}

要求：
- jdTranslations 至少 2 条，选取 JD 中的招聘黑话进行翻译
- strengths 和 weaknesses 各 2-5 条
- interviewQuestions 3-5 道，针对短板设计
- 全部使用中文`;

  const userPrompt = `## 目标职位 JD\n\n${jd}\n\n## 我的简历\n\n${resume}`;

  try {
    const res = await fetch(QWEN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(
        JSON.stringify({ error: `API 调用失败: ${err}` }),
        { status: 502 }
      );
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ error: "无法读取响应流" }),
        { status: 500 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
          if (buffer) controller.enqueue(encoder.encode(buffer));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "分析失败";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
