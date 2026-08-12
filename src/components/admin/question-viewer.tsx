"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  MonitorPlay,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import {
  setQuestionSlideStatus,
  resetSlideForNextQuestion,
  switchToQuestionSlideMode,
} from "@/app/admin/question-actions";
import {
  submitSession1Result,
  submitSession2Result,
  submitSession3Result,
  submitGrandFinalResult,
  undoLastCompetitionAction,
} from "@/app/admin/actions";
import { PdfViewer } from "@/components/ui/pdf-viewer";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LiveState } from "@/lib/live-state";
import { cn } from "@/lib/utils";

type State = NonNullable<LiveState>;

type QuestionViewerProps = {
  state: State;
};

export function QuestionViewer({ state }: QuestionViewerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const qv = state.questionViewer;
  const currentQNum = state.competition.currentQuestion;
  const currentStage = state.competition.stage;
  const slideStatus = state.competition.questionSlideStatus;
  const finalists = state.finalists;
  const isProjectionOnSlide = state.competition.projectionMode === "QUESTION_SLIDE";

  const [selectedPage, setSelectedPage] = useState<number>(qv?.activePageNumber || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [auctionBid, setAuctionBid] = useState<number>(30);
  const [auctionWinnerId, setAuctionWinnerId] = useState<string>(finalists[0]?.id || "");
  const [targetTeamId, setTargetTeamId] = useState<string>("");
  const [answerMode, setAnswerMode] = useState<"SELF" | "PASS">("SELF");

  // Track activePageNumber to update selectedPage when currentQuestion changes
  const [prevActivePage, setPrevActivePage] = useState(qv?.activePageNumber);
  if (qv?.activePageNumber && qv.activePageNumber !== prevActivePage) {
    setPrevActivePage(qv.activePageNumber);
    setSelectedPage(qv.activePageNumber);
  }

  // Ensure default auction winner is set if currently empty and finalists exist
  const effectiveAuctionWinnerId = auctionWinnerId || finalists[0]?.id || "";

  if (!qv) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="size-5" />
              File Soal Belum Diunggah untuk {state.flow.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-amber-700">
            Unggah file PDF/PPTX untuk tahap <strong>{state.flow.label}</strong> terlebih dahulu di bagian bawah halaman ini agar dapat menggunakan Question Viewer.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle State Machine Transition (PENDING -> PREVIEW -> LIVE -> SCORING -> COMPLETED)
  function handleStatusChange(nextStatus: "PENDING" | "PREVIEW" | "LIVE" | "SCORING" | "COMPLETED") {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("status", nextStatus);

      const res = await setQuestionSlideStatus(formData);

      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  // Handle Switch Projection Mode to Slide
  function handleActivateSlideProjection() {
    startTransition(async () => {
      const res = await switchToQuestionSlideMode();

      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  // Handle Undo Last Action
  function handleUndo() {
    startTransition(async () => {
      const res = await undoLastCompetitionAction();

      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  // Submit scoring for Session 1 / Session 2 / Session 3 / Grand Final
  function handleScoreSubmission(outcome: "CORRECT" | "WRONG", teamId?: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("expectedQuestion", String(currentQNum));
      formData.append("outcome", outcome);

      let res;
      if (currentStage === "FINAL_SESSION_1") {
        res = await submitSession1Result(formData);
      } else if (currentStage === "FINAL_SESSION_2") {
        if (!teamId) {
          toast.error("Pilih tim penjawab terlebih dahulu.");
          return;
        }
        formData.append("teamId", teamId);
        res = await submitSession2Result(formData);
      } else if (currentStage === "FINAL_SESSION_3") {
        if (!effectiveAuctionWinnerId) {
          toast.error("Pilih pemenang lelang terlebih dahulu.");
          return;
        }
        formData.append("auctionWinnerId", effectiveAuctionWinnerId);
        formData.append("bid", String(auctionBid));
        formData.append("answerMode", answerMode);
        if (targetTeamId) formData.append("targetTeamId", targetTeamId);
        res = await submitSession3Result(formData);
      } else if (currentStage === "GRAND_FINAL") {
        res = await submitGrandFinalResult(formData);
      } else {
        toast.error("Tahap lomba tidak mendukung input skor langsung dari viewer.");
        return;
      }

      if (res.ok) {
        toast.success(res.message);
        // Automatically reset slide status for next question
        await resetSlideForNextQuestion();
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  // Compute status per question mapping
  const mappings = qv.mappings;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4">
      {/* Top Controller Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 font-bold text-primary">
            Q{currentQNum}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{state.flow.label}</h2>
              <Badge
                className={cn(
                  "border text-xs font-semibold",
                  slideStatus === "LIVE" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                  slideStatus === "PREVIEW" && "border-amber-300 bg-amber-50 text-amber-700",
                  slideStatus === "SCORING" && "border-blue-300 bg-blue-50 text-blue-700",
                  slideStatus === "COMPLETED" && "border-slate-300 bg-slate-100 text-slate-700",
                  slideStatus === "PENDING" && "border-slate-200 bg-slate-50 text-slate-500"
                )}
              >
                STATUS: {slideStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              File: {qv.originalName} · Slide Aktif: {selectedPage}/{qv.totalPages}
            </p>
          </div>
        </div>

        {/* Projection Sync Status */}
        <div className="flex items-center gap-2">
          {isProjectionOnSlide ? (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center gap-1.5 py-1 px-3">
              <MonitorPlay className="size-3.5" />
              Proyektor: Soal Tanyang Live
            </Badge>
          ) : (
            <Button
              variant="dark"
              size="sm"
              onClick={handleActivateSlideProjection}
              disabled={isPending}
            >
              <MonitorPlay className="size-3.5 mr-1.5" />
              Tayangkan ke Proyektor
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleUndo} disabled={isPending}>
            <RotateCcw className="size-3.5 mr-1" />
            Undo Aksi
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Left Sidebar: Question Navigator */}
        <Card className="h-fit">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Daftar Soal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[520px] overflow-y-auto">
            {mappings.map((m) => {
              const isCurrentQuestion = m.questionNumber === currentQNum;
              const isMapped = m.questionNumber !== null;
              const isSelected = m.pageNumber === selectedPage;

              return (
                <button
                  key={m.pageNumber}
                  onClick={() => setSelectedPage(m.pageNumber)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-all",
                    isCurrentQuestion && "bg-red-50 text-primary font-bold border border-red-200",
                    !isCurrentQuestion && isSelected && "bg-slate-100 text-slate-900 border border-slate-300",
                    !isCurrentQuestion && !isSelected && "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">P{m.pageNumber}</span>
                    {isMapped ? (
                      <span>Soal {m.questionNumber}</span>
                    ) : (
                      <span className="text-slate-400 italic font-normal">(Ignored)</span>
                    )}
                  </span>

                  {isCurrentQuestion ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                      ●
                    </span>
                  ) : m.questionNumber && m.questionNumber < currentQNum ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : null}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Main Stage: Viewer + Action Bar + Scoring Panel */}
        <div className="flex flex-col gap-4">
          {/* Presentation Viewer Area with Zoom & Pan */}
          <Card className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 min-h-[460px] shadow-xl">
            <div className="flex h-[460px] w-full items-center justify-center overflow-auto p-4">
              <div
                className="transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center center",
                }}
              >
                <PdfViewer
                  url={qv.storagePath}
                  pageNumber={selectedPage}
                  className="h-[420px] w-full rounded-lg shadow-2xl"
                />
              </div>
            </div>

            {/* Slide Navigation & Zoom Overlay Controls */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/90 px-3.5 py-2 backdrop-blur-md text-white text-xs border border-white/10 shadow-lg">
              {/* Prev / Next Slide */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-white hover:bg-slate-800 px-2"
                  disabled={selectedPage <= 1}
                  onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4 mr-0.5" /> Prev
                </Button>

                <span className="font-semibold text-slate-300 px-1">
                  Slide {selectedPage} / {qv.totalPages}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-white hover:bg-slate-800 px-2"
                  disabled={selectedPage >= qv.totalPages}
                  onClick={() => setSelectedPage((p) => Math.min(qv.totalPages, p + 1))}
                >
                  Next <ChevronRight className="size-4 ml-0.5" />
                </Button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                  title="Zoom Out (-)"
                  disabled={zoomLevel <= 0.5}
                  onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                >
                  <ZoomOut className="size-3.5" />
                </Button>

                <button
                  onClick={() => setZoomLevel(1.0)}
                  className="px-1.5 text-[11px] font-bold text-slate-200 hover:text-primary transition-colors"
                  title="Reset Zoom (100%)"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                  title="Zoom In (+)"
                  disabled={zoomLevel >= 2.5}
                  onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                >
                  <ZoomIn className="size-3.5" />
                </Button>
              </div>

              {/* State Machine Step Buttons */}
              <div className="flex items-center gap-2">
                {slideStatus === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 bg-amber-600 text-white border-0 hover:bg-amber-700"
                    onClick={() => handleStatusChange("PREVIEW")}
                    disabled={isPending}
                  >
                    <Eye className="size-3.5 mr-1" /> Preview
                  </Button>
                )}

                {(slideStatus === "PENDING" || slideStatus === "PREVIEW") && (
                  <Button
                    variant="dark"
                    size="sm"
                    className="h-7 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleStatusChange("LIVE")}
                    disabled={isPending}
                  >
                    <Play className="size-3.5 mr-1" /> Tampilkan (Live)
                  </Button>
                )}

                {slideStatus === "LIVE" && (
                  <Button
                    variant="dark"
                    size="sm"
                    className="h-7 bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleStatusChange("SCORING")}
                    disabled={isPending}
                  >
                    <Sparkles className="size-3.5 mr-1" /> Mode Scoring
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Scoring Control Panel */}
          <Card className="border-t-4 border-t-primary">
            <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Trophy className="size-4 text-primary" />
                Input Scoring Soal {currentQNum}
              </CardTitle>
              <span className="text-xs text-slate-500">
                Pilih jawaban tim di bawah ini untuk memperbarui skor real-time.
              </span>
            </CardHeader>
            <CardContent className="p-4">
              {/* Sesi 1: Pertanyaan Bergiliran */}
              {currentStage === "FINAL_SESSION_1" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 font-medium">
                    Tim Aktif: <strong className="text-primary">{state.flow.activeTeamName || "—"}</strong> (+10 poin jika benar)
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="dark"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-bold"
                      onClick={() => handleScoreSubmission("CORRECT")}
                      disabled={isPending}
                    >
                      <Check className="size-5 mr-2" /> Jawaban BENAR (+10 Poin)
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50 h-11 text-sm font-bold"
                      onClick={() => handleScoreSubmission("WRONG")}
                      disabled={isPending}
                    >
                      <X className="size-5 mr-2" /> Jawaban SALAH (0 Poin)
                    </Button>
                  </div>
                </div>
              )}

              {/* Sesi 2: Rebutan */}
              {currentStage === "FINAL_SESSION_2" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 font-medium">
                    Nilai Soal {currentQNum}: <strong className="text-emerald-700">+{currentQNum * 10} Poin</strong> (Salah: -{currentQNum * 10} Poin)
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {finalists.map((team) => (
                      <div key={team.id} className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-2.5 bg-slate-50 text-center">
                        <span className="text-xs font-bold truncate text-slate-800">{team.name}</span>
                        <span className="text-xs font-semibold text-slate-500">Skor: {team.score}</span>
                        <div className="flex gap-1 mt-1">
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs p-0"
                            onClick={() => handleScoreSubmission("CORRECT", team.id)}
                            disabled={isPending}
                          >
                            <Check className="size-3.5" /> Benar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs p-0"
                            onClick={() => handleScoreSubmission("WRONG", team.id)}
                            disabled={isPending}
                          >
                            <X className="size-3.5" /> Salah
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sesi 3: Lelang Poin */}
              {currentStage === "FINAL_SESSION_3" && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Pemenang Lelang</label>
                      <select
                        value={auctionWinnerId}
                        onChange={(e) => setAuctionWinnerId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 p-1.5 text-xs font-medium"
                      >
                        {finalists.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Nilai Lelang (Kelipatan 3, maks 60)</label>
                      <Input
                        type="number"
                        step={3}
                        max={60}
                        min={3}
                        value={auctionBid}
                        onChange={(e) => setAuctionBid(parseInt(e.target.value, 10) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Mode Jawaban</label>
                      <select
                        value={answerMode}
                        onChange={(e) => setAnswerMode(e.target.value as "SELF" | "PASS")}
                        className="w-full rounded-md border border-slate-300 p-1.5 text-xs font-medium"
                      >
                        <option value="SELF">Jawab Sendiri</option>
                        <option value="PASS">Lempar Tim Lain</option>
                      </select>
                    </div>
                  </div>

                  {answerMode === "PASS" && (
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Tim Tujuan Lempar</label>
                      <select
                        value={targetTeamId}
                        onChange={(e) => setTargetTeamId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 p-1.5 text-xs font-medium"
                      >
                        <option value="">-- Pilih Tim Tujuan --</option>
                        {finalists.filter((t) => t.id !== auctionWinnerId).map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="dark"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 text-xs font-bold"
                      onClick={() => handleScoreSubmission("CORRECT")}
                      disabled={isPending}
                    >
                      <Check className="size-4 mr-1.5" /> Konfirmasi Jawaban BENAR
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50 h-9 text-xs font-bold"
                      onClick={() => handleScoreSubmission("WRONG")}
                      disabled={isPending}
                    >
                      <X className="size-4 mr-1.5" /> Konfirmasi Jawaban SALAH
                    </Button>
                  </div>
                </div>
              )}

              {/* Grand Final */}
              {currentStage === "GRAND_FINAL" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 font-medium">
                    Pertanyaan {currentQNum}/4 · Nilai Soal: <strong className="text-emerald-700">Rp500.000</strong>
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="dark"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 text-xs font-bold"
                      onClick={() => handleScoreSubmission("CORRECT")}
                      disabled={isPending}
                    >
                      <Check className="size-4 mr-1.5" /> BENAR (+Rp500.000)
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50 h-10 text-xs font-bold"
                      onClick={() => handleScoreSubmission("WRONG")}
                      disabled={isPending}
                    >
                      <X className="size-4 mr-1.5" /> SALAH
                    </Button>
                  </div>
                </div>
              )}

              {/* Default Fallback */}
              {!["FINAL_SESSION_1", "FINAL_SESSION_2", "FINAL_SESSION_3", "GRAND_FINAL"].includes(currentStage) && (
                <div className="p-3 text-center text-xs text-slate-500 italic">
                  Tahap pertandingan {currentStage} tidak memerlukan input skor dari viewer ini.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
