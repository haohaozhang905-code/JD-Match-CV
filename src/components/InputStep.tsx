"use client";

import { useState } from "react";
import { FileText, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileDropZone, JD_ACCEPT, RESUME_ACCEPT } from "@/components/FileDropZone";
import { FileDisplay } from "@/components/FileDisplay";
import { cn } from "@/lib/utils";
import { parseFile } from "@/lib/parse";

type JdInputMode = "paste" | "upload";
type ResumeInputMode = "paste" | "upload";

interface InputStepProps {
  onAnalyze: (getData: () => Promise<{ jd: string; resume: string }>) => void;
  isLoading: boolean;
  onProgressStep?: (step: import("@/types/progress").ProgressStep | null) => void;
}

export function InputStep({ onAnalyze, isLoading, onProgressStep }: InputStepProps) {
  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdMode, setJdMode] = useState<JdInputMode>("paste");
  const [resumeMode, setResumeMode] = useState<ResumeInputMode>("upload");

  const hasJd = jdText.trim().length > 0 || jdFile !== null;
  const hasResume = resumeText.trim().length > 0 || resumeFile !== null;
  const canAnalyze = hasJd && hasResume;

  const handleAnalyzeClick = () => {
    const getData = async (): Promise<{ jd: string; resume: string }> => {
      let jd = jdText.trim();
      if (jdFile) {
        onProgressStep?.("parsing_jd");
        const { text, error } = await parseFile(jdFile, "jd");
        if (error) throw new Error(`JD解析失败: ${error}`);
        jd = text;
      }

      let resume = resumeText.trim();
      if (resumeFile) {
        onProgressStep?.("parsing_resume");
        const { text, error } = await parseFile(resumeFile, "resume");
        if (error) throw new Error(`简历解析失败: ${error}`);
        resume = text;
      }

      return { jd, resume };
    };
    onAnalyze(getData);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {/* 标题区 */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-[#101828]">
          AI简历评估与JD拆解助手
        </h1>
        <p className="text-lg text-[#6a7282]">
          消除招聘信息差，精准量化你的竞争力，获取定制化面试突击指南。
        </p>
      </div>

      {/* 双输入区 */}
      <div className="grid gap-8 md:grid-cols-2 md:items-stretch">
        {/* 左侧：目标职位JD */}
        <div className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#eff6ff]">
              <span className="text-sm font-semibold text-[#155dfc]">1</span>
            </div>
            <h2 className="text-xl font-medium text-[#101828]">目标职位JD</h2>
          </div>

          <div className="mb-4 flex h-10 w-full gap-1 rounded-xl bg-gray-100/80 p-1">
            <button
              type="button"
              onClick={() => setJdMode("paste")}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
                jdMode === "paste" ? "bg-white shadow-sm text-[#101828]" : "text-[#6a7282] hover:text-[#101828]"
              )}
            >
              <FileText className="size-4" />
              粘贴文本
            </button>
            <button
              type="button"
              onClick={() => setJdMode("upload")}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
                jdMode === "upload" ? "bg-white shadow-sm text-[#101828]" : "text-[#6a7282] hover:text-[#101828]"
              )}
            >
              <Upload className="size-4" />
              上传文件
            </button>
          </div>

          {jdMode === "paste" ? (
            <div className="flex h-[250px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-[#155dfc] focus-within:ring-2 focus-within:ring-[#155dfc]/30 focus-within:ring-offset-0">
              <Textarea
                placeholder="在此粘贴 Boss直聘、猎聘 等平台的职位描述详情..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="h-full min-h-0 resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-sm placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          ) : (
            <div className="flex h-[250px] flex-shrink-0 flex-col">
              {jdFile ? (
                <FileDisplay
                  file={jdFile}
                  onRemove={() => setJdFile(null)}
                  showPreview={["image/jpeg", "image/png", "image/jpg"].includes(jdFile.type)}
                />
              ) : (
                <FileDropZone
                  type="jd"
                  accept={JD_ACCEPT}
                  maxSizeLabel="支持 Word / PDF / 图片，大小不超过 5MB"
                  selectedFile={jdFile}
                  onFileSelect={setJdFile}
                  className="h-full min-h-0"
                >
                  <Upload className="mb-4 size-12 text-gray-400" />
                  <p className="mb-1 text-sm font-medium text-[#101828]">
                    点击或拖拽上传文件
                  </p>
                  <p className="text-xs text-[#6a7282]">支持 Word / PDF / 图片，大小不超过 5MB</p>
                </FileDropZone>
              )}
            </div>
          )}
        </div>

        {/* 右侧：我的简历 */}
        <div className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#eff6ff]">
              <span className="text-sm font-semibold text-[#155dfc]">2</span>
            </div>
            <h2 className="text-xl font-medium text-[#101828]">我的简历</h2>
          </div>

          <div className="mb-4 flex h-10 w-full gap-1 rounded-xl bg-gray-100/80 p-1">
            <button
              type="button"
              onClick={() => setResumeMode("paste")}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
                resumeMode === "paste" ? "bg-white shadow-sm text-[#101828]" : "text-[#6a7282] hover:text-[#101828]"
              )}
            >
              <FileText className="size-4" />
              粘贴文本
            </button>
            <button
              type="button"
              onClick={() => setResumeMode("upload")}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
                resumeMode === "upload" ? "bg-white shadow-sm text-[#101828]" : "text-[#6a7282] hover:text-[#101828]"
              )}
            >
              <Upload className="size-4" />
              上传文件
            </button>
          </div>

          {resumeMode === "paste" ? (
            <div className="flex h-[250px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-[#155dfc] focus-within:ring-2 focus-within:ring-[#155dfc]/30 focus-within:ring-offset-0">
              <Textarea
                placeholder="在此粘贴简历内容，可从 Word/PDF 复制..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="h-full min-h-0 resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-sm placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          ) : (
            <div className="flex h-[250px] flex-shrink-0 flex-col">
              {resumeFile ? (
                <FileDisplay
                  file={resumeFile}
                  onRemove={() => setResumeFile(null)}
                  showPreview={["image/jpeg", "image/png", "image/jpg"].includes(resumeFile.type)}
                />
              ) : (
                <FileDropZone
                  type="resume"
                  accept={RESUME_ACCEPT}
                  maxSizeLabel="支持 Word / PDF / 图片，大小不超过 10MB"
                  selectedFile={resumeFile}
                  onFileSelect={setResumeFile}
                  className="h-full min-h-0"
                >
                  <Upload className="mb-4 size-12 text-gray-400" />
                  <p className="mb-1 text-sm font-medium text-[#101828]">
                    点击或拖拽上传文件
                  </p>
                  <p className="text-xs text-[#6a7282]">支持 Word / PDF / 图片，大小不超过 10MB</p>
                </FileDropZone>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <Button
          size="lg"
          disabled={!canAnalyze || isLoading}
          onClick={handleAnalyzeClick}
          className={cn(
            "h-[50px] rounded-full px-12 text-base font-semibold",
            canAnalyze && !isLoading
              ? "bg-[#155dfc] text-white hover:bg-[#1246c9]"
              : "bg-[#155dfc]/90 text-white/90 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            "分析中..."
          ) : (
            <>
              开始AI匹配分析
              <ArrowRight className="ml-2 size-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
