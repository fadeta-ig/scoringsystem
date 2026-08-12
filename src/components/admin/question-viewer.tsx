"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MonitorPlay,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Upload,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  setQuestionSlideStatus,
  resetSlideForNextQuestion,
  switchToQuestionSlideMode,
  setCurrentQuestion,
} from "@/app/admin/question-actions";
import {
  submitSession1Result,
  submitSession2Result,
  submitSession3Result,
  submitGrandFinalResult,
  undoLastCompetitionAction,
} from "@/app/admin/actions";
import { PdfViewer } from "@/components/ui/pdf-viewer";
import { ResetAllButton } from "@/components/admin/reset-all-button";
import { DeleteQuestionFileButton } from "@/components/admin/delete-question-file-button";
import { QuestionMapping } from "@/components/admin/question-mapping";
import { QuestionUpload } from "@/components/admin/question-upload";
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
  const [activeTab, setActiveTab] = useState<"CONTROLLER" | "MAPPING" | "UPLOAD">("CONTROLLER");

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

  const effectiveAuctionWinnerId = auctionWinnerId || finalists[0]?.id || "";
  const hasScoringControls = [
    "FINAL_SESSION_1",
    "FINAL_SESSION_2",
    "FINAL_SESSION_3",
    "GRAND_FINAL",
  ].includes(currentStage);

  // 1-Click Auto Map All (P1 -> Q1, P2 -> Q2, etc.)
  function handleQuickAutoMap() {
    if (!qv) return;

    startTransition(async () => {
      try {
        const autoMappings = Array.from({ length: qv.totalPages }, (_, i) => ({
          pageNumber: i + 1,
          questionNumber: i + 1,
        }));

        const res = await fetch(`/api/admin/questions/${qv.fileId}/mapping`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings: autoMappings }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Gagal memperbarui pemetaan.");
        }

        toast.success(`Pemetaan otomatis berhasil diterapkan! (Slide 1..${qv.totalPages} -> Soal 1..${qv.totalPages})`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memetakan slide.");
      }
    });
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
        await resetSlideForNextQuestion();
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleSwitchQuestion(qNum: number) {
    if (qNum < 1) return;
    const formData = new FormData();
    formData.append("questionNumber", String(qNum));

    startTransition(async () => {
      const res = await setCurrentQuestion(formData);
      if (res.ok) {
        toast.success(res.message);
        const mappedPage = mappings.find((m) => m.questionNumber === qNum)?.pageNumber;
        if (mappedPage) {
          setSelectedPage(mappedPage);
        }
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  const mappings = qv?.mappings || [];
  const unmappedCount = mappings.filter((m) => m.questionNumber === null).length;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-3 py-3 sm:px-4">
      {/* Studio Header Command Bar (Compact & Sleek) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        {/* Left Stage & Status Info */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-600 font-bold text-white shadow-sm">
            <span className="display-type text-base">Q{currentQNum}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 leading-tight">{state.flow.label}</h2>
              <Badge
                className={cn(
                  "border text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider",
                  slideStatus === "LIVE" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                  slideStatus === "PREVIEW" && "border-amber-300 bg-amber-50 text-amber-700",
                  slideStatus === "SCORING" && "border-blue-300 bg-blue-50 text-blue-700",
                  slideStatus === "COMPLETED" && "border-slate-300 bg-slate-100 text-slate-700",
                  slideStatus === "PENDING" && "border-slate-200 bg-slate-50 text-slate-500"
                )}
              >
                {slideStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {qv ? `${qv.originalName} (${qv.totalPages} Slide)` : "Belum ada file soal diunggah"}
            </p>
          </div>
        </div>

        {/* Center: Quick Question Stepper Navigator */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-2xs">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-slate-900"
            onClick={() => handleSwitchQuestion(currentQNum - 1)}
            disabled={isPending || currentQNum <= 1}
            title="Pindah ke soal sebelumnya (Tayang Live)"
          >
            <ChevronLeft className="size-4 mr-0.5" />
            Prev
          </Button>

          <div className="px-3 text-center min-w-[90px]">
            <span className="text-xs font-extrabold text-red-700 font-mono">Soal {currentQNum}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-bold text-red-700 hover:bg-white hover:text-red-800"
            onClick={() => handleSwitchQuestion(currentQNum + 1)}
            disabled={isPending}
            title="Pindah ke soal berikutnya (Tayang Live)"
          >
            Next
            <ChevronRight className="size-4 ml-0.5" />
          </Button>
        </div>

        {/* Right: Global Sync Controls */}
        <div className="flex items-center gap-2">
          {isProjectionOnSlide ? (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center gap-1.5 py-1 px-3 text-xs font-semibold">
              <MonitorPlay className="size-3.5" /> Live Proyektor
            </Badge>
          ) : (
            <Button
              variant="dark"
              size="sm"
              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              onClick={handleActivateSlideProjection}
              disabled={isPending || !qv}
            >
              <MonitorPlay className="size-3.5 mr-1.5" />
              Tayangkan ke Proyektor
            </Button>
          )}

          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={handleUndo} disabled={isPending}>
            <RotateCcw className="size-3.5 mr-1" />
            Undo
          </Button>

          {qv && (
            <DeleteQuestionFileButton
              fileId={qv.fileId}
              fileName={qv.originalName}
              stageLabel={state.flow.label}
              variant="outline"
              size="sm"
              className="h-8 text-xs text-red-700 border-red-200 hover:bg-red-50 font-semibold"
            />
          )}

          <ResetAllButton />
        </div>
      </div>

      {/* Studio Workflow Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-3 pt-2 gap-2 shadow-2xs">
        <button
          onClick={() => setActiveTab("CONTROLLER")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition-all",
            activeTab === "CONTROLLER"
              ? "border-red-600 text-red-600 bg-red-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          )}
        >
          <MonitorPlay className="size-4" />
          1. Controller & Preview Live
        </button>

        <button
          onClick={() => setActiveTab("MAPPING")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition-all",
            activeTab === "MAPPING"
              ? "border-red-600 text-red-600 bg-red-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          )}
        >
          <SlidersHorizontal className="size-4" />
          2. Pemetaan Slide ke Soal
          {unmappedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 font-mono font-bold">
              {unmappedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("UPLOAD")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition-all",
            activeTab === "UPLOAD"
              ? "border-red-600 text-red-600 bg-red-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          )}
        >
          <Upload className="size-4" />
          3. Upload & Kelola File
        </button>
      </div>

      {/* TAB 1: Controller & Preview Workspace */}
      {activeTab === "CONTROLLER" && (
        <div>
          {!qv ? (
            <Card className="p-8 text-center bg-slate-50/50 border-dashed border-2">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600 mb-3 shadow-xs">
                <Upload className="size-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Belum Ada File Soal Diunggah</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Unggah file presentation PDF/PPTX untuk <strong>{state.flow.label}</strong> agar dapat memulai mengontrol slide soal dan input skor.
              </p>
              <Button
                variant="dark"
                className="bg-red-600 hover:bg-red-700 font-bold text-xs"
                onClick={() => setActiveTab("UPLOAD")}
              >
                <Upload className="size-4 mr-2" />
                Upload File Soal Sekarang
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-[230px_1fr]">
              {/* Left Sidebar: Compact Question & Slide Navigator */}
              <Card className="h-fit shadow-xs">
                <CardHeader className="py-2.5 px-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Daftar Soal
                  </CardTitle>

                  {unmappedCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] bg-red-50 text-red-700 hover:bg-red-100 font-bold px-1.5"
                      onClick={handleQuickAutoMap}
                      disabled={isPending}
                      title="Otomatis petakan Slide 1 -> Soal 1, Slide 2 -> Soal 2"
                    >
                      <Wand2 className="size-3 mr-0.5 text-red-600" />
                      Auto-Map
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="p-1.5 space-y-1 max-h-[560px] overflow-y-auto">
                  {mappings.map((m) => {
                    const isCurrentQuestion = m.questionNumber === currentQNum;
                    const isMapped = m.questionNumber !== null;
                    const isSelected = m.pageNumber === selectedPage;

                    return (
                      <div
                        key={m.pageNumber}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-all border gap-1.5",
                          isCurrentQuestion && "bg-red-50 text-red-900 font-bold border-red-300 shadow-2xs",
                          !isCurrentQuestion && isSelected && "bg-slate-100 text-slate-900 border-slate-300",
                          !isCurrentQuestion && !isSelected && "border-slate-100 hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedPage(m.pageNumber)}
                          className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                        >
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded shrink-0">
                            P{m.pageNumber}
                          </span>
                          {isMapped ? (
                            <span className="truncate text-xs font-bold">Soal {m.questionNumber}</span>
                          ) : (
                            <span className="text-slate-400 italic font-normal text-[11px]">(Slide {m.pageNumber})</span>
                          )}
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          {isCurrentQuestion ? (
                            <span className="flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white font-bold shrink-0">
                              <MonitorPlay className="size-3" /> Live
                            </span>
                          ) : isMapped ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-[10px] text-red-700 hover:bg-red-100 font-bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSwitchQuestion(m.questionNumber!);
                              }}
                              disabled={isPending}
                              title={`Pindah & Tayangkan Soal ${m.questionNumber} ke Proyektor`}
                            >
                              <MonitorPlay className="size-3 mr-0.5" />
                              Tayangkan
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Right Main Area: Presentation Stage & Controls */}
              <div className="flex flex-col gap-3">
                {/* Widescreen Presentation Canvas */}
                <Card className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#f8f9fa] shadow-sm">
                  <div className="flex min-h-[460px] w-full items-center justify-center overflow-auto p-3">
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
                        className="h-[430px] w-full rounded-xl shadow-sm border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Clean Glassmorphic Overlay Controls */}
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/95 px-3 py-1.5 backdrop-blur-md text-slate-800 text-xs border border-slate-200 shadow-md">
                    {/* Prev / Next Slide */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-slate-700 hover:bg-slate-100 px-2 font-bold text-xs"
                        disabled={selectedPage <= 1}
                        onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="size-3.5 mr-0.5" /> Prev
                      </Button>

                      <span className="font-bold text-slate-900 px-2 font-mono text-xs">
                        Slide {selectedPage} / {qv.totalPages}
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-slate-700 hover:bg-slate-100 px-2 font-bold text-xs"
                        disabled={selectedPage >= qv.totalPages}
                        onClick={() => setSelectedPage((p) => Math.min(qv.totalPages, p + 1))}
                      >
                        Next <ChevronRight className="size-3.5 ml-0.5" />
                      </Button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        title="Zoom Out (-)"
                        disabled={zoomLevel <= 0.5}
                        onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                      >
                        <ZoomOut className="size-3.5" />
                      </Button>

                      <button
                        onClick={() => setZoomLevel(1.0)}
                        className="px-1 text-[11px] font-bold text-slate-700 hover:text-red-600 font-mono"
                        title="Reset Zoom (100%)"
                      >
                        {Math.round(zoomLevel * 100)}%
                      </button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        title="Zoom In (+)"
                        disabled={zoomLevel >= 2.5}
                        onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                      >
                        <ZoomIn className="size-3.5" />
                      </Button>
                    </div>

                    {/* Slide Status Segmented Controller */}
                    <div className="flex items-center gap-1">
                      {slideStatus === "PENDING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 bg-amber-500 text-white border-0 hover:bg-amber-600 font-bold text-xs"
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
                          className="h-7 bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs"
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
                          className="h-7 bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs"
                          onClick={() => handleStatusChange("SCORING")}
                          disabled={isPending}
                        >
                          <Sparkles className="size-3.5 mr-1" /> Mode Scoring
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Scoring Input Control Panel (Only Rendered for Stages requiring scoring input) */}
                {hasScoringControls && (
                  <Card className="border-t-4 border-t-red-600 shadow-xs">
                    <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider">
                        <Trophy className="size-4 text-red-600" />
                        Input Scoring Soal {currentQNum}
                      </CardTitle>
                      <span className="text-[11px] text-slate-500">
                        Pilih jawaban tim di bawah ini untuk memperbarui skor real-time.
                      </span>
                    </CardHeader>
                    <CardContent className="p-3.5">
                      {/* Sesi 1: Pertanyaan Bergiliran */}
                      {currentStage === "FINAL_SESSION_1" && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-600 font-medium">
                            Tim Aktif: <strong className="text-red-700 font-bold">{state.flow.activeTeamName || "—"}</strong> (+10 poin jika benar)
                          </p>
                          <div className="flex gap-3">
                            <Button
                              variant="dark"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 text-xs font-bold text-white shadow-xs"
                              onClick={() => handleScoreSubmission("CORRECT")}
                              disabled={isPending}
                            >
                              <Check className="size-4 mr-1.5" /> Jawaban BENAR (+10 Poin)
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-red-200 text-red-700 hover:bg-red-50 h-10 text-xs font-bold shadow-xs"
                              onClick={() => handleScoreSubmission("WRONG")}
                              disabled={isPending}
                            >
                              <X className="size-4 mr-1.5" /> Jawaban SALAH (0 Poin)
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Sesi 2: Rebutan */}
                      {currentStage === "FINAL_SESSION_2" && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-600 font-medium">
                            Nilai Soal {currentQNum}: <strong className="text-emerald-700 font-bold">+{currentQNum * 10} Poin</strong> (Salah: -{currentQNum * 10} Poin)
                          </p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {finalists.map((team) => (
                              <div key={team.id} className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-center">
                                <span className="text-xs font-bold truncate text-slate-900">{team.name}</span>
                                <span className="text-[11px] font-semibold text-slate-500">Skor: {team.score}</span>
                                <div className="flex gap-1 mt-1">
                                  <Button
                                    size="sm"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-[11px] p-0"
                                    onClick={() => handleScoreSubmission("CORRECT", team.id)}
                                    disabled={isPending}
                                  >
                                    <Check className="size-3 mr-0.5" /> Benar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-bold h-7 text-[11px] p-0"
                                    onClick={() => handleScoreSubmission("WRONG", team.id)}
                                    disabled={isPending}
                                  >
                                    <X className="size-3 mr-0.5" /> Salah
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
                                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 bg-white"
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
                                className="h-9 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600 block mb-1">Mode Jawaban</label>
                              <select
                                value={answerMode}
                                onChange={(e) => setAnswerMode(e.target.value as "SELF" | "PASS")}
                                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 bg-white"
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
                                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 bg-white"
                              >
                                <option value="">-- Pilih Tim Tujuan --</option>
                                {finalists.filter((t) => t.id !== auctionWinnerId).map((t) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="flex gap-3 pt-1">
                            <Button
                              variant="dark"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 text-xs font-bold text-white shadow-xs"
                              onClick={() => handleScoreSubmission("CORRECT")}
                              disabled={isPending}
                            >
                              <Check className="size-4 mr-1.5" /> Konfirmasi Jawaban BENAR
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-red-200 text-red-700 hover:bg-red-50 h-9 text-xs font-bold shadow-xs"
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
                            Pertanyaan {currentQNum}/4 · Nilai Soal: <strong className="text-emerald-700 font-bold">Rp500.000</strong>
                          </p>
                          <div className="flex gap-3">
                            <Button
                              variant="dark"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 text-xs font-bold text-white shadow-xs"
                              onClick={() => handleScoreSubmission("CORRECT")}
                              disabled={isPending}
                            >
                              <Check className="size-4 mr-1.5" /> Jawaban BENAR (+Rp500.000)
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-red-200 text-red-700 hover:bg-red-50 h-10 text-xs font-bold shadow-xs"
                              onClick={() => handleScoreSubmission("WRONG")}
                              disabled={isPending}
                            >
                              <X className="size-4 mr-1.5" /> Jawaban SALAH (-Rp500.000)
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Mapping Workspace */}
      {activeTab === "MAPPING" && (
        <div>
          {qv ? (
            <QuestionMapping
              fileId={qv.fileId}
              originalName={qv.originalName}
              totalPages={qv.totalPages}
              initialMappings={qv.mappings}
              onSaved={() => {
                router.refresh();
                setActiveTab("CONTROLLER");
              }}
            />
          ) : (
            <Card className="p-8 text-center bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Belum Ada File Soal</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Unggah file presentation terlebih dahulu untuk mengaktifkan pemetaan slide.
              </p>
              <Button onClick={() => setActiveTab("UPLOAD")} variant="dark" size="sm">
                Upload File Sekarang
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3: Upload File Workspace */}
      {activeTab === "UPLOAD" && (
        <div>
          <QuestionUpload
            activeStage={currentStage}
            activeFileId={qv?.fileId}
            activeFileName={qv?.originalName}
            activeFileStageLabel={state.flow.label}
            onUploadSuccess={() => {
              router.refresh();
              setActiveTab("CONTROLLER");
            }}
          />
        </div>
      )}
    </div>
  );
}
