import { NextRequest } from "next/server";

const QWEN_API = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const MAX_RETRIES = 3;
const MAX_FILE_PARSED_LENGTH = 40000; // 文件解析后最大 4 万字符
const MAX_TOTAL_LENGTH = 100000; // 总上下文最大 10 万字符（包含 system prompt）
const API_TIMEOUT_MS = 60000; // 60 秒超时
const RATE_LIMIT_WINDOW_MS = 60000; // 1 分钟窗口
const RATE_LIMIT_MAX_REQUESTS = 10; // 每分钟最多 10 次请求（自带 Key 用户）
const DEFAULT_TAVILY_MAX_RESULTS = 10;
const DEFAULT_TAVILY_SEARCH_DEPTH: "basic" | "advanced" = "basic";
const MAX_SEARCH_QUERIES_TOTAL = 6; // 防止并发/成本/上下文爆炸

// 简单的内存 Rate Limiter（生产环境建议用 Redis）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getDateRangeForSearch(): string {
  const now = new Date();
  const eighteenMonthsAgo = new Date(now);
  eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);

  const startYear = eighteenMonthsAgo.getFullYear();
  const endYear = now.getFullYear();

  if (startYear === endYear) {
    return String(startYear);
  }
  return `${startYear}-${endYear}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getRateLimitKey(request: NextRequest): string {
  // 优先使用 X-Forwarded-For，否则使用 IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
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

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function getTavilyMaxResults(): number {
  const raw = process.env.TAVILY_MAX_RESULTS;
  const parsed = raw ? Number(raw) : NaN;
  return clampInt(Number.isFinite(parsed) ? parsed : DEFAULT_TAVILY_MAX_RESULTS, 3, 20);
}

function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const key = (it.url || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

interface JdMeta {
  company: string;
  role: string;
  valid: boolean;
  invalidReason?: string;
}

/** 用轻量 Qwen 调用提取 JD 元信息，同时校验有效性 */
async function extractJdMeta(jd: string, apiKey: string): Promise<JdMeta> {
  const prompt = `判断以下内容是否为有效的招聘JD（职位描述）。
