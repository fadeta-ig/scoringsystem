"use client";

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
      <section className="relative flex flex-1 items-center justify-center border border-[#dedede] bg-white p-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-[#b5121b]">
            {state.flow.label}
          </p>
          <h2 className="display-type mt-2 text-4xl text-[#191919]">
            PERTANYAAN 0{currentQNum}
          </h2>
          <p className="mt-4 text-sm text-[#747474]">
            File presentation belum dipetakan untuk slide ini.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden rounded-md border border-slate-300 bg-slate-950 shadow-2xl">
      {/* Header Banner on Projector */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-md bg-[#ed1c24] font-bold text-white text-sm">
            Q{currentQNum}
          </span>
          <div>
            <h2 className="display-type text-lg font-bold tracking-tight text-white">
              {state.flow.label}
            </h2>
            <p className="text-xs text-slate-400">
              Pertanyaan {currentQNum} {state.flow.totalQuestions ? `dari ${state.flow.totalQuestions}` : ""}
            </p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2">
          <span className="live-orb is-live" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            {slideStatus === "SCORING" ? "SCORING ACTIVE" : "SOAL LIVE"}
          </span>
        </div>
      </div>

      {/* Main Rendered Slide Canvas */}
      <div className="relative flex flex-1 items-center justify-center p-4">
        <PdfViewer
          url={qv.storagePath}
          pageNumber={qv.activePageNumber}
          className="h-full w-full max-h-[75vh]"
        />
      </div>

      {/* Real-time Scoring Overlay Banner (Appears during SCORING state or when finalists scores exist) */}
      {(slideStatus === "SCORING" || slideStatus === "COMPLETED") && finalists.length > 0 && (
        <div className="scene-enter border-t border-slate-800 bg-slate-900/95 p-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-around gap-4">
            {finalists.map((team, idx) => (
              <div
                key={team.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-2 text-white transition-all",
                  idx === 0
                    ? "border-red-500/50 bg-red-950/40"
                    : "border-slate-800 bg-slate-950/60"
                )}
              >
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: team.bannerColor || "#ed1c24" }}
                />
                <div>
                  <p className="text-xs font-semibold truncate max-w-[120px] text-slate-200">
                    {team.name}
                  </p>
                  <p className="display-type text-lg font-bold text-white">
                    <AnimatedNumber value={team.score} /> <span className="text-xs font-normal text-slate-400">pts</span>
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
