import { NextRequest, NextResponse } from "next/server";
import type { AnalysisResult } from "@/types/analysis";

/**
 * AI 匹配分析 API
 * 支持 OpenAI API 格式，需配置 OPENAI_API_KEY 环境变量
 * 若未配置，返回模拟数据用于开发
 */
export async function POST(request: NextRequest) {
  try {
    const { jd, resume } = await request.json();

    if (!jd || !resume) {
      return NextResponse.json(
        { error: "请提供 JD 和简历内容" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      // 调用真实 OpenAI API
      const result = await callOpenAI(apiKey, jd, resume);
      return NextResponse.json(result);
    }

    // 开发模式：返回模拟数据
    const mockResult: AnalysisResult = {
      matchScore: 78,
      matchSummary:
        "匹配度较高，您在技术栈和项目经验上与 JD 较为契合，建议重点准备系统架构设计和团队协作相关问题的回答。",
      jdTranslations: [
        {
          original: "具备良好的抗压能力",
          translation: "大概率要经常加班，需要能承受高强度工作节奏",
        },
        {
          original: "赋能业务增长",
          translation: "需要你能跨部门要资源、推项目，用数据驱动决策",
        },
      ],
      strengths: [
        "3 年以上 React/TypeScript 开发经验，与 JD 要求一致",
        "有大型 B 端系统架构设计经验",
        "熟悉微前端、模块化架构",
      ],
      weaknesses: [
        "缺乏团队管理经验，JD 要求有带团队经历",
        "对业务数据分析工具（如 Tableau）经验较少",
      ],
      interviewQuestions: [
        {
          question: "你如何设计一个可扩展的前端架构？",
          suggestion:
            "可从模块化、微前端、状态管理、构建优化等维度展开，结合你过往项目举例说明。",
        },
        {
          question: "你如何推动跨部门协作？",
          suggestion:
            "强调沟通能力、需求对齐、定期同步，可举一个实际案例说明如何协调产品、设计、后端完成一个复杂需求。",
        },
      ],
    };

    // 模拟处理延迟
    await new Promise((r) => setTimeout(r, 3000));

    return NextResponse.json(mockResult);
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: "分析失败，请稍后重试" },
      { status: 500 }
    );
  }
}

async function callOpenAI(
  apiKey: string,
  jd: string,
  resume: string
): Promise<AnalysisResult> {
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content) as AnalysisResult;
}
