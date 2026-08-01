"use client";

import { useState, useCallback } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import {
  Upload,
  Loader2,
  Sparkles,
  FileText,
  CheckCircle2,
  Download,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { extractResumeFromPdf } from "@/lib/pdf-extractor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BREAKDOWN_MAX: Record<string, number> = {
  skills: 35,
  experience: 25,
  education: 15,
  career: 10,
  company: 10,
  timing: 5,
};

interface Analysis {
  analysisId: string;
  score: number;
  matchLabel: string;
  matchReasons: string[];
  missingSkills: string[];
  keyStrengths: string[];
  breakdown: Record<string, number>;
}

interface Optimization {
  optimizedText: string;
  changesSummary: string[];
  keywordsAdded: string[];
  scoreBefore: number;
  scoreAfter: number;
  pdfUrl: string | null;
  fileName: string;
}

function ScoreColor(score: number) {
  return score >= 80
    ? "text-emerald-400"
    : score >= 60
      ? "text-brand-500"
      : score >= 40
        ? "text-amber-400"
        : "text-red-400";
}

export default function ResumePage() {
  const me = useQuery(api.users.getMe);
  const generateUploadUrl = useMutation(api.resumeStorage.generateUploadUrl);
  const saveUploadedResume = useMutation(api.resumeStorage.saveUploadedResume);
  const analyzeResume = useAction(api.resumeActions.analyzeResume);
  const optimizeResume = useAction(api.resumeActions.optimizeResume);

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const currentResume = resumeText || me?.primaryResume?.resumeText || "";
  const fileName = me?.primaryResume?.fileName;

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      setUploading(true);
      try {
        const { text, links } = await extractResumeFromPdf(file);
        if (text.length < 30) {
          toast.error("Couldn't read text from that PDF (is it a scan?)");
          return;
        }
        setResumeText(text);

        const uploadUrl = await generateUploadUrl({});
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadResult.ok) throw new Error("Upload failed");
        const { storageId } = (await uploadResult.json()) as {
          storageId: Id<"_storage">;
        };

        await saveUploadedResume({
          storageId,
          fileName: file.name,
          resumeText: text,
          resumeLinks: links,
        });
        toast.success("Resume uploaded and saved");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload resume"
        );
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, saveUploadedResume]
  );

  const handleAnalyze = async () => {
    const text = currentResume;
    if (text.length < 50) {
      toast.error("Upload a resume first");
      return;
    }
    if (!jobDescription.trim() || !jobTitle.trim()) {
      toast.error("Enter a job title and description");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);
    setOptimization(null);
    try {
      const result = await analyzeResume({
        resumeText: text,
        jobDescription: jobDescription.trim(),
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim() || "Company",
      });
      setAnalysis(result);
      toast.success(`Match score: ${result.score}%`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Analysis failed — try again"
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOptimize = async () => {
    if (!analysis) {
      toast.error("Run analysis first");
      return;
    }
    setOptimizing(true);
    try {
      const result = await optimizeResume({
        analysisId: analysis.analysisId as Id<"resumeAnalyses">,
      });
      setOptimization(result);
      toast.success(
        `Optimized! ${result.scoreBefore}% → ${result.scoreAfter}%`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Optimization failed"
      );
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <h1 className="mb-1.5 text-2xl font-bold text-fg">Resume Optimizer</h1>
      <p className="mb-8 text-muted">
        Upload your resume, score it against any job, and download a tailored
        ATS-ready PDF.
      </p>

      {/* Upload */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 font-semibold text-fg">Your resume</h2>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFileUpload(file);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-colors",
            dragOver
              ? "border-brand-500 bg-brand-500/5"
              : "border-line-strong hover:border-line-strong"
          )}
        >
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
            }}
          />
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-subtle" />
          ) : (
            <>
              <Upload className="mb-3 h-8 w-8 text-subtle" />
              <p className="text-sm text-muted">
                Drop a PDF here, or click to browse
              </p>
              <p className="mt-1 text-xs text-subtle">PDF only · up to 10 MB</p>
            </>
          )}
        </label>
        {currentResume && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {fileName ? `${fileName} · ` : ""}
            {currentResume.length.toLocaleString()} characters loaded
          </div>
        )}
      </Card>

      {/* Target job */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 font-semibold text-fg">Target job</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Job title</Label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Senior Product Designer"
            />
          </div>
          <div>
            <Label>Company</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
        </div>
        <div className="mt-3">
          <Label>Job description</Label>
          <Textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here…"
            rows={6}
          />
        </div>
        <Button
          className="mt-4"
          variant="brand"
          loading={analyzing}
          onClick={() => void handleAnalyze()}
        >
          {!analyzing && <Sparkles className="h-4 w-4" />}
          Analyze match
        </Button>
      </Card>

      {/* Analysis */}
      {analysis && (
        <Card className="mb-6 p-6 [animation:var(--animate-slide-up)]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-fg">Analysis</h2>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", ScoreColor(analysis.score))}>
                {analysis.score}%
              </span>
              <Badge variant="neutral">{analysis.matchLabel}</Badge>
            </div>
          </div>

          <div className="mb-6 space-y-2.5">
            {Object.entries(analysis.breakdown).map(([key, val]) => {
              const max = BREAKDOWN_MAX[key] ?? 100;
              const pct = Math.round((val / max) * 100);
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="capitalize text-muted">{key}</span>
                    <span className="font-medium text-muted">
                      {val}/{max}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Strengths</p>
              <ul className="space-y-1.5">
                {analysis.keyStrengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-muted">
                Missing skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingSkills.length ? (
                  analysis.missingSkills.map((s) => (
                    <Badge key={s} variant="danger">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-subtle">
                    None — strong coverage.
                  </p>
                )}
              </div>
            </div>
          </div>

          <Button
            className="mt-6"
            variant="secondary"
            loading={optimizing}
            onClick={() => void handleOptimize()}
          >
            {!optimizing && <FileText className="h-4 w-4" />}
            Generate optimized PDF
          </Button>
        </Card>
      )}

      {/* Optimization */}
      {optimization && (
        <Card className="p-6 [animation:var(--animate-slide-up)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-semibold text-fg">Optimized resume</h2>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                {optimization.scoreBefore}% → {optimization.scoreAfter}%
              </span>
              {optimization.pdfUrl && (
                <Button asChild variant="success" size="sm">
                  <a
                    href={optimization.pdfUrl}
                    download={optimization.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" /> Download PDF
                  </a>
                </Button>
              )}
            </div>
          </div>

          {optimization.keywordsAdded.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-muted">
                Keywords added
              </p>
              <div className="flex flex-wrap gap-1.5">
                {optimization.keywordsAdded.map((k) => (
                  <Badge key={k} variant="info">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {optimization.changesSummary.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-muted">
                Changes made
              </p>
              <ul className="space-y-1.5">
                {optimization.changesSummary.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-raised p-4 font-mono text-xs leading-relaxed text-muted">
            {optimization.optimizedText}
          </pre>
        </Card>
      )}
    </div>
  );
}
