"use client";

import { useState } from "react";
import { FileText, Upload, Image, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileDropZone, JD_ACCEPT, RESUME_ACCEPT } from "@/components/FileDropZone";
import { FileDisplay } from "@/components/FileDisplay";
import { cn } from "@/lib/utils";
import { LIMITS, parseFile } from "@/lib/parse";

type JdInputMode = "paste" | "upload" | "image";
type ResumeInputMode = "paste" | "upload" | "image";

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
        if (error) throw new Error(`JD 解析失败: ${error}`);
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
    <div className="w-full max-w-4xl space-y-8">
      {/* 标题区 */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-[#101828]">
          AI 简历评估与 JD 拆解助手
        </h1>
        <p className="text-lg text-[#6a7282]">
          消除招聘信息差，精准量化你的竞争力，获取定制化面试突击指南。
        </p>
      </div>

      {/* 双输入区 */}
      <div className="grid gap-8 md:grid-cols-2 md:items-stretch">
        {/* 左侧：目标职位 JD */}
        <div className="flex min-h-[520px] flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#eff6ff]">
              <span className="text-sm font-semibold text-[#155dfc]">1</span>
            </div>
            <h2 className="text-xl font-medium text-[#101828]">目标职位 JD</h2>
          </div>

          <Tabs
            value={jdMode}
            onValueChange={(v) => setJdMode(v as JdInputMode)}
            className="w-full"
          >
            <TabsList className="mb-4 h-14 w-full rounded-xl bg-gray-100/80 p-1">
              <TabsTrigger
                value="paste"
                className="flex-1 gap-2 rounded-lg data-[active]:bg-white data-[active]:shadow-sm"
              >
                <FileText className="size-4" />
                粘贴文本
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="flex-1 gap-2 rounded-lg data-[active]:bg-white data-[active]:shadow-sm"
              >
                <Upload className="size-4" />
                上传文档
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="flex-1 gap-2 rounded-lg data-[active]:bg-white data-[active]:shadow-sm"
              >
                <Image className="size-4" />
                图片解析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="mt-0 flex-1">
              <div className="flex h-[320px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-[#155dfc] focus-within:ring-2 focus-within:ring-[#155dfc]/30 focus-within:ring-offset-0">
                <Textarea
                  placeholder="在此粘贴 Boss直聘、猎聘 等平台的职位描述详情..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  className="h-full min-h-0 resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-sm placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </TabsContent>
            <TabsContent value="upload" className="mt-0 flex-1">
              <div className="flex h-[320px] flex-col">
                {jdFile ? (
                  <FileDisplay
                    file={jdFile}
                    onRemove={() => setJdFile(null)}
                  />
                ) : (
                  <FileDropZone
                    type="jd"
                    accept={JD_ACCEPT}
                    maxSizeLabel="支持 Word / PDF，大小不超过 5MB"
                    selectedFile={jdFile}
                    onFileSelect={setJdFile}
                    className="h-full min-h-0"
                  >
                    <Upload className="mb-4 size-12 text-gray-400" />
                    <p className="mb-1 text-sm font-medium text-[#101828]">
                      点击或拖拽上传 Word / PDF 文件
                    </p>
                    <p className="text-xs text-[#6a7282]">支持大小不超过 5MB</p>
                  </FileDropZone>
                )}
              </div>
            </TabsContent>
            <TabsContent value="image" className="mt-0 flex-1">
              <div className="flex h-[320px] flex-col">
                {jdFile ? (
                  <FileDisplay
                    file={jdFile}
                    onRemove={() => setJdFile(null)}
                    showPreview
                  />
                ) : (
                  <FileDropZone
                    type="jd"
                    accept=".jpg,.jpeg,.png"
                    maxSizeLabel="支持 JPG / PNG，点击分析时解析"
                    selectedFile={jdFile}
                    onFileSelect={setJdFile}
                    className="h-full min-h-0"
                  >
                    <Image className="mb-4 size-12 text-gray-400" />
                    <p className="mb-1 text-sm font-medium text-[#101828]">
                      上传 JD 截图
                    </p>
                    <p className="text-xs text-[#6a7282]">
                      支持 JPG / PNG，点击分析时解析
                    </p>
                  </FileDropZone>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧：我的简历 */}
        <div className="flex min-h-[520px] flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.04)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#eff6ff]">
              <span className="text-sm font-semibold text-[#155dfc]">2</span>
            </div>
            <h2 className="text-xl font-medium text-[#101828]">我的简历</h2>
          </div>

          <Tabs
            value={resumeMode}
            onValueChange={(v) => setResumeMode(v as ResumeInputMode)}
            className="w-full"
          >
            <TabsList className="mb-4 h-14 w-full rounded-xl bg-gray-100/80 p-1">
              <TabsTrigger
                value="paste"
                className="flex-1 gap-2 rounded-lg data-[active]:bg-white data-[active]:shadow-sm"
              >
                <FileText className="size-4" />
                粘贴文本
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="flex-1 gap-2 rounded-lg data-[active]:bg-white data-[active]:shadow-sm"
              >
                <Upload className="size-4" />
                上传文档
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="flex-1 gap-2 rounded-lg data-[active]:bg-white data-[active]:shadow-sm"
              >
                <Image className="size-4" />
                图片解析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="mt-0 flex-1">
              <div className="flex h-[320px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-[#155dfc] focus-within:ring-2 focus-within:ring-[#155dfc]/30 focus-within:ring-offset-0">
                <Textarea
                  placeholder="在此粘贴简历内容，可从 Word/PDF 复制..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="h-full min-h-0 resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-sm placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </TabsContent>
            <TabsContent value="upload" className="mt-0 flex-1">
              <div className="flex h-[320px] flex-col">
                {resumeFile ? (
                  <FileDisplay
                    file={resumeFile}
                    onRemove={() => setResumeFile(null)}
                  />
                ) : (
                  <FileDropZone
                    type="resume"
                    accept={RESUME_ACCEPT}
                    maxSizeLabel="支持 Word / PDF，大小不超过 10MB"
                    selectedFile={resumeFile}
                    onFileSelect={setResumeFile}
                    className="h-full min-h-0"
                  >
                    <Upload className="mb-4 size-12 text-gray-400" />
                    <p className="mb-1 text-sm font-medium text-[#101828]">
                      点击或拖拽上传 Word / PDF 文件
                    </p>
                    <p className="text-xs text-[#6a7282]">支持大小不超过 10MB</p>
                  </FileDropZone>
                )}
              </div>
            </TabsContent>
            <TabsContent value="image" className="mt-0 flex-1">
              <div className="flex h-[320px] flex-col">
                {resumeFile ? (
                  <FileDisplay
                    file={resumeFile}
                    onRemove={() => setResumeFile(null)}
                    showPreview
                  />
                ) : (
                  <FileDropZone
                    type="resume"
                    accept=".jpg,.jpeg,.png"
                    maxSizeLabel="支持 JPG / PNG，点击分析时解析"
                    selectedFile={resumeFile}
                    onFileSelect={setResumeFile}
                    className="h-full min-h-0"
                  >
                    <Image className="mb-4 size-12 text-gray-400" />
                    <p className="mb-1 text-sm font-medium text-[#101828]">
                      上传简历截图
                    </p>
                    <p className="text-xs text-[#6a7282]">
                      支持 JPG / PNG，点击分析时解析
                    </p>
                  </FileDropZone>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="flex flex-col items-center gap-6 pt-8">
        <Button
          size="lg"
          disabled={!canAnalyze || isLoading}
          onClick={handleAnalyzeClick}
          className={cn(
            "h-14 rounded-full px-12 text-base font-semibold",
            canAnalyze && !isLoading
              ? "bg-[#155dfc] text-white hover:bg-[#1246c9]"
              : "bg-gray-200 text-gray-500"
          )}
        >
          {isLoading ? (
            "分析中..."
          ) : (
            <>
              开始 AI 匹配分析
              <ArrowRight className="ml-2 size-5" />
            </>
          )}
        </Button>
        <div className="flex items-center gap-2 text-xs text-[#99a1af]">
          <svg
            className="size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>您的简历仅用于本次单次匹配分析，系统不会存储任何个人隐私数据</span>
        </div>
      </div>
    </div>
  );
}