如果有效，提取公司名和岗位名；如果无效，说明原因。
只输出JSON，格式：{"valid":true,"company":"公司名","role":"岗位名"} 或 {"valid":false,"invalidReason":"原因"}
内容：${jd.slice(0, 3000)}`;

  try {
    const res = await fetch(QWEN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { company: "", role: "", valid: true }; // 提取失败不阻断主流程
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { company: "", role: "", valid: true };
    return { company: "", role: "", valid: true, ...JSON.parse(match[0]) };
  } catch {
    return { company: "", role: "", valid: true };
  }
}

/** Tavily 搜索，返回结构化结果（含 URL） */
async function tavilySearch(
  query: string,
  opts?: { maxResults?: number; searchDepth?: "basic" | "advanced" }
): Promise<{ results: Array<{ title: string; content: string; url: string }>; summary: string }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { results: [], summary: "" };
  try {
    const maxResults = clampInt(opts?.maxResults ?? getTavilyMaxResults(), 3, 20);
    const searchDepth = opts?.searchDepth ?? DEFAULT_TAVILY_SEARCH_DEPTH;
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults, search_depth: searchDepth }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { results: [], summary: "" };
    const data = await res.json();
    const results = (data.results ?? []).map((r: { title?: unknown; content?: unknown; url?: unknown }) => ({
      title: r.title ?? "",
      content: r.content ?? "",
      url: r.url ?? "",
    }));
    const summary = results
      .map((r: { title: string; content: string }) => `【${r.title}】${r.content}`)
      .join("\n")
      .slice(0, 2000);
    return { results, summary };
  } catch {
    return { results: [], summary: "" };
  }
}

type SearchItem = { title: string; content: string; url: string };

type SearchBundle = {
  companyResults: string;
  roleResults: string;
  combined: string;
  companyItems: SearchItem[];
  roleItems: SearchItem[];
  extraItems: SearchItem[];
  allItems: SearchItem[];
};

function dropObviouslyOffTopicLoose(items: SearchItem[]): SearchItem[] {
  const offTopicKeywords = ["彩票", "博彩", "小说", "下载", "破解", "网盘", "成人", "porn", "bet"];
  return items.filter((it) => {
    const hay = `${it.title}\n${it.content}`.toLowerCase();
    return !offTopicKeywords.some((k) => hay.includes(k));
  });
}

function buildSearchQueries(company: string, role: string): { companyQuery?: string; roleQuery?: string; extraQueries: string[] } {
  const dateRange = getDateRangeForSearch();
  const extraQueries: string[] = [];

  const companyQuery = company
    ? `${company} 公司 最新动态 业务进展 融资 裁员 组织调整 新闻 ${dateRange}`
    : undefined;

  const roleQuery = role
    ? `${role} 岗位 市场行情 薪资区间 技术要求 画像 ${dateRange}`
    : undefined;

  // 更"主观能动"的发散：能力、面试流程、文化/工作方式（但控制总数量）
  if (role) {
    extraQueries.push(`${role} 核心能力 模型题 高频面试题 面试流程 面试轮次 评估维度 ${dateRange}`);
    extraQueries.push(`${role} 能力要求 软技能 协作 沟通 推进 业务理解 ${dateRange}`);
  }
  if (company) {
    extraQueries.push(`${company} 工作氛围 文化 绩效 考核 加班 组织风格 口碑 ${dateRange}`);
    extraQueries.push(`${company} 招聘流程 面试轮次 评价 面经 ${dateRange}`);
  }
  if (company && role) {
    extraQueries.push(`${company} ${role} 面经 面试题 面试流程 评估标准 ${dateRange}`);
  }

  return {
    companyQuery,
    roleQuery,
    extraQueries: extraQueries.slice(0, MAX_SEARCH_QUERIES_TOTAL),
  };
}

/** 并行搜索公司动态 + 岗位行情 + 额外发散维度，返回结构化结果 */
async function buildSearchContext(company: string, role: string): Promise<SearchBundle> {
  if (!company && !role) {
    return { companyResults: "", roleResults: "", combined: "", companyItems: [], roleItems: [], extraItems: [], allItems: [] };
  }

  const { companyQuery, roleQuery, extraQueries } = buildSearchQueries(company, role);

  const tasks: Array<Promise<{ results: SearchItem[]; summary: string }>> = [];
  const taskKinds: Array<"company" | "role" | "extra"> = [];

  if (companyQuery) {
    tasks.push(tavilySearch(companyQuery));
    taskKinds.push("company");
  }
  if (roleQuery) {
    tasks.push(tavilySearch(roleQuery));
    taskKinds.push("role");
  }
  for (const q of extraQueries) {
    tasks.push(tavilySearch(q, { maxResults: Math.min(getTavilyMaxResults(), 8) }));
    taskKinds.push("extra");
  }

  const results = await Promise.all(tasks);

  let companyResults = "";
  let roleResults = "";
  let companyItems: SearchItem[] = [];
  let roleItems: SearchItem[] = [];
  let extraItems: SearchItem[] = [];

  results.forEach((r, idx) => {
    const kind = taskKinds[idx];
    if (kind === "company") {
      companyResults = r.summary ?? "";
      companyItems = r.results ?? [];
      return;
    }
    if (kind === "role") {
      roleResults = r.summary ?? "";
      roleItems = r.results ?? [];
      return;
    }
    extraItems = extraItems.concat(r.results ?? []);
  });

  companyItems = dedupeByUrl(companyItems);
  roleItems = dedupeByUrl(roleItems);
  extraItems = dedupeByUrl(extraItems);

  companyItems = dropObviouslyOffTopicLoose(companyItems);
  roleItems = dropObviouslyOffTopicLoose(roleItems);
  extraItems = dropObviouslyOffTopicLoose(extraItems);

  const allItems = dedupeByUrl([...companyItems, ...roleItems, ...extraItems]);

  const combinedSummary = [companyResults, roleResults].filter(Boolean).join("\n\n");
  const contextStr = combinedSummary
    ? `\n\n【实时搜索补充信息】\n## 公司动态\n${companyResults}\n\n## 岗位市场行情\n${roleResults}`
    : "";

  return { companyResults, roleResults, combined: contextStr, companyItems, roleItems, extraItems, allItems };
}

function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreSearchItem(input: { company?: string; role?: string }, item: SearchItem): number {
  const company = normalizeForMatch(input.company || "");
  const role = normalizeForMatch(input.role || "");
  const hay = normalizeForMatch(`${item.title}\n${item.content}`);

  let score = 0;
  if (company && hay.includes(company)) score += 3;
  if (role && hay.includes(role)) score += 3;

  const intentKeywords = ["招聘", "岗位", "面试", "薪资", "行情", "要求", "能力", "流程", "面经", "文化", "口碑", "绩效", "加班"];
  for (const k of intentKeywords) {
    if (hay.includes(k)) score += 1;
  }

  // 轻微惩罚明显跑偏的内容（避免"莫名其妙"来源）
  const offTopicKeywords = ["彩票", "博彩", "小说", "下载", "破解", "网盘", "成人", "porn", "bet"];
  for (const k of offTopicKeywords) {
    if (hay.includes(k)) score -= 6;
  }

  // 没有公司/岗位锚点时更严格
  if (!company && !role) return score;
  if (company && !hay.includes(company) && role && !hay.includes(role)) score -= 2;

  return score;
}

