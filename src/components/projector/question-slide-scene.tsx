"use client";

import { Crown, Radio, Sparkles, Trophy } from "lucide-react";
import { PdfViewer } from "@/components/ui/pdf-viewer";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { LiveState } from "@/lib/live-state";
import { cn } from "@/lib/utils";

type State = NonNullable<LiveState>;

export function QuestionSlideScene({ state }: { state: State }) {
  const qv = state.questionViewer;
  const currentQNum = state.competition.currentQuestion;
  const slideStatus = state.competition.questionSlideStatus;
  const finalists = state.finalists;

  if (!qv || !qv.activePageNumber) {
    return (
      <section className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-[#dedede] bg-white p-6 shadow-sm">
        <div className="scene-enter flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-primary shadow-xs">
            <Radio className="size-6 animate-pulse text-[#ed1c24]" />
          </div>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#b5121b]">
            {state.flow.label}
          </p>
          <h2 className="display-type mt-1 text-2xl sm:text-3xl font-bold text-[#191919]">
            PERTANYAAN 0{currentQNum}
          </h2>
          <p className="mt-2 text-xs text-[#747474]">
            File presentation belum dipetakan untuk slide ini.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex flex-1 min-h-0 overflow-hidden rounded-xl border border-[#dedede] bg-white shadow-md">
      {/* Left/Center Main Stage Area: Presentation Slide */}
      <div className="relative flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Stage Sub-Header Bar */}
        <div className="flex items-center justify-between border-b border-[#dedede] bg-slate-50/90 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ed1c24] font-bold text-white shadow-xs">
              <span className="display-type text-xs">Q{currentQNum}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="display-type text-sm font-bold text-[#191919] truncate">
                  {state.flow.label}
                </h2>
                <span className="text-xs text-[#626262] shrink-0">
                  · Pertanyaan {currentQNum} {state.flow.totalQuestions ? `dari ${state.flow.totalQuestions}` : ""}
                </span>
              </div>
              <p className="text-[10px] text-[#747474] font-mono truncate">
                Slide {qv.activePageNumber} / {qv.totalPages} · {qv.originalName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {slideStatus === "SCORING" ? (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-800 shadow-2xs">
                <Sparkles className="size-3.5 animate-spin text-amber-600" />
                SCORING ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-800 shadow-2xs">
                <span className="live-orb is-live" />
                TAYANG LIVE
              </span>
            )}
          </div>
        </div>

        {/* PDF Slide Presentation Stage */}
        <div className="relative flex flex-1 min-h-0 min-w-0 items-center justify-center p-2 bg-[#f4f5f7]">
          <div className="relative flex h-full w-full max-h-full max-w-full items-center justify-center rounded-lg border border-[#dedede] bg-white p-1.5 shadow-sm overflow-hidden">
            <PdfViewer
              url={qv.storagePath}
              pageNumber={qv.activePageNumber}
              className="h-full w-full rounded overflow-hidden flex items-center justify-center bg-white"
            />
          </div>
        </div>
      </div>

      {/* Right Side Panel: Live Team Leaderboard / Scores */}
      {finalists.length > 0 && (
        <aside className="w-72 shrink-0 border-l border-[#dedede] bg-slate-50/90 flex flex-col p-3">
          <div className="mb-2.5 flex items-center justify-between border-b border-[#dedede] pb-1.5 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#747474] flex items-center gap-1.5">
              <Trophy className="size-3.5 text-[#ed1c24]" />
              Papan Skor Realtime
            </h3>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ● Live Sync
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {finalists.map((team, idx) => (
              <div
                key={team.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-2.5 transition-all",
                  idx === 0
                    ? "border-red-300 bg-red-50/80 shadow-2xs"
                    : "border-[#dedede] bg-white hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white shadow-2xs"
                    style={{ backgroundColor: team.bannerColor || "#ed1c24" }}
                  >
                    {idx === 0 ? <Crown className="size-3.5 text-amber-300" /> : `#${idx + 1}`}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#191919]">
                      {team.name}
                    </p>
                    <p className="text-[10px] text-[#747474]">
                      Peringkat #{idx + 1}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="display-type text-lg font-bold text-[#191919]">
                    <AnimatedNumber value={team.score} />
                  </p>
                  <p className="text-[8px] font-bold text-[#747474] uppercase tracking-wider">
                    POIN
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </section>
  );
}
