import { NextRequest } from "next/server";

const QWEN_API = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const MAX_RETRIES = 3;
const MAX_INPUT_LENGTH = 10000; // 单个输入（JD 或简历）最大 1 万字符
const MAX_FILE_PARSED_LENGTH = 40000; // 文件解析后最大 4 万字符
const MAX_TOTAL_LENGTH = 100000; // 总上下文最大 10 万字符（包含 system prompt）
const API_TIMEOUT_MS = 60000; // 60 秒超时
const RATE_LIMIT_WINDOW_MS = 60000; // 1 分钟窗口
const RATE_LIMIT_MAX_REQUESTS = 10; // 每分钟最多 10 次请求

// 简单的内存 Rate Limiter（生产环境建议用 Redis）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getRateLimitKey(request: NextRequest): string {
  // 优先使用 X-Forwarded-For，否则使用 IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.ip || "unknown";
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

// 定期清理过期的 rate limit 记录
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

/**
 * 流式分析 API - 使用 Qwen 模型，支持流式输出
 * 大模型调用失败时最多重试 3 次
 */
export async function POST(request: NextRequest) {
  // Rate Limiting 检查
  const rateLimitKey = getRateLimitKey(request);
  const { allowed, retryAfter } = checkRateLimit(rateLimitKey);

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter || 60),
        }
      }
    );
  }

  let body: { jd?: string; resume?: string; apiKey?: string; enableThinking?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "请求体格式错误，请检查输入" }),
      { status: 400 }
    );
  }
  const { jd, resume, apiKey, enableThinking } = body;

  if (!jd || !resume) {
    return new Response(
      JSON.stringify({ error: "请提供 JD 和简历内容" }),
      { status: 400 }
    );
  }

  // 输入长度限制
  if (typeof jd !== "string" || typeof resume !== "string") {
    return new Response(
      JSON.stringify({ error: "输入格式错误" }),
      { status: 400 }
    );
  }

  if (jd.length > MAX_FILE_PARSED_LENGTH) {
    return new Response(
      JSON.stringify({ error: `JD 内容过长（${jd.length} 字符），最多支持 ${MAX_FILE_PARSED_LENGTH} 字符` }),
      { status: 400 }
    );
  }

  if (resume.length > MAX_FILE_PARSED_LENGTH) {
    return new Response(
      JSON.stringify({ error: `简历内容过长（${resume.length} 字符），最多支持 ${MAX_FILE_PARSED_LENGTH} 字符` }),
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

  const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" });

  const systemPrompt = `【当前日期】今天是 ${today}，你必须以此为准判断候选人的经历是否真实，不得以「未来时间」为由质疑任何不晚于今天的经历。

【角色设定】
你是一名拥有10年大厂经验的顶级资深业务线面试官。你的风格是：极其毒舌、一针见血、心狠手辣、拒绝任何职场鸡汤和废话。你审视候选人就像在拿着放大镜挑刺，能瞬间扒掉候选人简历上的虚假包装，也能一眼看穿JD（职位描述）背后的真实资本家潜台词。

【任务目标】
深度对比候选人「简历」与「目标职位JD」，产出一份极其专业、残酷、直戳痛点的评估报告。

【最高约束规则】（违背任何一条将导致系统崩溃，你必须绝对服从）
1. 语言红线：全程必须100%使用简体中文思考和回复，禁止任何英文单词（除非JD和简历原有的专有名词）。
2. 格式红线：必须且只能输出一个合法的JSON对象。绝对禁止包含任何Markdown代码块标记、前置问候语、后置解释说明。
3. 符号红线：为保证JSON解析不报错，JSON的Key和Value外层使用标准英文双引号 "。但在Value的文本内容中，绝对禁止使用任何中英文的双引号（" 或 “ ”）和单引号（' 或 ‘ ’），遇到需要引用的地方，强制全部替换为直角引号「」。
4. 强调规则：Value文本内部允许且鼓励使用Markdown加粗语法来突出重点。

【评估与打分准则】
打分极其严苛：核心硬性技能匹配度（60%权重）、业务场景经验匹配度（30%权重）、软素质潜台词（10%权重）。如果缺失JD核心要求，直接打不及格，绝不和稀泥。

【强制输出结构】（必须严格遵守此JSON Schema，不要增减Key）
{
  "matchScore": "在这里输出0-100的整数，评分要残忍客观",
  "matchSummary": "一针见血的总体评价。要求语气毒舌犀利，一刀致命。例如：「核心硬技能高度匹配，但缺乏主导大型项目的落地经验，大概率是个只会写PPT的螺丝钉，面试需重点防守履历单薄的质疑。」",
  "jdTranslations": [
    {
      "original": "提取JD中那些看似高大上或模糊的招聘黑话",
      "translation": "翻译成极其真实、接地气的大白话和企业真实的用人潜台词（如「抗压能力强」=「常态化无偿加班，PUA高发区，准备好速效救心丸」）"
    }
  ],
  "strengths": [
    "说明简历中哪一项具体经历完美命中了JD的哪一条核心要求，用词要专业，别吹捧，客观说明即可。"
  ],
  "weaknesses": [
    "毫不留情地扒皮。指出简历中缺失了JD要求的哪些核心能力，哪些经历与JD存在错配，或者哪些数据看起来像在注水。"
  ],
  "interviewQuestions": [
    {
      "question": "针对weaknesses列表中的致命短板，设计具有极强压迫感的真实面试场景题或连环追问，要求直戳死穴。",
      "suggestion": "提供高情商的「求生策略」。采用STAR法则（情境、任务、行动、结果）给出具体、能扬长避短的话术框架，教候选人如何体面地把坑填上。"
    }
  ]
}

【数量限制】
- jdTranslations：不限
- strengths：不限
- weaknesses：不限
- interviewQuestions：不限（必须极具针对性和实战价值）
- 语言：全部使用简体中文`;

  const userPrompt = `## 目标职位 JD\n\n${jd}\n\n## 我的简历\n\n${resume}`;

  // 检查总长度（system prompt + user prompt）
  const totalLength = systemPrompt.length + userPrompt.length;
  if (totalLength > MAX_TOTAL_LENGTH) {
    return new Response(
      JSON.stringify({ error: `总内容过长（${totalLength} 字符），请精简后重试` }),
      { status: 400 }
    );
  }

  const requestBody = {
    model: "qwen-plus",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: true,
    temperature: 0.3,
    enable_search: true, // 联网搜索：模型可根据需要获取实时信息
    ...(enableThinking === true && { enable_thinking: true }),
  };

  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const res = await fetch(QWEN_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const reader = res.body?.getReader();
        if (!reader) {
          lastError = "无法读取响应流";
          if (attempt < MAX_RETRIES) {
            await sleep(1000 * (attempt + 1));
            continue;
          }
          return new Response(
            JSON.stringify({ error: lastError }),
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
                      const delta = parsed.choices?.[0]?.delta;
                      if (!delta) continue;
                      if (enableThinking && delta.reasoning_content) {
                        controller.enqueue(
                          encoder.encode(JSON.stringify({ type: "reasoning", content: delta.reasoning_content }) + "\n")
                        );
                      }
                      if (delta.content) {
                        controller.enqueue(
                          encoder.encode(JSON.stringify({ type: "content", content: delta.content }) + "\n")
                        );
                      }
                    } catch {
                      // 忽略解析错误
                    }
                  }
                }
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      const err = await res.text();
      lastError = "API 调用失败，请检查 API Key 或稍后重试";
      const isRetryable = res.status >= 500 || res.status === 429;
      if (!isRetryable || attempt >= MAX_RETRIES) {
        return new Response(
          JSON.stringify({ error: lastError }),
          { status: res.status >= 500 ? 502 : res.status }
        );
      }
      await sleep(1000 * (attempt + 1));
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        lastError = "请求超时，请稍后重试";
      } else {
        lastError = "分析失败，请稍后重试";
      }
      if (attempt >= MAX_RETRIES) {
        return new Response(
          JSON.stringify({ error: lastError }),
          { status: 500 }
        );
      }
      await sleep(1000 * (attempt + 1));
    }
  }

  return new Response(
    JSON.stringify({ error: "分析失败，请稍后重试" }),
    { status: 500 }
  );
}