function filterRelevantItems(input: { company?: string; role?: string }, items: SearchItem[], maxKeep = 16): SearchItem[] {
  const scored = items
    .map((it) => ({ it, score: scoreSearchItem(input, it) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score);

  const kept = scored.slice(0, maxKeep).map((x) => x.it);
  return dedupeByUrl(kept);
}

async function summarizeMarketInsights(
  apiKey: string,
  input: { company?: string; role?: string; items: SearchItem[] }
): Promise<{ markdown: string; sources: Array<{ title: string; url: string }>; sections: { company: string[]; role: string[]; process: string[]; prep: string[] } }> {
  const items = filterRelevantItems({ company: input.company, role: input.role }, input.items, 16);
  if (!items.length) {
    const sections = {
      company: ["由于未识别到具体公司名称，已跳过定向搜索"],
      role: ["由于岗位关键词不明确，已跳过市场行情检索"],
      process: ["由于未识别到具体公司，无法获取其文化或面试流程信息"],
      prep: ["建议手动在 JD 中补充公司名和明确岗位名，以获取更精准的市场洞察"],
    };
    const markdown = [
      "### 公司信号",
      `- ${sections.company[0]}`,
      "",
      "### 岗位趋势与能力画像",
      `- ${sections.role[0]}`,
      "",
      "### 招聘流程与公司工作风格",
      `- ${sections.process[0]}`,
      "",
      "### 你的准备策略（可执行）",
      `- ${sections.prep[0]}`,
    ].join("\n");
    return { markdown, sources: [], sections };
  }

  const prompt = `你是一个资深招聘市场分析师，擅长从海量信息中提炼出对求职者最有价值的洞察。请基于以下【检索片段】生成一份"实时市场洞察"的深度分析报告，禁止长篇大论、冗余复述。要求：

【输出格式】
1) 仅输出标准JSON，无任何额外文字
2) JSON 结构必须为：
{
  "companySignals": ["..."],
  "roleTrends": ["..."],
  "processAndCulture": ["..."],
  "prepPlan": ["..."],
  "sources": [{"title":"...","url":"..."}]
}

【内容强制要求（每个维度分点作答，必须含加粗小标题+描述，严格遵循）】
1. companySignals（公司信号）：提炼公司最新动态，简洁分析其**战略意图、业务方向、组织变化**对该岗位的直接影响。每条必须以“**小标题**：描述”的形式呈现，例如：“**业务扩张**：近期在XX领域投入加大”。每条标注来源[1][2]。
2. roleTrends（岗位趋势）：聚焦该岗位**供需关系、技能要求演变、职业发展路径**。每条必须以“**小标题**：描述”的形式呈现。每条标注来源[1][2]。
3. processAndCulture（招聘与文化）：总结招聘流程特点、面试风格、公司文化特质、工作强度。每条必须以“**小标题**：描述”的形式呈现。每条标注来源[1][2]。
4. prepPlan（准备策略）：基于上述洞察，给出具体可执行的准备方法。每条必须以“**小标题**：描述”的形式呈现。每条标注来源[1][2]。
5. 补充要求：
   - 每一个数组维度必须包含 **3 到 6 条** 洞察，少于 3 条视为不合格。
   - 每一条必须以“**短标题**：简要说明”开头，标题必须使用双星号加粗。
   - 内容必须高度归纳，拒绝泛泛而谈，优先结合具体数字、项目或事件。
   - 核心词、数字、技术名词需用**加粗**强调。
   - 统一使用简体中文。
   - JSON严格使用标准英文双引号，保证可解析。

【质量铁律】
1. 优先选用最新、权威、具体的信息，拒绝泛泛而谈
2. sources必须匹配检索片段编号，最多16个
3. JSON严格使用标准英文双引号，保证可解析

【分析对象】
公司：${input.company || "未知"}
岗位：${input.role || "未知"}

【检索片段（按编号）】
${items
  .map((it, i) => {
    const title = (it.title || "").slice(0, 80);
    const content = (it.content || "").replace(/\s+/g, " ").slice(0, 280);
    const url = it.url || "";
    return `[${i + 1}] 标题：${title}
摘要：${content}
链接：${url}`;
  })
  .join("\n\n")}`;

  try {
    const res = await fetch(QWEN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 5000,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error("summarize_failed");
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    console.log("[MARKET] Qwen raw response:", text.slice(0, 500));
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("summarize_failed");
    const parsed = JSON.parse(match[0]) as {
      companySignals?: unknown;
      roleTrends?: unknown;
      processAndCulture?: unknown;
      prepPlan?: unknown;
      sources?: Array<{ title?: unknown; url?: unknown }>;
    };

    const toList = (v: unknown): string[] => {
      if (!Array.isArray(v)) return [];
      return v.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 6);
    };

    const companySignals = toList(parsed.companySignals);
    const roleTrends = toList(parsed.roleTrends);
    const processAndCulture = toList(parsed.processAndCulture);
    const prepPlan = toList(parsed.prepPlan);
    const sections = {
      company: companySignals.length ? companySignals : ["暂无足够高相关信息"],
      role: roleTrends.length ? roleTrends : ["暂无足够高相关信息"],
      process: processAndCulture.length ? processAndCulture : ["暂无足够高相关信息"],
      prep: prepPlan.length ? prepPlan : ["建议补充更明确的公司名与岗位名，以提升检索相关性"],
    };

    const parsedSources = (parsed.sources ?? [])
      .map((s) => ({
        title: String(s.title ?? "").trim() || "未命名来源",
        url: String(s.url ?? "").trim(),
      }))
      .filter((s) => s.url)
      .slice(0, 16);

    const sources = dedupeByUrl(parsedSources);
    const markdown = [
      "### 公司信号",
      ...(sections.company.length ? sections.company.map((x, i) => `${i + 1}. ${x}`) : ["- 暂无足够高相关信息"]),
      "",
      "### 岗位趋势与能力画像",
      ...(sections.role.length ? sections.role.map((x, i) => `${i + 1}. ${x}`) : ["- 暂无足够高相关信息"]),
      "",
      "### 招聘流程与公司工作风格",
      ...(sections.process.length ? sections.process.map((x, i) => `${i + 1}. ${x}`) : ["- 暂无足够高相关信息"]),
      "",
      "### 你的准备策略（可执行）",
      ...(sections.prep.length ? sections.prep.map((x, i) => `${i + 1}. ${x}`) : ["- 暂无足够高相关信息"]),
    ].join("\n");

    return { markdown: markdown.trim(), sources, sections };
  } catch (err) {
    console.error("[MARKET] summarizeMarketInsights failed:", err);
    const fallbackSources = dedupeByUrl(
      items
        .slice(0, 6)
        .map((it) => ({ title: (it.title || "").trim() || "未命名来源", url: (it.url || "").trim() }))
        .filter((s) => s.url)
    );

    const company = (input.company || "").trim();
    const role = (input.role || "").trim();
    const topTitles = items
      .slice(0, 4)
      .map((it, idx) => `- 线索${idx + 1}：${(it.title || "未命名来源").slice(0, 60)}（参考[${idx + 1}]）`);

    const sections = {
      company: company ? [
        `关键聚焦：${company}近期业务线/组织层面的变化信号（参考[1][2]）`,
        ...topTitles.slice(0, 2).map((x) => x.replace(/^-\s?/, "")),
      ] : ["未识别到具体公司名称，已跳过定向公司分析"],
      role: role ? [
        `建议把${role}在 JD 中的硬技能/业务场景拆成清单（参考[3][4]）`,
      ] : ["岗位关键词不明确，已跳过市场行情洞察"],
      process: company ? [
        `对${company}的面试流程/文化信息采纳共识点（参考[5][6]）`,
      ] : ["未识别到公司，无法获取其特有的招聘流程信息"],
      prep: [
        "把 JD 拆成：硬技能、项目/业务场景、指标与产出、协作与推进四块准备案例",
        "额外准备：高频追问的一句话结论 + 证据链",
      ],
    };

    const markdown = [
      "### 公司信号",
      ...sections.company.map((x, i) => `${i + 1}. ${x}`),
      "",
      "### 岗位趋势与能力画像",
      ...sections.role.map((x, i) => `${i + 1}. ${x}`),
      "",
      "### 招聘流程与公司工作风格",
      ...sections.process.map((x, i) => `${i + 1}. ${x}`),
      "",
      "### 你的准备策略（可执行）",
      ...sections.prep.map((x, i) => `${i + 1}. ${x}`),
    ].join("\n");

    return { markdown, sources: fallbackSources, sections };
  }
}
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

  console.log("[API] Received enableThinking:", enableThinking, "type:", typeof enableThinking);

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

  // 优先用用户自带 Key，否则 fallback 到环境变量（免费模式）
  const resolvedApiKey = (apiKey && typeof apiKey === "string") ? apiKey : process.env.QWEN_API_KEY;
  const isFreeMode = !apiKey || typeof apiKey !== "string";
  void isFreeMode;

  if (!resolvedApiKey) {
    return new Response(
      JSON.stringify({ error: "请先配置 API Key" }),
      { status: 400 }
    );
  }

  // 免费模式限制已关闭（测试阶段）
  // if (isFreeMode) {
  //   const { allowed, remaining } = checkFreeDailyLimit(rateLimitKey);
  //   if (!allowed) {
  //     return new Response(
  //       JSON.stringify({ error: "今日免费次数已用完（每IP每天5次），请配置自己的 API Key 继续使用" }),
  //       { status: 429 }
  //     );
  //   }
  //   // remaining 可在响应头中透出，供前端展示
  //   void remaining;
  // }

  // 前置：提取 JD 元信息（校验有效性 + 公司名/岗位名）
  const jdMeta = await extractJdMeta(jd, resolvedApiKey);
  if (!jdMeta.valid) {
    return new Response(
      JSON.stringify({ error: `JD 内容无效：${jdMeta.invalidReason || "请粘贴完整的招聘职位描述"}` }),
      { status: 400 }
    );
  }

  // 前置：搜索公司动态 + 薪资行情（有 Tavily Key 时执行，失败不阻断）
  console.log("[SEARCH] Starting search for company:", jdMeta.company, "role:", jdMeta.role);
  const searchData = await buildSearchContext(jdMeta.company, jdMeta.role);
  const searchContext = searchData.combined;
  console.log("[SEARCH] Result - companyResults:", searchData.companyResults.length, "roleResults:", searchData.roleResults.length);

  // 并行启动市场洞察归纳（不阻塞主流程）
  const marketInsightPromise = summarizeMarketInsights(resolvedApiKey, {
    company: jdMeta.company,
    role: jdMeta.role,
    items: searchData.allItems,
  });

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
3. 符号红线：为保证JSON解析不报错，JSON的Key和Value外层使用标准英文双引号 "。但在Value的文本内容中，绝对禁止使用任何中英文的双引号（" 或 " "）和单引号（' 或 ' '），遇到需要引用的地方，强制全部替换为直角引号「」。
4. 强调规则：Value文本内部允许且鼓励使用Markdown加粗语法来突出重点。

【实时搜索信息强制引用规则】
如果用户消息末尾包含【实时搜索补充信息】，你必须：
1. 在 matchSummary 中明确引用公司最新动态（如：「根据最新数据，该公司...」）
2. 在 weaknesses 中至少一条引用岗位市场行情（如：「市场调研显示该岗位普遍要求 X 技能，而你...」）
3. 在 strengths 中若有相关数据也要引用（如：「该公司近期融资，业务扩张阶段对 X 背景需求旺盛」）
4. 禁止完全忽略搜索数据，必须让搜索信息成为评估的有机部分

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

  const userPrompt = `## 目标职位 JD\n\n${jd}\n\n## 我的简历\n\n${resume}${searchContext}`;

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

  console.log("[API] Final requestBody.enable_thinking:", requestBody.enable_thinking);

  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const res = await fetch(QWEN_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resolvedApiKey}`,
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
              // 返回中间步骤：JD元信息提取
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: "step", step: "extracting_jd_meta", data: { company: jdMeta.company, role: jdMeta.role, valid: jdMeta.valid } }) + "\n")
              );

              // 返回中间步骤：搜索结果
              if (searchData.companyResults) {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: "step", step: "searching_company", data: { results: searchData.companyResults, items: searchData.companyItems } }) + "\n")
                );
              }
              if (searchData.roleResults) {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: "step", step: "searching_role", data: { results: searchData.roleResults, items: searchData.roleItems } }) + "\n")
                );
              }
              if (searchData.extraItems.length > 0) {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: "step", step: "searching_extra", data: { items: searchData.extraItems } }) + "\n")
                );
              }

              // 返回中间步骤：上下文构建完成
              if (searchData.combined) {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: "step", step: "building_context", data: { contextLength: searchData.combined.length } }) + "\n")
                );
              }

              // 并行：主流式读取 + 等待市场洞察
              let marketInsightResolved: { markdown: string; sources: Array<{ title: string; url: string }> } | null = null;
              marketInsightPromise.then((r) => { marketInsightResolved = r; }).catch(() => {});

              // 处理大模型流式输出
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

              // 主流结束后，等待市场洞察并推送
              const marketInsight = marketInsightResolved ?? await marketInsightPromise;
              if (marketInsight.markdown) {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: "step", step: "summarizing_market", data: marketInsight }) + "\n")
                );
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

      void (await res.text());
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
