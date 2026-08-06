"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
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
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { io } from "socket.io-client";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { IndonesianAnimalMascot } from "@/components/ui/mascot-avatar";
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
          <IndependenceLogo className="mx-auto size-32" />
          <h1 className="display-type mt-6 text-4xl">Event belum tersedia</h1>
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
  ].join("-");

  return (
    <main className="projection-shell independence-stage flex h-screen min-h-[620px] flex-col overflow-hidden text-[#202124]">
      <div className="independence-grid" aria-hidden="true" />
      <div className="broadcast-rail" aria-hidden="true" />
      <ProjectionHeader state={state} connected={connected} />
      <div
        key={sceneKey}
        className="scene-enter relative z-10 flex min-h-0 flex-1 flex-col p-[clamp(14px,1.7vw,30px)]"
      >
        <ProjectionScene state={state} />
      </div>
      <footer className="relative z-10 flex items-center justify-between border-t border-[#dedede] bg-white px-[clamp(16px,2.2vw,38px)] py-2.5 text-[clamp(10px,.82vw,14px)] text-[#626262]">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-8 bg-[#ed1c24]" />
          PT Wijaya Inovasi Gemilang
        </span>
        <span className="tracking-[0.16em] text-[#b5121b]">
          HUT RI KE-81 · 1945—2026
        </span>
      </footer>
    </main>
  );
}

function ProjectionScene({ state }: { state: State }) {
  const mode = state.competition.projectionMode;

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
    <header className="relative z-20 border-b border-[#dedede] bg-white px-[clamp(16px,2.2vw,38px)] py-[clamp(10px,1vw,16px)]">
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-[clamp(12px,1.35vw,22px)]">
          <IndependenceLogo className="size-[clamp(58px,5.2vw,84px)] shrink-0" />
          <div className="h-12 w-px shrink-0 bg-[#dedede]" />
          <div className="min-w-0">
            <p className="truncate text-[clamp(10px,.86vw,14px)] tracking-[0.18em] text-[#b5121b]">
              PT WIJAYA INOVASI GEMILANG · HUT RI KE-81
            </p>
            <h1 className="display-type truncate text-[clamp(26px,2.7vw,46px)] leading-[.95] tracking-tight text-[#181818]">
              {projectionTitle(state)}
            </h1>
            <p className="truncate text-[clamp(10px,.82vw,13px)] text-[#747474]">
              {state.event.name} · {state.flow.shortLabel}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 border px-4 py-2 text-[clamp(11px,.9vw,14px)]",
            connected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          <span className={cn("live-orb", connected && "is-live")} />
          {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
          {connected ? "Realtime" : "Menyambungkan"}
        </div>
      </div>
    </header>
  );
}

function BreakScene({ state }: { state: State }) {
  return (
    <section className="relative flex flex-1 items-center overflow-hidden border border-[#dedede] bg-white">
      <div className="break-red-block" aria-hidden="true" />
      <div className="relative z-10 grid w-full grid-cols-[minmax(240px,.72fr)_minmax(0,1.28fr)] items-center gap-[clamp(28px,5vw,92px)] px-[clamp(28px,6vw,110px)]">
        <div className="motion-float mx-auto">
          <IndependenceLogo className="size-[clamp(180px,22vw,340px)]" />
        </div>
        <div>
          <p className="text-[clamp(11px,1vw,16px)] tracking-[0.36em] text-[#b5121b]">
            INTERMISSION
          </p>
          <h2 className="display-type mt-4 max-w-5xl text-[clamp(42px,5.5vw,88px)] leading-[.98] text-[#191919]">
            {state.competition.projectionMessage ||
              "Acara akan segera dilanjutkan."}
          </h2>
          <div className="mt-9 h-1 w-56 overflow-hidden bg-[#ececec]">
            <div className="break-progress h-full w-1/2 bg-[#ed1c24]" />
          </div>
          <p className="mt-6 text-[clamp(13px,1.15vw,19px)] text-[#747474]">
            Tetap bersama kami · HUT Republik Indonesia Ke-81
          </p>
        </div>
      </div>
    </section>
  );
}

