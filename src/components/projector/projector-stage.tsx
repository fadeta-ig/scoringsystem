"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Award,
  CheckCircle2,
  Crown,
  Medal,
  Radio,
  Sparkles,
  Target,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import { io } from "socket.io-client";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { IndonesianAnimalMascot } from "@/components/ui/mascot-avatar";
import { QuestionSlideScene } from "@/components/projector/question-slide-scene";
import { formatDuration } from "@/lib/competition-rules";
import type { LiveState } from "@/lib/live-state";
import { shouldApplyLiveState } from "@/lib/live-state-client";
import { cn } from "@/lib/utils";

type State = NonNullable<LiveState>;
type TeamProfile = {
  id: string;
  name: string;
  photoPath: string | null;
  bannerColor: string;
};

export function ProjectorStage({
  initialState,
}: {
  initialState: LiveState;
}) {
  const [state, setState] = useState(initialState);
  const [connected, setConnected] = useState(false);
  const stateRef = useRef(initialState);

  useEffect(() => {
    function applyState(nextState: LiveState) {
      if (!shouldApplyLiveState(stateRef.current, nextState)) {
        return;
      }

      stateRef.current = nextState;
      setState(nextState);
    }

    async function refreshState() {
      const response = await fetch("/api/live-state", { cache: "no-store" });

      if (response.ok) {
        applyState(await response.json());
      }
    }

    const socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connect", () => {
      setConnected(true);
      refreshState().catch(() => undefined);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("live-state", (nextState: LiveState) => applyState(nextState));
    socket.io.on("reconnect", () => {
      refreshState().catch(() => undefined);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (!state) {
    return (
      <main className="projection-shell independence-stage grid min-h-screen place-items-center text-[#202124]">
        <div className="scene-enter text-center">
          <IndependenceLogo className="mx-auto size-24 sm:size-32" />
          <h1 className="display-type mt-4 text-3xl sm:text-4xl font-bold">Event belum tersedia</h1>
        </div>
      </main>
    );
  }

  const sceneKey = [
    state.competition.projectionMode,
    state.competition.projectionSession,
    state.competition.stage,
    state.competition.currentQuestion,
    state.competition.grandPrize,
    state.competition.questionSlideStatus,
  ].join("-");

  return (
    <main className="projection-shell independence-stage flex h-screen w-screen min-h-[520px] flex-col overflow-hidden text-[#202124]">
      <div className="independence-grid" aria-hidden="true" />
      <div className="broadcast-rail" aria-hidden="true" />
      <ProjectionHeader state={state} connected={connected} />
      <div
        key={sceneKey}
        className="scene-enter relative z-10 flex min-h-0 flex-1 flex-col p-[clamp(8px,1vw,16px)] overflow-hidden"
      >
        <ProjectionScene state={state} />
      </div>
      <footer className="relative z-10 flex shrink-0 items-center justify-between border-t border-[#dedede] bg-white/95 px-[clamp(14px,1.8vw,32px)] py-1.5 text-[clamp(10px,.75vw,13px)] text-[#626262] shadow-xs">
        <span className="flex items-center gap-2 font-medium">
          <span className="h-1.5 w-6 bg-[#ed1c24]" />
          PT Wijaya Inovasi Gemilang
        </span>
        <span className="font-semibold tracking-[0.16em] text-[#b5121b]">
          HUT RI KE-81 · 1945—2026
        </span>
      </footer>
    </main>
  );
}

function ProjectionScene({ state }: { state: State }) {
  const mode = state.competition.projectionMode;

  if (mode === "QUESTION_SLIDE") {
    return <QuestionSlideScene state={state} />;
  }

  if (mode === "BREAK") {
    return <BreakScene state={state} />;
  }

  if (mode === "SESSION_RESULT") {
    return <SessionResultScene state={state} />;
  }

  if (mode === "PRELIMINARY_RESULTS") {
    return <PreliminaryResultsScene state={state} />;
  }

  if (mode === "QUALIFIERS") {
    return <QualifiersScene state={state} />;
  }

  if (mode === "LEADERBOARD") {
    return <LeaderboardScene state={state} title="Leaderboard Babak Final" />;
  }

  if (mode === "WINNER") {
    return <WinnerScene state={state} />;
  }

  if (state.competition.stage === "PRELIMINARY") {
    return <PreliminaryLiveScene state={state} />;
  }

  if (state.competition.stage.startsWith("FINAL_SESSION")) {
    return <FinalLiveScene state={state} />;
  }

  if (state.competition.stage === "FINAL_COMPLETE") {
    return state.competition.grandFinalTeamId ? (
      <GrandFinalistScene state={state} />
    ) : (
      <LeaderboardScene
        state={state}
        title="Hasil Babak Final · Menunggu Keputusan Juri"
      />
    );
  }

  if (state.competition.stage === "GRAND_FINAL") {
    return <GrandFinalLiveScene state={state} />;
  }

  return <WinnerScene state={state} />;
}

function ProjectionHeader({
  state,
  connected,
}: {
  state: State;
  connected: boolean;
}) {
  return (
    <header className="relative z-20 shrink-0 border-b border-[#dedede] bg-white/95 px-[clamp(14px,1.8vw,32px)] py-[clamp(6px,.6vw,10px)] backdrop-blur-xs">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-[clamp(10px,1vw,18px)]">
          <IndependenceLogo className="size-[clamp(38px,3.4vw,56px)] shrink-0" />
          <div className="h-8 w-px shrink-0 bg-[#dedede]" />
          <div className="min-w-0">
            <p className="truncate text-[clamp(9px,.72vw,12px)] font-bold tracking-[0.18em] text-[#b5121b]">
              PT WIJAYA INOVASI GEMILANG · HUT RI KE-81
            </p>
            <h1 className="display-type truncate text-[clamp(20px,2.2vw,36px)] leading-tight tracking-tight text-[#181818]">
              {projectionTitle(state)}
            </h1>
            <p className="truncate text-[clamp(9px,.72vw,12px)] text-[#747474]">
              {state.event.name} · {state.flow.shortLabel}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded border px-3 py-1 text-[clamp(10px,.8vw,13px)] font-semibold shadow-2xs",
            connected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          <span className={cn("live-orb", connected && "is-live")} />
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? "Realtime" : "Menyambungkan"}
        </div>
      </div>
    </header>
  );
}

function BreakScene({ state }: { state: State }) {
  return (
    <section className="relative flex flex-1 items-center overflow-hidden rounded-xl border border-[#dedede] bg-white shadow-sm">
      <div className="break-red-block" aria-hidden="true" />
      <div className="relative z-10 grid w-full grid-cols-[minmax(200px,.68fr)_minmax(0,1.32fr)] items-center gap-[clamp(20px,3.5vw,60px)] px-[clamp(20px,4vw,80px)]">
        <div className="motion-float mx-auto">
          <IndependenceLogo className="size-[clamp(140px,16vw,260px)]" />
        </div>
        <div>
          <p className="text-[clamp(10px,.85vw,14px)] font-bold tracking-[0.36em] text-[#b5121b]">
            INTERMISSION
          </p>
          <h2 className="display-type mt-2 max-w-4xl text-[clamp(32px,4vw,68px)] leading-[1.02] text-[#191919]">
            {state.competition.projectionMessage ||
              "Acara akan segera dilanjutkan."}
          </h2>
          <div className="mt-6 h-1 w-48 overflow-hidden bg-[#ececec] rounded-full">
            <div className="break-progress h-full w-1/2 bg-[#ed1c24]" />
          </div>
          <p className="mt-4 text-[clamp(12px,1vw,16px)] text-[#747474]">
            Tetap bersama kami · HUT Republik Indonesia Ke-81
          </p>
        </div>
      </div>
    </section>
  );
}

function PreliminaryLiveScene({ state }: { state: State }) {
  return (
    <section className="flex flex-1 flex-col min-h-0">
      <SceneIntro
        eyebrow="Babak Penyisihan"
        title="Empat sesi · Empat tiket menuju Final"
        description="Peringkat diperbarui langsung dari meja operator."
      />
      <div className="mt-2.5 grid min-h-0 flex-1 grid-cols-4 gap-[clamp(6px,.9vw,14px)]">
        {state.preliminarySessions.map((session, sessionIndex) => (
          <article
            key={session.sessionNumber}
            className="team-reveal broadcast-card flex flex-col overflow-hidden rounded-lg border border-[#dedede] bg-white shadow-xs"
            style={delayStyle(sessionIndex)}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[#e0e0e0] bg-[#fafafa] px-[clamp(10px,1vw,16px)] py-[clamp(8px,.8vw,12px)]">
              <div>
                <p className="text-[clamp(8px,.7vw,11px)] font-bold tracking-[0.16em] uppercase text-[#b5121b]">
                  PENYISIHAN
                </p>
                <h2 className="display-type text-[clamp(16px,1.4vw,24px)] font-bold text-[#181818]">
                  Sesi {session.sessionNumber}
                </h2>
              </div>
              {session.winner ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <Radio className="size-5 text-[#8a8a8a]" />
              )}
            </header>
            <div className="flex flex-1 flex-col justify-around min-h-0 overflow-y-auto">
              {session.entries.map((team) => (
                <div
                  key={team.id}
                  className={cn(
                    "grid grid-cols-[24px_32px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#ededed] px-[clamp(8px,.8vw,12px)] py-[clamp(5px,.5vw,9px)] last:border-b-0",
                    team.isWinner && "bg-emerald-50/80 font-semibold",
                  )}
                >
                  <span className="text-center text-[clamp(10px,.8vw,13px)] font-semibold text-[#868686]">
                    {team.rank ? `#${team.rank}` : "—"}
                  </span>
                  <TeamAvatar team={team} size="sm" />
                  <span className="truncate text-[clamp(11px,.88vw,15px)] font-medium text-[#202020]">
                    {team.name}
                  </span>
                  <span className="text-right">
                    <span className="score-type block text-[clamp(13px,1vw,18px)] font-bold tabular-nums text-[#1b1b1b]">
                      {team.score ?? "—"}
                    </span>
                    <span className="block text-[clamp(8px,.6vw,10px)] text-[#858585]">
                      {formatDuration(team.completionSeconds)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PreliminaryResultsScene({ state }: { state: State }) {
  const winners = state.preliminarySessions.map((session) => ({
    sessionNumber: session.sessionNumber,
    team: session.winner,
  }));

  return (
    <section className="flex flex-1 flex-col min-h-0">
      <SceneIntro
        eyebrow="Hasil Babak Penyisihan"
        title="Empat tim melaju ke Babak Final"
        description="Masing-masing tim merupakan pemenang dari satu sesi penyisihan."
      />
      <div className="mt-2.5 grid flex-1 min-h-0 grid-cols-4 gap-[clamp(8px,1.1vw,16px)]">
        {winners.map(({ sessionNumber, team }, index) => (
          <article
            key={sessionNumber}
            className="team-reveal result-card relative flex flex-col justify-between overflow-hidden border border-[#dedede] bg-white rounded-lg shadow-sm"
            style={delayStyle(index)}
          >
            {/* Top Media / Avatar Container */}
            <div className="relative flex h-[52%] w-full items-center justify-center overflow-hidden border-b border-[#ececec] bg-[#fafafa]">
              {team?.photoPath ? (
                <Image
                  src={team.photoPath}
                  alt={`Foto ${team.name}`}
                  fill
                  sizes="25vw"
                  className="object-cover"
                  unoptimized
                />
              ) : team ? (
                <div className="p-2">
                  <TeamAvatar team={team} size="hero" />
                </div>
              ) : (
                <div className="flex items-center justify-center text-slate-300">
                  <Medal className="size-16 opacity-30" />
                </div>
              )}
              <div className="winner-photo-shade pointer-events-none absolute inset-0" />
              <span className="absolute left-2.5 top-2.5 z-10 grid size-8 place-items-center rounded-md border border-red-200 bg-white/95 text-[#ed1c24] shadow-xs">
                <Medal size={16} />
              </span>
            </div>

            {/* Bottom Content Info Container */}
            <div className="relative flex flex-1 flex-col justify-between p-[clamp(10px,1.2vw,18px)] bg-white min-w-0">
              <div className="min-w-0">
                <p className="text-[clamp(9px,.75vw,12px)] font-bold tracking-[0.16em] uppercase text-[#b5121b]">
                  PEMENANG SESI {sessionNumber}
                </p>
                <h3 className="display-type mt-1 text-[clamp(18px,1.9vw,32px)] leading-tight tracking-tight text-[#171717] font-bold line-clamp-2 break-words">
                  {team?.name ?? "Menunggu hasil"}
                </h3>
              </div>
              {team ? (
                <p className="mt-1 text-[clamp(10px,.85vw,13px)] font-medium text-[#5e5e5e]">
                  {team.score} poin · {formatDuration(team.completionSeconds)}
                </p>
              ) : (
                <p className="mt-1 text-[clamp(10px,.85vw,13px)] text-[#888]">
                  Belum ditentukan
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function QualifiersScene({ state }: { state: State }) {
  const selectedId = state.competition.grandFinalTeamId;
  const isGrandSelection = Boolean(selectedId);

  return (
    <section className="flex flex-1 flex-col min-h-0">
      <SceneIntro
        eyebrow={isGrandSelection ? "Menuju Grand Final" : "Meet The Finalists"}
        title={
          isGrandSelection
            ? "Satu tim terbaik melaju ke Grand Final"
            : "Empat tim terbaik siap bertanding"
        }
        description={
          isGrandSelection
            ? "Peserta ditentukan dari akumulasi tiga sesi Babak Final."
            : "Skor Babak Final dimulai kembali dari nol."
        }
      />
      <div className="mt-2.5 grid flex-1 min-h-0 grid-cols-4 gap-[clamp(8px,1.1vw,16px)]">
        {state.finalists.map((team, index) => {
          const selected = team.id === selectedId;

          return (
            <article
              key={team.id}
              className={cn(
                "team-reveal result-card relative flex flex-col justify-between overflow-hidden border bg-white rounded-lg shadow-sm transition-all",
                selected
                  ? "border-[#ed1c24] ring-2 ring-[#ed1c24]/20 shadow-md"
                  : isGrandSelection
                    ? "border-[#e5e5e5] opacity-45 grayscale"
                    : "border-[#dedede]",
              )}
              style={delayStyle(index)}
            >
              {/* Top Media / Mascot Banner */}
              <div className="relative flex h-[52%] w-full items-center justify-center overflow-hidden border-b border-[#ececec] bg-[#fafafa]">
                {team.photoPath ? (
                  <Image
                    src={team.photoPath}
                    alt={`Foto ${team.name}`}
                    fill
                    sizes="25vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="p-2">
                    <TeamAvatar team={team} size="hero" />
                  </div>
                )}
                <div className="winner-photo-shade pointer-events-none absolute inset-0" />
                <div
                  className="absolute inset-x-0 top-0 h-1 z-10"
                  style={{ backgroundColor: team.bannerColor }}
                />
                <span className="absolute left-2.5 top-3 z-10 grid size-8 place-items-center rounded-md border border-[#d5d5d5] bg-white/95 text-xs font-bold text-[#242424] shadow-xs">
                  {selected ? <Crown size={16} className="text-[#ed1c24]" /> : index + 1}
                </span>
              </div>

              {/* Bottom Content Info Area */}
              <div className="relative flex flex-1 flex-col justify-between p-[clamp(10px,1.2vw,18px)] bg-white min-w-0">
                <div className="min-w-0">
                  <p className="text-[clamp(9px,.75vw,12px)] font-bold tracking-[0.16em] uppercase text-[#b5121b]">
                    {selected
                      ? "LOLOS KE GRAND FINAL"
                      : `PEMENANG PENYISIHAN ${team.sourceSession}`}
                  </p>
                  <h3 className="display-type mt-1 text-[clamp(18px,1.9vw,32px)] leading-tight tracking-tight text-[#171717] font-bold line-clamp-2 break-words">
                    {team.name}
                  </h3>
                </div>
                <p className="mt-1 text-[clamp(10px,.85vw,13px)] font-medium text-[#626262]">
                  {isGrandSelection
                    ? `${team.score} poin`
                    : `Finalis urutan ${team.finalOrder}`}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SessionResultScene({ state }: { state: State }) {
  const session = state.competition.projectionSession ?? 1;
  const key = `session${session}` as "session1" | "session2" | "session3";
  const teams = state.finalists
    .map((team) => ({ ...team, sessionScore: team.sessionScores[key] }))
    .sort(
      (a, b) =>
        b.sessionScore - a.sessionScore || a.finalOrder - b.finalOrder,
    )
    .map((team, index, list) => ({
      ...team,
      sessionRank:
        list.findIndex(
          (candidate) => candidate.sessionScore === team.sessionScore,
        ) + 1,
      index,
    }));

  return (
    <section className="flex flex-1 flex-col min-h-0">
      <SceneIntro
        eyebrow={`Replay · Final Sesi ${session}`}
        title={`Leaderboard hasil Sesi ${session}`}
        description="Peringkat berikut hanya menghitung perubahan poin pada sesi ini."
      />
      <div className="mx-auto mt-2.5 flex flex-1 flex-col justify-center w-full max-w-5xl gap-2.5 min-h-0">
        {teams.map((team) => (
          <article
            key={team.id}
            className={cn(
              "team-reveal leaderboard-row grid grid-cols-[56px_52px_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border px-[clamp(14px,1.6vw,24px)] py-[clamp(10px,1vw,16px)] shadow-xs",
              team.sessionRank === 1
                ? "leaderboard-row-winner border-[#ed1c24] bg-[#fff4f4]"
                : "border-[#dedede] bg-white",
            )}
            style={delayStyle(team.index)}
          >
            <span className="score-type text-center text-[clamp(20px,2vw,32px)] font-bold text-[#8a8a8a]">
              #{team.sessionRank}
            </span>
            <TeamAvatar team={team} size="md" />
            <div className="min-w-0">
              <p className="display-type truncate text-[clamp(18px,2vw,32px)] font-bold text-[#181818]">
                {team.name}
              </p>
              <p className="text-[clamp(10px,.8vw,13px)] text-[#747474]">
                Poin khusus Final Sesi {session}
              </p>
            </div>
            <p className="score-type text-[clamp(28px,3.2vw,52px)] font-bold tabular-nums text-[#b5121b]">
              {formatSigned(team.sessionScore)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalLiveScene({ state }: { state: State }) {
  const stage = state.competition.stage;
  const detail =
    stage === "FINAL_SESSION_1"
      ? `Giliran ${state.flow.activeTeamName ?? "tim"} · Benar +10 · Salah 0`
      : stage === "FINAL_SESSION_2"
        ? `Pertanyaan bernilai ${state.flow.questionValue} poin`
        : "Lelang maksimal 60 poin · Nilai harus habis dibagi 3";

  return (
    <section className="grid flex-1 min-h-0 grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] gap-[clamp(10px,1.4vw,22px)]">
      <div className="flex flex-col gap-[clamp(10px,1.2vw,18px)] min-h-0">
        <div className="question-stage relative flex flex-1 flex-col justify-center overflow-hidden rounded-xl border border-[#d9d9d9] bg-white p-[clamp(18px,2.2vw,38px)] shadow-sm">
          <div className="question-orbit" aria-hidden="true" />
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 text-[#b5121b]">
              <Target size={20} />
              <p className="text-[clamp(10px,.85vw,13px)] font-bold tracking-[0.2em] uppercase">
                PERTANYAAN SAAT INI
              </p>
            </div>
            <p className="score-type mt-2 text-[clamp(56px,8vw,120px)] leading-none tabular-nums text-[#ed1c24]">
              {state.competition.currentQuestion}
              <span className="ml-2 text-[.32em] text-[#999]">
                /{state.flow.totalQuestions}
              </span>
            </p>
            <p className="mt-3 max-w-2xl text-[clamp(14px,1.3vw,22px)] font-medium text-[#4f4f4f]">
              {detail}
            </p>
          </div>
        </div>
        <LastActionTicker state={state} />
      </div>
      <LeaderboardPanel state={state} compact />
    </section>
  );
}

function LeaderboardScene({
  state,
  title,
}: {
  state: State;
  title: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col min-h-0">
      <SceneIntro
        eyebrow="Live Standings"
        title={title}
        description="Akumulasi poin dari seluruh sesi Babak Final."
      />
      <div className="mt-2.5 flex-1 min-h-0">
        <LeaderboardPanel state={state} />
      </div>
    </section>
  );
}

function LeaderboardPanel({
  state,
  compact = false,
}: {
  state: State;
  compact?: boolean;
}) {
  return (
    <div className="broadcast-card flex flex-col h-full overflow-hidden rounded-xl border border-[#dedede] bg-white shadow-sm">
      <header className="flex shrink-0 items-center justify-between border-b border-[#dedede] bg-[#fafafa] px-[clamp(14px,1.6vw,24px)] py-[clamp(10px,1vw,16px)]">
        <span className="flex items-center gap-2.5">
          <Trophy className="size-5 text-[#ed1c24]" />
          <span className="display-type text-[clamp(15px,1.3vw,22px)] font-bold">
            Skor Babak Final
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#777]">
          <span className="live-orb is-live" />
          REALTIME
        </span>
      </header>
      <div className={cn("flex flex-1 flex-col justify-around p-2.5 gap-2 overflow-y-auto", !compact && "justify-center max-w-4xl mx-auto w-full")}>
        {state.leaderboard.map((team, index) => (
          <article
            key={team.id}
            className={cn(
              "team-reveal leaderboard-row grid items-center gap-3 rounded-lg border border-[#e2e2e2] bg-white shadow-xs transition-all",
              compact
                ? "grid-cols-[36px_40px_minmax(0,1fr)_auto] px-3 py-2"
                : "grid-cols-[52px_56px_minmax(0,1fr)_auto] px-[clamp(14px,1.6vw,24px)] py-[clamp(10px,1.1vw,18px)]",
              team.rank === 1 &&
                "leaderboard-row-winner border-[#ed1c24] bg-[#fff4f4]",
            )}
            style={delayStyle(index)}
          >
            <span
              className={cn(
                "score-type text-center font-bold text-[#8a8a8a]",
                compact ? "text-lg" : "text-[clamp(20px,2vw,34px)]",
              )}
            >
              #{team.rank}
            </span>
            <TeamAvatar team={team} size={compact ? "sm" : "md"} />
            <div className="min-w-0">
              <p
                className={cn(
                  "display-type truncate font-bold text-[#181818]",
                  compact
                    ? "text-[clamp(14px,1.2vw,19px)]"
                    : "text-[clamp(18px,1.9vw,30px)]",
                )}
              >
                {team.name}
              </p>
              <p className="mt-0.5 text-[clamp(9px,.72vw,12px)] text-[#767676]">
                S1 {team.sessionScores.session1} · S2{" "}
                {team.sessionScores.session2} · S3{" "}
                {team.sessionScores.session3}
              </p>
            </div>
            <span
              className={cn(
                "score-type font-bold tabular-nums text-[#b5121b]",
                compact
                  ? "text-[clamp(22px,2.2vw,36px)]"
                  : "text-[clamp(30px,3.2vw,54px)]",
              )}
            >
              <AnimatedNumber value={team.score} />
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function GrandFinalistScene({ state }: { state: State }) {
  const selected = state.finalists.find(
    (team) => team.id === state.competition.grandFinalTeamId,
  );

  if (!selected) {
    return <LeaderboardScene state={state} title="Hasil Babak Final" />;
  }

  return (
    <section className="grid flex-1 min-h-0 grid-cols-[minmax(280px,.8fr)_minmax(0,1.2fr)] items-center gap-[clamp(20px,3.5vw,56px)]">
      <div className="team-reveal result-card relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-xl border border-[#d8d8d8] bg-white shadow-md">
        {selected.photoPath ? (
          <Image
            src={selected.photoPath}
            alt={`Foto ${selected.name}`}
            fill
            sizes="40vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center bg-[#fafafa]">
            <TeamAvatar team={selected} size="hero" />
          </div>
        )}
        <div className="winner-photo-shade absolute inset-0" />
      </div>
      <div className="scene-enter">
        <Crown className="size-[clamp(44px,5vw,80px)] text-[#ed1c24]" />
        <p className="mt-4 text-[clamp(10px,1vw,16px)] font-bold tracking-[0.24em] uppercase text-[#b5121b]">
          LOLOS KE GRAND FINAL
        </p>
        <h2 className="display-type mt-2 text-[clamp(42px,5.5vw,90px)] font-bold leading-[.95] tracking-tight text-[#181818]">
          {selected.name}
        </h2>
        <p className="mt-5 text-[clamp(15px,1.5vw,24px)] text-[#5f5f5f]">
          Peringkat pertama dengan{" "}
          <span className="font-bold text-[#b5121b]">{selected.score} poin</span>
        </p>
      </div>
    </section>
  );
}

function GrandFinalLiveScene({ state }: { state: State }) {
  const team = state.finalists.find(
    (candidate) => candidate.id === state.competition.grandFinalTeamId,
  );

  if (!team) {
    return <LeaderboardScene state={state} title="Babak Grand Final" />;
  }

  return (
    <section className="grid flex-1 min-h-0 grid-cols-[minmax(280px,.68fr)_minmax(0,1.32fr)] gap-[clamp(14px,1.6vw,28px)]">
      <article className="result-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#dedede] bg-white shadow-sm">
        <div className="relative flex-1 w-full overflow-hidden bg-[#fafafa]">
          {team.photoPath ? (
            <Image
              src={team.photoPath}
              alt={`Foto ${team.name}`}
              fill
              sizes="38vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[#fafafa]">
              <TeamAvatar team={team} size="hero" />
            </div>
          )}
          <div className="winner-photo-shade absolute inset-0" />
        </div>
        <div className="relative flex flex-col justify-end p-[clamp(16px,2vw,32px)] bg-white">
          <Crown className="mb-2 size-[clamp(32px,3.5vw,56px)] text-[#ed1c24]" />
          <p className="text-[clamp(9px,.8vw,13px)] font-bold tracking-[0.2em] uppercase text-[#b5121b]">
            PESERTA GRAND FINAL
          </p>
          <h2 className="display-type mt-1 text-[clamp(30px,3.8vw,62px)] font-bold leading-none text-[#181818]">
            {team.name}
          </h2>
        </div>
      </article>
      <div className="flex flex-col gap-[clamp(10px,1.2vw,18px)] min-h-0">
        <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#dedede] bg-[#dedede] shadow-xs">
          <GrandMetric
            label="Pertanyaan"
            value={`${state.competition.currentQuestion} / 4`}
          />
          <GrandMetric
            label="Hadiah aman"
            value={formatRupiah(state.competition.grandPrize)}
            accent
          />
          <div className="col-span-2 bg-[#fff4f4] p-[clamp(16px,2vw,32px)]">
            <p className="text-[clamp(9px,.8vw,13px)] font-bold tracking-[0.18em] text-[#b5121b]">
              STATUS SAAT INI
            </p>
            <p className="display-type mt-2 text-[clamp(24px,3vw,48px)] font-bold leading-tight text-[#191919]">
              {state.competition.grandDecisionPending
                ? "Lanjut atau Tidak Lanjut?"
                : `Menjawab Pertanyaan ${state.competition.currentQuestion}`}
            </p>
          </div>
        </div>
        <LastActionTicker state={state} />
      </div>
    </section>
  );
}

function WinnerScene({ state }: { state: State }) {
  const winner =
    state.finalists.find(
      (team) => team.id === state.competition.grandFinalTeamId,
    ) ?? state.leaderboard[0];

  if (!winner) {
    return <BreakScene state={state} />;
  }

  return (
    <section className="relative flex flex-1 items-center justify-center min-h-0">
      <div className="winner-burst" aria-hidden="true" />
      <div className="relative z-10 grid w-full max-w-6xl grid-cols-[minmax(280px,.75fr)_minmax(0,1.25fr)] items-center gap-[clamp(24px,4vw,68px)]">
        <div className="team-reveal result-card relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-xl border border-[#d8d8d8] bg-white shadow-lg">
          {winner.photoPath ? (
            <Image
              src={winner.photoPath}
              alt={`Foto ${winner.name}`}
              fill
              sizes="40vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="grid h-full place-items-center bg-[#fafafa]">
              <TeamAvatar team={winner} size="hero" />
            </div>
          )}
          <div className="winner-photo-shade absolute inset-0" />
        </div>
        <div className="scene-enter">
          {state.competition.grandPrize > 0 ? (
            <Sparkles className="size-[clamp(44px,5vw,80px)] text-[#ed1c24]" />
          ) : (
            <Award className="size-[clamp(44px,5vw,80px)] text-[#ed1c24]" />
          )}
          <p className="mt-4 text-[clamp(10px,1vw,16px)] font-bold tracking-[0.28em] uppercase text-[#b5121b]">
            HASIL AKHIR GRAND FINAL
          </p>
          <h2 className="display-type mt-2 text-[clamp(44px,5.8vw,96px)] font-bold leading-[.92] tracking-tight text-[#181818]">
            {winner.name}
          </h2>
          <div className="mt-6 border-l-4 border-[#ed1c24] pl-5">
            <p className="text-[clamp(12px,1.1vw,18px)] font-medium text-[#6a6a6a]">
              Hadiah yang diperoleh
            </p>
            <p className="score-type mt-1 text-[clamp(32px,4vw,64px)] font-bold text-[#b5121b]">
              {formatRupiah(state.competition.grandPrize)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LastActionTicker({ state }: { state: State }) {
  const action = state.recentActions[0];

  return (
    <div className="ticker-card shrink-0 overflow-hidden rounded-xl border border-[#dedede] bg-white shadow-xs">
      <div className="flex items-center gap-2.5 border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-2 text-[#b5121b]">
        <Radio size={15} />
        <span className="text-[11px] font-bold tracking-[0.18em]">HASIL TERAKHIR</span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 min-h-[56px]">
        <p className="text-[clamp(13px,1.1vw,18px)] font-medium text-[#353535] truncate">
          {action?.description ?? "Menunggu hasil pertanyaan."}
        </p>
        {action?.deltas.length ? (
          <div className="flex shrink-0 gap-1.5">
            {action.deltas.map((delta) => (
              <span
                key={`${action.id}-${delta.teamId}`}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[clamp(10px,.8vw,13px)] font-bold",
                  delta.points > 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-[#b5121b] border border-red-200",
                )}
              >
                {delta.teamName} {formatSigned(delta.points)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GrandMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white p-[clamp(16px,2vw,32px)]">
      <p className="text-[clamp(9px,.8vw,13px)] font-bold tracking-[0.16em] text-[#777]">
        {label.toUpperCase()}
      </p>
      <p
        className={cn(
          "score-type mt-2 text-[clamp(22px,2.8vw,46px)] font-bold leading-tight text-[#1c1c1c]",
          accent && "text-[#b5121b]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SceneIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="shrink-0">
      <p className="flex items-center gap-2.5 text-[clamp(9px,.75vw,12px)] font-bold tracking-[0.2em] uppercase text-[#b5121b]">
        <span className="h-1.5 w-7 bg-[#ed1c24] rounded-full" />
        {eyebrow}
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-6">
        <h2 className="display-type text-[clamp(22px,2.6vw,42px)] font-bold leading-none tracking-tight text-[#181818]">
          {title}
        </h2>
        <p className="max-w-md text-right text-[clamp(10px,.82vw,13px)] leading-tight text-[#666] shrink-0">
          {description}
        </p>
      </div>
    </header>
  );
}

function IndependenceLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "brand-logo-window relative overflow-hidden bg-transparent",
        className,
      )}
      aria-label="Logo HUT Republik Indonesia Ke-81"
    >
      <Image
        src="/brand/hut-ri-81.png"
        alt=""
        fill
        sizes="340px"
        priority
        className="brand-logo-image object-contain"
      />
    </div>
  );
}

function TeamAvatar({
  team,
  size,
}: {
  team: TeamProfile;
  size: "sm" | "md" | "lg" | "hero";
}) {
  const sizeClass = {
    sm: "size-7 text-xs rounded",
    md: "size-9 text-sm rounded-md",
    lg: "size-12 text-lg rounded-lg",
    hero: "size-24 sm:size-28 text-3xl rounded-xl shadow-sm",
  }[size];

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border bg-[#f2f2f2] font-medium text-[#242424]",
        sizeClass,
      )}
      style={{ borderColor: `${team.bannerColor}88` }}
    >
      {team.photoPath ? (
        <Image
          src={team.photoPath}
          alt={`Foto ${team.name}`}
          fill
          sizes={size === "hero" ? "140px" : "64px"}
          className="object-cover"
          unoptimized
        />
      ) : (
        <IndonesianAnimalMascot seed={team.id} name={team.name} />
      )}
    </div>
  );
}

function projectionTitle(state: State) {
  const mode = state.competition.projectionMode;

  if (mode === "SESSION_RESULT") {
    return `Replay Hasil Final Sesi ${state.competition.projectionSession ?? 1}`;
  }

  const labels: Record<typeof mode, string> = {
    LIVE: state.flow.label,
    LEADERBOARD: "Leaderboard Babak Final",
    PRELIMINARY_RESULTS: "Hasil Babak Penyisihan",
    QUALIFIERS: state.competition.grandFinalTeamId
      ? "Menuju Grand Final"
      : "Meet The Finalists",
    BREAK: "Intermission",
    WINNER: "Hasil Akhir Grand Final",
    QUESTION_SLIDE: state.flow.label,
  };

  return labels[mode];
}

function delayStyle(index: number) {
  return { "--delay": `${index * 90}ms` } as CSSProperties;
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat("id-ID").format(value)}`;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
