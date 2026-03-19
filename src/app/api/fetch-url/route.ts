import { NextRequest, NextResponse } from "next/server";

/**
 * 抓取网页内容 API
 * 部分招聘平台有反爬机制，可能失败
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "请提供有效的 URL" },
        { status: 400 }
      );
    }

    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "仅支持 http/https 链接" },
        { status: 400 }
      );
    }

    const isZhipin = parsed.hostname.includes("zhipin.com");
    const headers: Record<string, string> = {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    };

    if (isZhipin) {
      headers["User-Agent"] =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
      headers["Referer"] = "https://m.zhipin.com/";
    } else {
      headers["User-Agent"] =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    }

    let fetchUrl = url;
    if (isZhipin && parsed.pathname.includes("/weijd-job/")) {
      const jobIdMatch = parsed.pathname.match(/weijd-job\/([a-zA-Z0-9]+)/);
      if (jobIdMatch) {
        fetchUrl = `https://www.zhipin.com/job_detail/${jobIdMatch[1]}.html`;
        headers["User-Agent"] =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        headers["Referer"] = "https://www.zhipin.com/";
      }
    }

    const res = await fetch(fetchUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `抓取失败: ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();

    let text = "";
    if (isZhipin) {
      text = extractZhipinJobContent(html) || extractTextFromHtml(html);
      if (!text || text.length < 50) {
        const blocked =
          html.includes("验证") ||
          html.includes("captcha") ||
          html.includes("访问异常") ||
          html.includes("zp_stoken");
        return NextResponse.json(
          {
            error: blocked
              ? "Boss直聘检测到异常访问，请复制职位描述后使用「粘贴文本」"
              : "未能从页面提取职位内容，请尝试复制后使用「粘贴文本」",
          },
          { status: 422 }
        );
      }
    } else {
      text = extractTextFromHtml(html);
    }

    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "抓取失败";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

function extractZhipinJobContent(html: string): string | null {
  const parts: string[] = [];

  const descMatch = html.match(/"desc"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (descMatch && descMatch[1].length > 30) {
    const raw = descMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    if (raw.trim().length > 30) parts.push(raw.trim());
  }

  const jobNameMatch = html.match(/"jobName"\s*:\s*"([^"]+)"/);
  const salaryMatch = html.match(/"salaryDesc"\s*:\s*"([^"]*)"/);
  const brandMatch = html.match(/"brandName"\s*:\s*"([^"]*)"/);
  if (jobNameMatch) parts.push(`职位：${jobNameMatch[1]}`);
  if (salaryMatch && salaryMatch[1]) parts.push(`薪资：${salaryMatch[1]}`);
  if (brandMatch && brandMatch[1]) parts.push(`公司：${brandMatch[1]}`);

  const stateMatch = html.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?\s*(?:<\/script>|window\.|$)/m);
  if (stateMatch && !parts.some((p) => p.length > 100)) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const jobDetail =
        state.jobDetail ||
        state.job?.jobDetail ||
        state.pageData?.jobDetail;
      if (jobDetail?.desc) parts.unshift(jobDetail.desc);
      if (jobDetail?.jobName && !jobNameMatch)
        parts.push(`职位：${jobDetail.jobName}`);
      if (jobDetail?.salaryDesc && !salaryMatch)
        parts.push(`薪资：${jobDetail.salaryDesc}`);
    } catch {
      // 忽略
    }
  }

  if (parts.length > 0) {
    return parts.join("\n\n");
  }
  return null;
}

function extractTextFromHtml(html: string): string {
  const scriptContent = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  if (scriptContent) {
    for (const script of scriptContent) {
      const inner = script.replace(/<\/?script[^>]*>/gi, "");
      const jsonMatch = inner.match(/"desc"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (jsonMatch && jsonMatch[1].length > 50) {
        try {
          const desc = JSON.parse(`"${jsonMatch[1]}"`);
          if (desc) return desc;
        } catch {
          const raw = jsonMatch[1]
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"');
          if (raw.length > 50) return raw;
        }
      }
    }
  }

  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