function PreliminaryLiveScene({ state }: { state: State }) {
  return (
    <section className="flex flex-1 flex-col">
      <SceneIntro
        eyebrow="Babak Penyisihan"
        title="Empat sesi · Empat tiket menuju Final"
        description="Peringkat diperbarui langsung dari meja operator."
      />
      <div className="mt-[clamp(14px,1.6vw,26px)] grid min-h-0 flex-1 grid-cols-4 gap-[clamp(8px,1vw,18px)]">
        {state.preliminarySessions.map((session, sessionIndex) => (
          <article
            key={session.sessionNumber}
            className="team-reveal broadcast-card overflow-hidden"
            style={delayStyle(sessionIndex)}
          >
            <header className="flex items-center justify-between border-b border-[#e0e0e0] bg-[#fafafa] px-[clamp(12px,1.2vw,20px)] py-[clamp(10px,1vw,16px)]">
              <div>
                <p className="text-[clamp(9px,.75vw,12px)] tracking-[0.16em] text-[#b5121b]">
                  PENYISIHAN
                </p>
                <h2 className="display-type text-[clamp(18px,1.7vw,28px)]">
                  Sesi {session.sessionNumber}
                </h2>
              </div>
              {session.winner ? (
                <CheckCircle2 className="text-emerald-600" />
              ) : (
                <Radio className="text-[#8a8a8a]" />
              )}
            </header>
            <div>
              {session.entries.map((team) => (
                <div
                  key={team.id}
                  className={cn(
                    "grid grid-cols-[28px_34px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#ededed] px-[clamp(8px,.8vw,14px)] py-[clamp(7px,.68vw,11px)] last:border-b-0",
                    team.isWinner && "bg-emerald-50",
                  )}
                >
                  <span className="text-center text-[clamp(11px,.95vw,15px)] text-[#868686]">
                    {team.rank ? `#${team.rank}` : "—"}
                  </span>
                  <TeamAvatar team={team} size="sm" />
                  <span className="truncate text-[clamp(12px,1vw,17px)] font-medium text-[#202020]">
                    {team.name}
                  </span>
                  <span className="text-right">
                    <span className="score-type block text-[clamp(14px,1.2vw,20px)] tabular-nums text-[#1b1b1b]">
                      {team.score ?? "—"}
                    </span>
                    <span className="block text-[clamp(8px,.65vw,11px)] text-[#858585]">
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
    <section className="flex flex-1 flex-col">
      <SceneIntro
        eyebrow="Hasil Babak Penyisihan"
        title="Empat tim melaju ke Babak Final"
        description="Masing-masing tim merupakan pemenang dari satu sesi penyisihan."
      />
      <div className="mt-[clamp(18px,2vw,34px)] grid flex-1 grid-cols-4 gap-[clamp(10px,1.3vw,22px)]">
        {winners.map(({ sessionNumber, team }, index) => (
          <article
            key={sessionNumber}
            className="team-reveal result-card relative min-h-[46vh] overflow-hidden border border-[#dedede] bg-white"
            style={delayStyle(index)}
          >
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
              <div className="absolute inset-0 grid place-items-center bg-[#fafafa]">
                <TeamAvatar team={team} size="hero" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-[#fafafa]" />
            )}
            <div className="winner-photo-shade absolute inset-0" />
            <div className="relative flex h-full flex-col justify-end p-[clamp(16px,2vw,32px)]">
              <Medal className="mb-auto size-[clamp(34px,4vw,62px)] text-[#ed1c24]" />
              <p className="text-[clamp(10px,.9vw,14px)] tracking-[0.18em] text-[#b5121b]">
                PEMENANG SESI {sessionNumber}
              </p>
              <h3 className="display-type mt-2 text-[clamp(27px,3vw,50px)] leading-none text-[#171717]">
                {team?.name ?? "Menunggu hasil"}
              </h3>
              {team ? (
                <p className="mt-3 text-[clamp(12px,1.05vw,17px)] text-[#5e5e5e]">
                  {team.score} poin · {formatDuration(team.completionSeconds)}
                </p>
              ) : null}
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
    <section className="flex flex-1 flex-col">
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
      <div className="mt-[clamp(18px,2vw,34px)] grid flex-1 grid-cols-4 gap-[clamp(10px,1.3vw,22px)]">
        {state.finalists.map((team, index) => {
          const selected = team.id === selectedId;

          return (
            <article
              key={team.id}
              className={cn(
                "team-reveal result-card relative min-h-[47vh] overflow-hidden border bg-white",
                selected
                  ? "border-[#ed1c24] ring-2 ring-[#ed1c24]/15"
                  : isGrandSelection
                    ? "border-[#e5e5e5] opacity-45 grayscale"
                    : "border-[#dedede]",
              )}
              style={delayStyle(index)}
            >
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
                <div className="absolute inset-0 grid place-items-center bg-[#fafafa]">
                  <TeamAvatar team={team} size="hero" />
                </div>
              )}
              <div className="winner-photo-shade absolute inset-0" />
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: team.bannerColor }}
              />
              <div className="relative flex h-full flex-col justify-end p-[clamp(16px,2vw,32px)]">
                <span className="mb-auto grid size-10 place-items-center border border-[#d5d5d5] bg-white text-sm text-[#242424]">
                  {selected ? <Crown size={18} /> : index + 1}
                </span>
                <p className="text-[clamp(10px,.88vw,14px)] tracking-[0.16em] text-[#b5121b]">
                  {selected
                    ? "LOLOS KE GRAND FINAL"
                    : `PEMENANG PENYISIHAN ${team.sourceSession}`}
                </p>
                <h3 className="display-type mt-2 text-[clamp(28px,3.2vw,52px)] leading-none text-[#171717]">
                  {team.name}
                </h3>
                <p className="mt-3 text-[clamp(12px,1vw,16px)] text-[#626262]">
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
    <section className="flex flex-1 flex-col">
      <SceneIntro
        eyebrow={`Replay · Final Sesi ${session}`}
        title={`Leaderboard hasil Sesi ${session}`}
        description="Peringkat berikut hanya menghitung perubahan poin pada sesi ini."
      />
      <div className="mx-auto mt-[clamp(18px,2vw,34px)] grid w-full max-w-6xl flex-1 content-center gap-3">
        {teams.map((team) => (
          <article
            key={team.id}
            className={cn(
              "team-reveal leaderboard-row grid grid-cols-[70px_70px_minmax(0,1fr)_auto] items-center gap-4 border px-[clamp(16px,2vw,32px)] py-[clamp(12px,1.35vw,22px)]",
              team.sessionRank === 1
                ? "leaderboard-row-winner border-[#ed1c24] bg-[#fff4f4]"
                : "border-[#dedede] bg-white",
            )}
            style={delayStyle(team.index)}
          >
            <span className="score-type text-center text-[clamp(25px,2.6vw,42px)] text-[#8a8a8a]">
              #{team.sessionRank}
            </span>
            <TeamAvatar team={team} size="lg" />
            <div className="min-w-0">
              <p className="display-type truncate text-[clamp(22px,2.4vw,40px)] text-[#181818]">
                {team.name}
              </p>
              <p className="text-[clamp(11px,.9vw,15px)] text-[#747474]">
                Poin khusus Final Sesi {session}
              </p>
            </div>
            <p className="score-type text-[clamp(34px,4vw,66px)] tabular-nums text-[#b5121b]">
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
    <section className="grid flex-1 grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] gap-[clamp(14px,1.6vw,28px)]">
      <div className="flex flex-col gap-[clamp(14px,1.6vw,26px)]">
        <div className="question-stage relative flex flex-1 items-center overflow-hidden border border-[#d9d9d9] bg-white p-[clamp(24px,3vw,52px)]">
          <div className="question-orbit" aria-hidden="true" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-[#b5121b]">
              <Target />
              <p className="text-[clamp(11px,.95vw,15px)] tracking-[0.2em]">
                PERTANYAAN SAAT INI
              </p>
            </div>
            <p className="score-type mt-4 text-[clamp(76px,10vw,160px)] leading-none tabular-nums text-[#ed1c24]">
              {state.competition.currentQuestion}
              <span className="ml-3 text-[.28em] text-[#999]">
                /{state.flow.totalQuestions}
              </span>
            </p>
            <p className="mt-5 max-w-3xl text-[clamp(17px,1.65vw,28px)] text-[#4f4f4f]">
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
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
      <SceneIntro
        eyebrow="Live Standings"
        title={title}
        description="Akumulasi poin dari seluruh sesi Babak Final."
      />
      <div className="mt-[clamp(18px,2vw,34px)] flex-1">
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
    <div className="broadcast-card h-full overflow-hidden">
      <header className="flex items-center justify-between border-b border-[#dedede] bg-[#fafafa] px-[clamp(18px,2vw,32px)] py-[clamp(14px,1.4vw,22px)]">
        <span className="flex items-center gap-3">
          <Trophy className="text-[#ed1c24]" />
          <span className="display-type text-[clamp(17px,1.6vw,27px)]">
            Skor Babak Final
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs tracking-[0.16em] text-[#777]">
          <span className="live-orb is-live" />
          REALTIME
        </span>
      </header>
      <div className={cn("grid gap-2 p-3", !compact && "content-center")}>
        {state.leaderboard.map((team, index) => (
          <article
            key={team.id}
            className={cn(
              "team-reveal leaderboard-row grid items-center gap-3 border border-[#e2e2e2] bg-white",
              compact
                ? "grid-cols-[42px_48px_minmax(0,1fr)_auto] px-3 py-3"
                : "grid-cols-[64px_68px_minmax(0,1fr)_auto] px-[clamp(16px,2vw,32px)] py-[clamp(13px,1.35vw,22px)]",
              team.rank === 1 &&
                "leaderboard-row-winner border-[#ed1c24] bg-[#fff4f4]",
            )}
            style={delayStyle(index)}
          >
            <span
              className={cn(
                "score-type text-center text-[#8a8a8a]",
                compact ? "text-xl" : "text-[clamp(25px,2.5vw,42px)]",
              )}
            >
              #{team.rank}
            </span>
            <TeamAvatar team={team} size={compact ? "md" : "lg"} />
            <div className="min-w-0">
              <p
                className={cn(
                  "display-type truncate text-[#181818]",
                  compact
                    ? "text-[clamp(16px,1.5vw,24px)]"
                    : "text-[clamp(22px,2.3vw,38px)]",
                )}
              >
                {team.name}
              </p>
              <p className="mt-1 text-[clamp(9px,.78vw,13px)] text-[#767676]">
                S1 {team.sessionScores.session1} · S2{" "}
                {team.sessionScores.session2} · S3{" "}
                {team.sessionScores.session3}
              </p>
            </div>
            <span
              className={cn(
                "score-type tabular-nums text-[#b5121b]",
                compact
                  ? "text-[clamp(28px,2.8vw,46px)]"
                  : "text-[clamp(38px,4.2vw,70px)]",
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
    <section className="grid flex-1 grid-cols-[minmax(360px,.85fr)_minmax(0,1.15fr)] items-center gap-[clamp(24px,4vw,72px)]">
      <div className="team-reveal result-card relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden border border-[#d8d8d8] bg-white">
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
          <div className="grid h-full place-items-center">
            <TeamAvatar team={selected} size="hero" />
          </div>
        )}
        <div className="winner-photo-shade absolute inset-0" />
      </div>
      <div className="scene-enter">
        <Crown className="size-[clamp(56px,6vw,96px)] text-[#ed1c24]" />
        <p className="mt-7 text-[clamp(12px,1.1vw,18px)] tracking-[0.24em] text-[#b5121b]">
          LOLOS KE GRAND FINAL
        </p>
        <h2 className="display-type mt-3 text-[clamp(58px,7vw,112px)] leading-[.92] tracking-tight text-[#181818]">
          {selected.name}
        </h2>
        <p className="mt-7 text-[clamp(18px,1.8vw,30px)] text-[#5f5f5f]">
          Peringkat pertama dengan{" "}
          <span className="font-medium text-[#b5121b]">{selected.score} poin</span>
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
    <section className="grid flex-1 grid-cols-[minmax(340px,.72fr)_minmax(0,1.28fr)] gap-[clamp(18px,2vw,34px)]">
      <article className="result-card relative overflow-hidden border border-[#dedede] bg-white">
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
        <div className="relative flex h-full flex-col justify-end p-[clamp(20px,2.5vw,42px)]">
          <Crown className="mb-auto size-[clamp(42px,4.5vw,72px)] text-[#ed1c24]" />
          <p className="text-[clamp(10px,.92vw,15px)] tracking-[0.2em] text-[#b5121b]">
            PESERTA GRAND FINAL
          </p>
          <h2 className="display-type mt-2 text-[clamp(40px,4.8vw,78px)] leading-none text-[#181818]">
            {team.name}
          </h2>
        </div>
      </article>
      <div className="flex flex-col gap-[clamp(14px,1.5vw,24px)]">
        <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden border border-[#dedede] bg-[#dedede]">
          <GrandMetric
            label="Pertanyaan"
            value={`${state.competition.currentQuestion} / 4`}
          />
          <GrandMetric
            label="Hadiah aman"
            value={formatRupiah(state.competition.grandPrize)}
            accent
          />
          <div className="col-span-2 bg-[#fff4f4] p-[clamp(20px,2.5vw,42px)]">
            <p className="text-[clamp(10px,.88vw,14px)] tracking-[0.18em] text-[#b5121b]">
              STATUS SAAT INI
            </p>
            <p className="display-type mt-3 text-[clamp(30px,3.8vw,62px)] leading-tight text-[#191919]">
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
    <section className="relative flex flex-1 items-center justify-center">
      <div className="winner-burst" aria-hidden="true" />
      <div className="relative z-10 grid w-full max-w-7xl grid-cols-[minmax(340px,.78fr)_minmax(0,1.22fr)] items-center gap-[clamp(30px,5vw,86px)]">
        <div className="team-reveal result-card relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden border border-[#d8d8d8] bg-white">
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
            <div className="grid h-full place-items-center">
              <TeamAvatar team={winner} size="hero" />
            </div>
          )}
          <div className="winner-photo-shade absolute inset-0" />
        </div>
        <div className="scene-enter">
          {state.competition.grandPrize > 0 ? (
            <Sparkles className="size-[clamp(56px,6vw,96px)] text-[#ed1c24]" />
          ) : (
            <Award className="size-[clamp(56px,6vw,96px)] text-[#ed1c24]" />
          )}
          <p className="mt-7 text-[clamp(12px,1.1vw,18px)] tracking-[0.28em] text-[#b5121b]">
            HASIL AKHIR GRAND FINAL
          </p>
          <h2 className="display-type mt-3 text-[clamp(58px,7.2vw,116px)] leading-[.9] tracking-tight text-[#181818]">
            {winner.name}
          </h2>
          <div className="mt-9 border-l-4 border-[#ed1c24] pl-6">
            <p className="text-[clamp(14px,1.3vw,22px)] text-[#6a6a6a]">
              Hadiah yang diperoleh
            </p>
            <p className="score-type mt-1 text-[clamp(38px,4.8vw,78px)] text-[#b5121b]">
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
    <div className="ticker-card overflow-hidden border border-[#dedede] bg-white">
      <div className="flex items-center gap-3 border-b border-[#e5e5e5] bg-[#fafafa] px-5 py-3 text-[#b5121b]">
        <Radio size={17} />
        <span className="text-xs tracking-[0.18em]">HASIL TERAKHIR</span>
      </div>
      <div className="flex min-h-20 items-center justify-between gap-4 px-5 py-4">
        <p className="text-[clamp(15px,1.45vw,24px)] text-[#353535]">
          {action?.description ?? "Menunggu hasil pertanyaan."}
        </p>
        {action?.deltas.length ? (
          <div className="flex shrink-0 gap-2">
            {action.deltas.map((delta) => (
              <span
                key={`${action.id}-${delta.teamId}`}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[clamp(11px,.9vw,14px)]",
                  delta.points > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-[#b5121b]",
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
    <div className="bg-white p-[clamp(20px,2.5vw,42px)]">
      <p className="text-[clamp(10px,.88vw,14px)] tracking-[0.16em] text-[#777]">
        {label.toUpperCase()}
      </p>
      <p
        className={cn(
          "score-type mt-3 text-[clamp(28px,3.4vw,56px)] leading-tight text-[#1c1c1c]",
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
    <header>
      <p className="flex items-center gap-3 text-[clamp(10px,.88vw,14px)] tracking-[0.22em] text-[#b5121b]">
        <span className="h-1.5 w-9 bg-[#ed1c24]" />
        {eyebrow.toUpperCase()}
      </p>
      <div className="mt-2 flex items-end justify-between gap-8">
        <h2 className="display-type text-[clamp(32px,4.2vw,68px)] leading-none tracking-tight text-[#181818]">
          {title}
        </h2>
        <p className="max-w-xl text-right text-[clamp(12px,1vw,17px)] leading-relaxed text-[#666]">
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
        "brand-logo-window relative overflow-hidden bg-white",
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
    sm: "size-8 text-xs",
    md: "size-12 text-sm",
    lg: "size-16 text-xl",
    hero: "size-40 text-5xl",
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
          sizes={size === "hero" ? "160px" : "64px"}
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
