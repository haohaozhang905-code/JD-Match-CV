/**
 * 免费模式文件解析：PDF、Word、图片
 * 全部在浏览器端执行，无需云端 API
 */

const JD_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const RESUME_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const LIMITS = {
  jd: JD_MAX_SIZE,
  resume: RESUME_MAX_SIZE,
} as const;

export function validateFileSize(file: File, type: "jd" | "resume"): string | null {
  const max = type === "jd" ? JD_MAX_SIZE : RESUME_MAX_SIZE;
  const maxMB = type === "jd" ? 5 : 10;
  if (file.size > max) {
    return `文件大小超过 ${maxMB}MB 限制`;
  }
  return null;
}

export async function parsePdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const texts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    texts.push(pageText);
  }

  return texts.join("\n\n").trim();
}

export async function parseWord(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * 图片预处理：放大低分辨率图片以提升 OCR 准确度
 */
async function preprocessImageForOcr(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      // 若图片宽度小于 800px，放大至 2 倍以提升 OCR 效果
      const scale = img.width < 800 ? Math.min(2, 1600 / img.width) : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob || file),
        "image/png",
        0.95
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function parseImage(file: File): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const processed = await preprocessImageForOcr(file);
  const result = await Tesseract.recognize(processed, "chi_sim+eng", {
    logger: () => {},
  });
  return result.data.text.trim().replace(/\s+/g, " ");
}

export async function parseFile(
  file: File,
  type: "jd" | "resume"
): Promise<{ text: string; error?: string }> {
  const sizeError = validateFileSize(file, type);
  if (sizeError) return { text: "", error: sizeError };

  const ext = file.name.split(".").pop()?.toLowerCase();

  try {
    if (ext === "pdf") {
      const text = await parsePdf(file);
      return { text: text || "(未提取到文字)" };
    }
    if (["doc", "docx"].includes(ext || "")) {
      const text = await parseWord(file);
      return { text: text || "(未提取到文字)" };
    }
    if (["jpg", "jpeg", "png"].includes(ext || "")) {
      const text = await parseImage(file);
      return { text: text || "(未提取到文字)" };
    }
    return { text: "", error: "不支持的文件格式" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "解析失败";
    return { text: "", error: msg };
  }
}
