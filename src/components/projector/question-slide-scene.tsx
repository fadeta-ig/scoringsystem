"use client";

import { Award, CheckCircle2, Crown, Radio, ShieldCheck, Sparkles, Trophy } from "lucide-react";
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
      <section className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-red-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/30 p-8 shadow-2xl">
        <div className="scene-enter relative z-10 flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-950/40 text-primary shadow-lg backdrop-blur-md">
            <Radio className="size-8 animate-pulse text-red-500" />
          </div>
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-red-400">
            {state.flow.label}
          </p>
          <h2 className="display-type mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            PERTANYAAN 0{currentQNum}
          </h2>
          <div className="mt-6 rounded-full border border-white/10 bg-white/5 px-6 py-2 backdrop-blur-md">
            <p className="text-xs font-medium text-slate-400">
              File presentation belum dipetakan untuk slide ini.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
      {/* Background Decorative Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full bg-red-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-72 w-72 rounded-full bg-amber-500/5 blur-[100px]" />

      {/* Top Broadcast Bar */}
      <div className="relative z-20 flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          {/* Question Badge */}
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 font-bold text-white text-base shadow-lg shadow-red-900/30">
            <span className="display-type">Q{currentQNum}</span>
            <span className="absolute -inset-0.5 rounded-xl border border-white/30" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="display-type text-lg font-bold tracking-tight text-white">
                {state.flow.label}
              </h2>
              <span className="text-xs font-medium text-slate-400">
                · Pertanyaan {currentQNum} {state.flow.totalQuestions ? `dari ${state.flow.totalQuestions}` : ""}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Slide {qv.activePageNumber} / {qv.totalPages} · {qv.originalName}
            </p>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center gap-2">
          {slideStatus === "SCORING" ? (
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-amber-400 backdrop-blur-md shadow-inner">
              <Sparkles className="size-3.5 animate-spin text-amber-400" />
              <span>SCORING ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-emerald-400 backdrop-blur-md shadow-inner">
              <span className="live-orb is-live" />
              <span>TAYANG LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Presentation Stage Canvas Container */}
      <div className="relative z-10 flex flex-1 min-h-0 min-w-0 items-center justify-center p-2 sm:p-4 overflow-hidden">
        <div className="relative flex h-full w-full max-h-full max-w-full items-center justify-center rounded-xl border border-white/10 bg-slate-900/60 p-2 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 overflow-hidden">
          {/* Subtle Technical Corner Accents */}
          <div className="pointer-events-none absolute -top-1 -left-1 size-3 border-t-2 border-l-2 border-red-500/60 rounded-tl-sm z-20" />
          <div className="pointer-events-none absolute -top-1 -right-1 size-3 border-t-2 border-r-2 border-red-500/60 rounded-tr-sm z-20" />
          <div className="pointer-events-none absolute -bottom-1 -left-1 size-3 border-b-2 border-l-2 border-red-500/60 rounded-bl-sm z-20" />
          <div className="pointer-events-none absolute -bottom-1 -right-1 size-3 border-b-2 border-r-2 border-red-500/60 rounded-br-sm z-20" />

          {/* Rendered Slide */}
          <PdfViewer
            url={qv.storagePath}
            pageNumber={qv.activePageNumber}
            className="h-full w-full rounded-lg overflow-hidden flex items-center justify-center"
          />
        </div>
      </div>

      {/* Real-time Floating Scoreboard Banner Overlay (Appears during SCORING state or when finalists exist) */}
      {(slideStatus === "SCORING" || slideStatus === "COMPLETED") && finalists.length > 0 && (
        <div className="scene-enter relative z-20 border-t border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur-xl shadow-2xl">
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 sm:gap-6">
            {finalists.map((team, idx) => (
              <div
                key={team.id}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl border px-4 py-2 text-white transition-all duration-300",
                  idx === 0
                    ? "border-red-500/50 bg-gradient-to-r from-red-950/60 to-slate-900/80 shadow-lg shadow-red-950/40"
                    : "border-white/10 bg-slate-900/60 hover:border-white/20"
                )}
              >
                {/* Team Rank Indicator */}
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-md"
                  style={{ backgroundColor: team.bannerColor || "#ed1c24" }}
                >
                  {idx === 0 ? <Crown className="size-4 text-amber-300" /> : `#${idx + 1}`}
                </div>

                {/* Team Name & Score */}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-200 max-w-[130px]">
                    {team.name}
                  </p>
                  <p className="display-type text-xl font-bold tracking-tight text-white leading-none mt-0.5">
                    <AnimatedNumber value={team.score} />
                    <span className="text-[10px] font-normal text-slate-400 ml-1">PTS</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
