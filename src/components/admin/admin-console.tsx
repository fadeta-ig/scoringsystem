"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock3,
  Gavel,
  Medal,
  Radio,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  decideGrandFinal,
  savePreliminarySession,
  selectGrandFinalist,
  selectPreliminaryWinner,
  startFinal,
  startGrandFinal,
  submitGrandFinalResult,
  submitSession1Result,
  submitSession2Result,
  submitSession3Result,
  undoLastCompetitionAction,
  type ActionResult,
} from "@/app/admin/actions";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculateSession3Changes,
  formatDuration,
} from "@/lib/competition-rules";
import type { LiveState } from "@/lib/live-state";
import { shouldApplyLiveState } from "@/lib/live-state-client";
import { cn } from "@/lib/utils";
import { LiveStatusPill } from "@/components/admin/live-status-pill";
import { TeamPhotoUpload } from "@/components/admin/team-photo-upload";

type State = NonNullable<LiveState>;
type ServerAction = (formData: FormData) => Promise<ActionResult>;
type Finalist = State["finalists"][number];

const stageSteps = [
  { id: "PRELIMINARY", label: "Penyisihan" },
  { id: "FINAL_SESSION_1", label: "Final Sesi 1" },
  { id: "FINAL_SESSION_2", label: "Final Sesi 2" },
  { id: "FINAL_SESSION_3", label: "Final Sesi 3" },
  { id: "GRAND_FINAL", label: "Grand Final" },
] as const;

const stageOrder: Record<State["competition"]["stage"], number> = {
  PRELIMINARY: 0,
  FINAL_SESSION_1: 1,
  FINAL_SESSION_2: 2,
  FINAL_SESSION_3: 3,
  FINAL_COMPLETE: 3,
  GRAND_FINAL: 4,
  FINISHED: 4,
};

export function AdminConsole({ state: initialState }: { state: State }) {
  const [state, setState] = useState(initialState);
  const stateRef = useRef<LiveState>(initialState);

  useEffect(() => {
    if (!shouldApplyLiveState(stateRef.current, initialState)) {
      return;
    }

    stateRef.current = initialState;
    setState(initialState);
  }, [initialState]);

  useEffect(() => {
    function applyState(nextState: LiveState) {
      if (!nextState || !shouldApplyLiveState(stateRef.current, nextState)) {
        return;
      }

      stateRef.current = nextState;
      setState(nextState);
    }

    async function refreshAdminState() {
      const response = await fetch("/api/admin/live-state", {
        cache: "no-store",
        credentials: "same-origin",
      });

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
      refreshAdminState().catch(() => undefined);
    });
    socket.on("live-state", () => {
      refreshAdminState().catch(() => undefined);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-3 py-5 sm:px-4 sm:py-7">
      <OperatorHeader state={state} />
      <StageProgress stage={state.competition.stage} />

      {state.competition.stage === "PRELIMINARY" ? (
        <PreliminaryBoard state={state} />
      ) : null}

      {state.competition.stage.startsWith("FINAL_SESSION") ? (
        <FinalConsole state={state} />
      ) : null}

      {state.competition.stage === "FINAL_COMPLETE" ? (
        <FinalComplete state={state} />
      ) : null}

      {state.competition.stage === "GRAND_FINAL" ? (
        <GrandFinalConsole state={state} />
      ) : null}

      {state.competition.stage === "FINISHED" ? (
        <FinishedConsole state={state} />
      ) : null}
    </div>
  );
}

function OperatorHeader({ state }: { state: State }) {
  return (
    <Card className="overflow-hidden border-slate-200 border-t-2 border-t-primary bg-white py-0">
      <CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="border-red-200 bg-red-50 text-red-700">
              HUT RI Ke-81
            </Badge>
            <LiveStatusPill />
          </div>
          <h1 className="truncate text-xl font-medium tracking-tight text-slate-950 sm:text-2xl">
            {state.event.name}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Target size={16} className="text-red-600" />
            {state.flow.label}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <HeaderMetric
            label="Finalis"
            value={`${state.finalists.length}/4`}
          />
          <HeaderMetric
            label="Aksi terbaru"
            value={String(state.recentActions.length)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[116px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-black tabular-nums text-slate-950">
        {value}
      </p>
    </div>
  );
}

function StageProgress({ stage }: { stage: State["competition"]["stage"] }) {
  const activeIndex = stageOrder[stage];

  return (
    <nav
      aria-label="Tahapan lomba"
      className="grid grid-cols-5 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {stageSteps.map((step, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;

        return (
          <div
            key={step.id}
            className={cn(
              "flex min-h-14 items-center justify-center gap-2 border-r border-slate-200 px-1.5 py-2 text-center text-[11px] font-bold last:border-r-0 sm:text-sm",
              active && "bg-primary text-white",
              complete && "bg-red-50 text-red-800",
              !active && !complete && "text-slate-400",
            )}
          >
            {complete ? (
              <CheckCircle2 size={16} className="hidden shrink-0 sm:block" />
            ) : (
              <span
                className={cn(
                  "hidden size-5 shrink-0 items-center justify-center rounded-full border text-[10px] sm:flex",
                  active ? "border-white/40" : "border-current/30",
                )}
              >
                {index + 1}
              </span>
            )}
            <span>{step.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

function PreliminaryBoard({ state }: { state: State }) {
  const [selectedSession, setSelectedSession] = useState(1);
  const session =
    state.preliminarySessions.find(
      (item) => item.sessionNumber === selectedSession,
    ) ?? state.preliminarySessions[0];
  const winnerCount = state.preliminarySessions.filter(
    (item) => item.winner,
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <RuleMetric icon={<Users />} value="6 tim" label="setiap sesi" />
        <RuleMetric icon={<Clock3 />} value="15 menit" label="waktu pengerjaan" />
        <RuleMetric icon={<Target />} value="3 soal" label="pertanyaan tertulis" />
        <RuleMetric icon={<Award />} value="1 pemenang" label="lolos per sesi" />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Medal size={20} className="text-red-600" />
            Leaderboard Babak Penyisihan
          </CardTitle>
          <CardDescription>
            Input hasil manual. Nilai penyisihan hanya menentukan pemenang dan
            tidak dibawa ke Babak Final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {state.preliminarySessions.map((item) => (
              <Button
                key={item.sessionNumber}
                type="button"
                variant="outline"
                onClick={() => setSelectedSession(item.sessionNumber)}
                className={cn(
                  "h-auto min-h-14 items-start rounded-lg px-3 py-2 text-left",
                  item.sessionNumber === selectedSession
                    ? "border-primary bg-primary text-white hover:bg-primary"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-medium">
                    Sesi {item.sessionNumber}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block truncate text-[11px] font-normal",
                      item.sessionNumber === selectedSession
                        ? "text-red-100"
                        : "text-slate-500",
                    )}
                  >
                    {item.winner?.name ?? "Belum ada pemenang"}
                  </span>
                </span>
              </Button>
            ))}
          </div>

          <PreliminarySessionForm
            key={`${session.sessionNumber}-${state.generatedAt}`}
            session={session}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy size={20} className="text-[var(--heritage-gold)]" />
            Finalis Terpilih
          </CardTitle>
          <CardDescription>
            Satu pemenang dari setiap sesi akan menjadi empat peserta Babak
            Final dengan skor awal 0.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {state.preliminarySessions.map((item) => (
              <div
                key={item.sessionNumber}
                className={cn(
                  "rounded-lg border p-3",
                  item.winner
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-dashed border-slate-300 bg-slate-50",
                )}
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Pemenang Sesi {item.sessionNumber}
                </p>
                <p className="mt-1 truncate font-black text-slate-950">
                  {item.winner?.name ?? "Belum ditetapkan"}
                </p>
              </div>
            ))}
          </div>

          {winnerCount === 4 ? (
            <ActionForm action={startFinal}>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-red-950">
                      Empat finalis sudah lengkap
                    </p>
                    <p className="mt-1 text-sm text-red-800">
                      Setelah dimulai, hasil penyisihan terkunci dan skor Final
                      dimulai dari 0.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="min-h-12 bg-red-600 hover:bg-red-700"
                  >
                    Mulai Babak Final
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            </ActionForm>
          ) : (
            <p className="text-sm text-slate-500">
              Tetapkan {4 - winnerCount} pemenang lagi untuk memulai Babak
              Final.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RuleMetric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 [&_svg]:size-5">
        {icon}
      </div>
      <div>
        <p className="font-black text-slate-950">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function PreliminarySessionForm({
  session,
}: {
  session: State["preliminarySessions"][number];
}) {
  return (
    <div className="space-y-4">
      <ActionForm action={savePreliminarySession}>
        <input
          type="hidden"
          name="sessionNumber"
          value={session.sessionNumber}
        />
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-slate-50">
                <TableHead className="w-16 text-center">Peringkat</TableHead>
                <TableHead>Nama dan foto tim</TableHead>
                <TableHead className="w-36">Nilai</TableHead>
                <TableHead className="w-56">Waktu pengerjaan</TableHead>
                <TableHead className="w-32">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.entries.map((team) => (
                <TableRow
                  key={team.id}
                  className={cn(
                    "bg-white",
                    team.isWinner && "bg-emerald-50",
                  )}
                >
                  <TableCell className="text-center font-medium tabular-nums">
                    {team.rank ? `#${team.rank}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[330px] items-center gap-2">
                      <TeamPhotoUpload
                        teamId={team.id}
                        teamName={team.name}
                        photoPath={team.photoPath}
                        bannerColor={team.bannerColor}
                      />
                      <span
                        className="size-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: team.bannerColor }}
                      />
                      <Input
                        name={`name-${team.id}`}
                        defaultValue={team.name}
                        aria-label={`Nama tim ${team.name}`}
                        required
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      name={`score-${team.id}`}
                      type="number"
                      defaultValue={team.score ?? ""}
                      aria-label={`Nilai ${team.name}`}
                      placeholder="Nilai"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Input
                          name={`minutes-${team.id}`}
                          type="number"
                          min="0"
                          defaultValue={
                            team.completionSeconds === null
                              ? ""
                              : Math.floor(team.completionSeconds / 60)
                          }
                          aria-label={`Menit ${team.name}`}
                          className="pr-10"
                          placeholder="0"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          min
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          name={`seconds-${team.id}`}
                          type="number"
                          min="0"
                          max="59"
                          defaultValue={
                            team.completionSeconds === null
                              ? ""
                              : team.completionSeconds % 60
                          }
                          aria-label={`Detik ${team.name}`}
                          className="pr-10"
                          placeholder="00"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          dtk
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {team.isWinner ? (
                      <Badge className="bg-emerald-100 text-emerald-800">
                        <Check size={14} />
                        Pemenang
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {team.score === null
                          ? "Belum dinilai"
                          : formatDuration(team.completionSeconds)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" size="lg" className="min-h-12">
            <Save />
            Simpan Hasil Sesi {session.sessionNumber}
          </Button>
        </div>
      </ActionForm>

      <WinnerSelection session={session} />
    </div>
  );
}

function WinnerSelection({
  session,
}: {
  session: State["preliminarySessions"][number];
}) {
  const eligible = session.entries.filter((team) =>
    session.eligibleWinnerIds.includes(team.id),
  );

  if (!session.complete) {
    return (
      <InlineNotice tone="neutral">
        Lengkapi dan simpan nilai seluruh tim untuk menentukan kandidat
        pemenang.
      </InlineNotice>
    );
  }

  if (session.tieRequiresTime) {
    return (
      <InlineNotice tone="warning">
        Nilai tertinggi seri. Isi waktu pengerjaan tim yang seri terlebih
        dahulu.
      </InlineNotice>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3">
        <p className="font-black text-amber-950">
          {session.juryDecisionRequired
            ? "Nilai dan waktu masih seri — keputusan juri"
            : "Kandidat pemenang sesi"}
        </p>
        <p className="mt-1 text-sm text-amber-800">
          {session.juryDecisionRequired
            ? "Juri memilih berdasarkan langkah pengerjaan yang lebih detail."
            : "Konfirmasi tim dengan nilai tertinggi dan waktu tercepat."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {eligible.map((team) => (
          <ActionForm key={team.id} action={selectPreliminaryWinner}>
            <input type="hidden" name="teamId" value={team.id} />
            <Button
              type="submit"
              size="lg"
              variant={team.isWinner ? "secondary" : "dark"}
              className="min-h-12"
            >
              {session.juryDecisionRequired ? <Gavel /> : <Trophy />}
              {team.isWinner ? `${team.name} terpilih` : `Pilih ${team.name}`}
            </Button>
          </ActionForm>
        ))}
      </div>
    </div>
  );
}

function FinalConsole({ state }: { state: State }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{state.flow.label}</CardTitle>
              <CardDescription className="mt-1">
                Pertanyaan {state.competition.currentQuestion} dari{" "}
                {state.flow.totalQuestions}
              </CardDescription>
            </div>
            <div className="rounded-lg bg-[var(--ink)] px-4 py-2 text-right text-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nilai pertanyaan
              </p>
              <p className="text-xl font-black tabular-nums">
                {state.competition.stage === "FINAL_SESSION_3"
                  ? "Maks. 60"
                  : `${state.flow.questionValue} poin`}
              </p>
            </div>
          </div>
          <ProgressBar
            current={state.competition.currentQuestion}
            total={state.flow.totalQuestions ?? 1}
          />
        </CardHeader>
        <CardContent>
          {state.competition.stage === "FINAL_SESSION_1" ? (
            <Session1Panel state={state} />
          ) : null}
          {state.competition.stage === "FINAL_SESSION_2" ? (
            <Session2Panel
              key={state.competition.currentQuestion}
              state={state}
            />
          ) : null}
          {state.competition.stage === "FINAL_SESSION_3" ? (
            <Session3Panel
              key={state.competition.currentQuestion}
              state={state}
            />
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <LeaderboardPanel state={state} />
        <RecentActionPanel state={state} />
      </div>
    </div>
  );
}

function Session1Panel({ state }: { state: State }) {
  const activeTeam = state.finalists.find(
    (team) => team.id === state.flow.activeTeamId,
  );

  return (
    <ActionForm action={submitSession1Result}>
      <input
        type="hidden"
        name="expectedQuestion"
        value={state.competition.currentQuestion}
      />
      <div className="space-y-5">
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: activeTeam?.bannerColor ?? "#cbd5e1",
            backgroundColor: `${activeTeam?.bannerColor ?? "#cbd5e1"}12`,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Giliran menjawab
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {activeTeam?.name ?? "Tim belum tersedia"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Benar mendapat +10 poin. Salah tidak mengubah skor.
          </p>
        </div>
        <ResultButtons correctLabel="Benar +10" wrongLabel="Salah 0" />
      </div>
    </ActionForm>
  );
}

function Session2Panel({ state }: { state: State }) {
  return (
    <ActionForm action={submitSession2Result} resetOnSuccess>
      <input
        type="hidden"
        name="expectedQuestion"
        value={state.competition.currentQuestion}
      />
      <div className="space-y-5">
        <div>
          <Label htmlFor="session2-team" className="mb-2 block font-medium">
            Tim yang menjawab
          </Label>
          <NativeSelect id="session2-team" name="teamId" required>
            <NativeSelectOption value="">Pilih tim penjawab</NativeSelectOption>
            {state.finalists.map((team) => (
              <NativeSelectOption key={team.id} value={team.id}>
                {team.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium">
          <input
            type="checkbox"
            name="assignedByJury"
            className="size-5 accent-red-600"
          />
          <span>
            Tidak ada yang membunyikan lonceng — tim ditunjuk juri
          </span>
        </label>

        <ResultButtons
          correctLabel={`Benar +${state.flow.questionValue}`}
          wrongLabel={`Salah −${state.flow.questionValue}`}
        />
      </div>
    </ActionForm>
  );
}

function Session3Panel({ state }: { state: State }) {
  const [auctionWinnerId, setAuctionWinnerId] = useState(
    state.finalists[0]?.id ?? "",
  );
  const [targetTeamId, setTargetTeamId] = useState(
    state.finalists[1]?.id ?? "",
  );
  const [bid, setBid] = useState("60");
  const [answerMode, setAnswerMode] = useState<"SELF" | "PASS">("SELF");
  const effectiveTargetTeamId =
    targetTeamId &&
    targetTeamId !== auctionWinnerId &&
    state.finalists.some((team) => team.id === targetTeamId)
      ? targetTeamId
      : (state.finalists.find((team) => team.id !== auctionWinnerId)?.id ?? "");
  const correctChanges = useMemo(
    () =>
      previewAuctionChanges({
        state,
        auctionWinnerId,
        targetTeamId: effectiveTargetTeamId,
        bid,
        answerMode,
        outcome: "CORRECT",
      }),
    [answerMode, auctionWinnerId, bid, effectiveTargetTeamId, state],
  );
  const wrongChanges = useMemo(
    () =>
      previewAuctionChanges({
        state,
        auctionWinnerId,
        targetTeamId: effectiveTargetTeamId,
        bid,
        answerMode,
        outcome: "WRONG",
      }),
    [answerMode, auctionWinnerId, bid, effectiveTargetTeamId, state],
  );

  return (
    <ActionForm action={submitSession3Result}>
      <input
        type="hidden"
        name="expectedQuestion"
        value={state.competition.currentQuestion}
      />
      <input type="hidden" name="answerMode" value={answerMode} />
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="auction-winner" className="mb-2 block font-medium">
              Pemenang lelang
            </Label>
            <NativeSelect
              id="auction-winner"
              name="auctionWinnerId"
              value={auctionWinnerId}
              onChange={(event) => setAuctionWinnerId(event.target.value)}
              required
            >
              {state.finalists.map((team) => (
                <NativeSelectOption key={team.id} value={team.id}>
                  {team.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="auction-bid" className="mb-2 block font-medium">
              Nilai lelang
            </Label>
            <Input
              id="auction-bid"
              name="bid"
              type="number"
              min="3"
              max="60"
              step="3"
              value={bid}
              onChange={(event) => setBid(event.target.value)}
              required
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Maksimal 60 dan harus habis dibagi 3.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-950">
            Keputusan pemenang lelang
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={answerMode === "SELF"}
              onClick={() => setAnswerMode("SELF")}
              icon={<ShieldCheck />}
              title="Jawab sendiri"
              description="Pemenang lelang menjawab"
            />
            <ModeButton
              active={answerMode === "PASS"}
              onClick={() => setAnswerMode("PASS")}
              icon={<ArrowRight />}
              title="Lempar"
              description="Diberikan kepada tim lain"
            />
          </div>
        </div>

        {answerMode === "PASS" ? (
          <div>
            <Label htmlFor="target-team" className="mb-2 block font-medium">
              Tim tujuan
            </Label>
            <NativeSelect
              id="target-team"
              name="targetTeamId"
              value={effectiveTargetTeamId}
              onChange={(event) => setTargetTeamId(event.target.value)}
              required
            >
              {state.finalists
                .filter((team) => team.id !== auctionWinnerId)
                .map((team) => (
                  <NativeSelectOption key={team.id} value={team.id}>
                    {team.name}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2">
          <AuctionPreview
            title="Jika benar"
            tone="success"
            changes={correctChanges}
          />
          <AuctionPreview
            title="Jika salah"
            tone="danger"
            changes={wrongChanges}
          />
        </div>

        <ResultButtons
          correctLabel="Konfirmasi Benar"
          wrongLabel="Konfirmasi Salah"
          disabled={!correctChanges || !wrongChanges}
        />
      </div>
    </ActionForm>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant={active ? "default" : "outline"}
      className={cn(
        "h-auto min-h-20 flex-col items-stretch rounded-lg p-3 text-left",
        active
          ? "border-primary bg-primary text-white hover:bg-primary"
          : "border-slate-200 bg-white hover:bg-slate-50",
      )}
    >
      <span className="flex items-center gap-2 font-medium [&_svg]:size-4">
        {icon}
        {title}
      </span>
      <span
        className={cn(
          "mt-1 block text-xs",
          active ? "text-red-100" : "text-slate-500",
        )}
      >
        {description}
      </span>
    </Button>
  );
}

function previewAuctionChanges({
  state,
  auctionWinnerId,
  targetTeamId,
  bid,
  answerMode,
  outcome,
}: {
  state: State;
  auctionWinnerId: string;
  targetTeamId: string;
  bid: string;
  answerMode: "SELF" | "PASS";
  outcome: "CORRECT" | "WRONG";
}) {
  try {
    const changes = calculateSession3Changes({
      finalistIds: state.finalists.map((team) => team.id),
      auctionWinnerId,
      targetTeamId: answerMode === "PASS" ? targetTeamId : null,
      bid: Number.parseInt(bid, 10),
      answerMode,
      outcome,
    });

    return changes.map((change) => ({
      ...change,
      teamName:
        state.finalists.find((team) => team.id === change.teamId)?.name ??
        "Tim",
    }));
  } catch {
    return null;
  }
}

function AuctionPreview({
  title,
  changes,
  tone,
}: {
  title: string;
  changes:
    | Array<{ teamId: string; teamName: string; points: number }>
    | null;
  tone: "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50",
      )}
    >
      <p
        className={cn(
          "text-xs font-black uppercase tracking-wide",
          tone === "success" ? "text-emerald-800" : "text-red-800",
        )}
      >
        {title}
      </p>
      <div className="mt-2 space-y-1">
        {changes ? (
          changes.map((change) => (
            <div
              key={change.teamId}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate font-semibold text-slate-800">
                {change.teamName}
              </span>
              <span
                className={cn(
                  "font-black tabular-nums",
                  change.points > 0 ? "text-emerald-700" : "text-red-700",
                )}
              >
                {formatSigned(change.points)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">
            Lengkapi nilai dan pilihan lelang.
          </p>
        )}
      </div>
    </div>
  );
}

function ResultButtons({
  correctLabel,
  wrongLabel,
  disabled = false,
}: {
  correctLabel: string;
  wrongLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="submit"
        name="outcome"
        value="WRONG"
        disabled={disabled}
        className="min-h-16 bg-red-600 text-base hover:bg-red-700"
      >
        <X className="size-5" />
        {wrongLabel}
      </Button>
      <Button
        type="submit"
        name="outcome"
        value="CORRECT"
        disabled={disabled}
        className="min-h-16 bg-emerald-600 text-base hover:bg-emerald-700"
      >
        <Check className="size-5" />
        {correctLabel}
      </Button>
    </div>
  );
}

function LeaderboardPanel({
  state,
  showBreakdown = false,
}: {
  state: State;
  showBreakdown?: boolean;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy size={20} className="text-[var(--heritage-gold)]" />
          Skor Babak Final
        </CardTitle>
        <CardDescription>Skor dimulai dari 0.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {state.leaderboard.map((team) => (
          <div
            key={team.id}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2">
              <span className="text-center text-lg font-black tabular-nums text-slate-500">
                #{team.rank}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: team.bannerColor }}
                  />
                  <p className="truncate font-black text-slate-950">
                    {team.name}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-black tabular-nums text-slate-950">
                <AnimatedNumber value={team.score} />
              </p>
            </div>
            {showBreakdown ? (
              <div className="mt-2 grid grid-cols-3 gap-1 border-t border-slate-100 pt-2 text-center text-[11px]">
                <span className="text-slate-500">
                  S1{" "}
                  <b className="text-slate-800">
                    {team.sessionScores.session1}
                  </b>
                </span>
                <span className="text-slate-500">
                  S2{" "}
                  <b className="text-slate-800">
                    {team.sessionScores.session2}
                  </b>
                </span>
                <span className="text-slate-500">
                  S3{" "}
                  <b className="text-slate-800">
                    {team.sessionScores.session3}
                  </b>
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentActionPanel({ state }: { state: State }) {
  const lastAction = state.recentActions[0];

  if (!lastAction) {
    return null;
  }

  return (
    <Card className="border-slate-200 bg-slate-50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio size={17} className="text-red-600" />
          Input terakhir
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-semibold leading-relaxed text-slate-800">
          {lastAction.description}
        </p>
        {lastAction.deltas.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lastAction.deltas.map((delta) => (
              <Badge
                key={`${lastAction.id}-${delta.teamId}`}
                className={
                  delta.points > 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {delta.teamName} {formatSigned(delta.points)}
              </Badge>
            ))}
          </div>
        ) : null}
        <ActionForm action={undoLastCompetitionAction}>
          <Button
            type="submit"
            variant="outline"
            className="mt-3 min-h-11 w-full border-slate-300"
          >
            <RotateCcw />
            Batalkan input terakhir
          </Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

function FinalComplete({ state }: { state: State }) {
  const selected = state.finalists.find(
    (team) => team.id === state.competition.grandFinalTeamId,
  );
  const tie =
    !selected && state.eligibleGrandFinalists.length > 1;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Award size={24} className="text-[var(--heritage-gold)]" />
            Hasil Babak Final
          </CardTitle>
          <CardDescription>
            Peserta dengan akumulasi tertinggi melaju ke Grand Final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tie ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <Gavel className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-black text-amber-950">
                    Skor tertinggi seri — keputusan juri
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Pilih satu tim yang ditetapkan juri untuk masuk Grand Final.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {state.eligibleGrandFinalists.map((team) => (
                      <ActionForm key={team.id} action={selectGrandFinalist}>
                        <input type="hidden" name="teamId" value={team.id} />
                        <Button
                          type="submit"
                          size="lg"
                          variant="dark"
                          className="min-h-12"
                        >
                          <Gavel />
                          Pilih {team.name}
                        </Button>
                      </ActionForm>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {selected ? (
            <div
              className="rounded-xl border p-5"
              style={{
                borderColor: selected.bannerColor,
                backgroundColor: `${selected.bannerColor}12`,
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Peserta Grand Final
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {selected.name}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Skor akhir Babak Final:{" "}
                <b className="text-slate-950">{selected.score}</b>
              </p>
              <ActionForm action={startGrandFinal}>
                <Button
                  type="submit"
                  size="lg"
                  className="mt-5 min-h-12 bg-red-600 hover:bg-red-700"
                >
                  Mulai Grand Final
                  <ArrowRight />
                </Button>
              </ActionForm>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="space-y-4">
        <LeaderboardPanel state={state} showBreakdown />
        <RecentActionPanel state={state} />
      </div>
    </div>
  );
}

function GrandFinalConsole({ state }: { state: State }) {
  const question = state.competition.currentQuestion;
  const decisionPending = state.competition.grandDecisionPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="overflow-hidden border-slate-200 py-0 shadow-sm">
        <div className="bg-[var(--ink)] p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-red-200">
                Babak Grand Final
              </p>
              <h2 className="mt-1 text-3xl font-black">
                {state.competition.grandFinalTeamName}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Hadiah aman</p>
              <p className="text-2xl font-medium text-white">
                {formatRupiah(state.competition.grandPrize)}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pertanyaan
              </p>
              <p className="text-2xl font-black text-slate-950">
                {question} dari 4
              </p>
            </div>
            <Badge className="bg-amber-100 px-3 py-1.5 text-amber-900">
              +Rp500.000 jika benar
            </Badge>
          </div>

          {decisionPending ? (
            <GrandDecisionPanel state={state} />
          ) : (
            <GrandResultPanel state={state} />
          )}
        </CardContent>
      </Card>
      <div className="space-y-4">
        <GrandPrizeLadder state={state} />
        <RecentActionPanel state={state} />
      </div>
    </div>
  );
}

function GrandDecisionPanel({ state }: { state: State }) {
  return (
    <ActionForm action={decideGrandFinal}>
      <input
        type="hidden"
        name="expectedQuestion"
        value={state.competition.currentQuestion}
      />
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-lg font-black text-amber-950">
          Lanjut atau berhenti?
        </p>
        <p className="mt-1 text-sm leading-relaxed text-amber-800">
          Jika berhenti, peserta membawa pulang{" "}
          <b>{formatRupiah(state.competition.grandPrize)}</b>. Jika lanjut dan
          salah, hadiah tetap sesuai hasil pertanyaan sebelumnya.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            type="submit"
            name="decision"
            value="STOP"
            variant="outline"
            className="min-h-16 border-amber-400 bg-white text-base text-amber-950"
          >
            <ShieldCheck />
            Tidak Lanjut
          </Button>
          <Button
            type="submit"
            name="decision"
            value="CONTINUE"
            className="min-h-16 bg-red-600 text-base hover:bg-red-700"
          >
            Lanjut
            <ArrowRight />
          </Button>
        </div>
      </div>
    </ActionForm>
  );
}

function GrandResultPanel({ state }: { state: State }) {
  const question = state.competition.currentQuestion;
  const wrongLabel =
    question === 1
      ? "Salah — Gugur"
      : `Salah — tetap ${formatRupiah(state.competition.grandPrize)}`;

  return (
    <ActionForm action={submitGrandFinalResult}>
      <input type="hidden" name="expectedQuestion" value={question} />
      <div className="space-y-4">
        {question === 1 ? (
          <InlineNotice tone="warning">
            Jawaban salah pada pertanyaan pertama membuat peserta gugur tanpa
            hadiah.
          </InlineNotice>
        ) : (
          <InlineNotice tone="neutral">
            Hadiah dari pertanyaan sebelumnya sudah aman.
          </InlineNotice>
        )}
        <ResultButtons
          correctLabel="Benar +Rp500.000"
          wrongLabel={wrongLabel}
        />
      </div>
    </ActionForm>
  );
}

function GrandPrizeLadder({ state }: { state: State }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles size={20} className="text-[var(--heritage-gold)]" />
          Tangga Hadiah
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3, 4].map((question) => {
          const prize = question * 500_000;
          const achieved = state.competition.grandPrize >= prize;
          const current = state.competition.currentQuestion === question;

          return (
            <div
              key={question}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-3",
                achieved && "border-emerald-200 bg-emerald-50",
                current &&
                  !achieved &&
                  "border-amber-300 bg-amber-50 ring-1 ring-amber-200",
                !achieved &&
                  !current &&
                  "border-slate-200 bg-slate-50 text-slate-500",
              )}
            >
              <span className="font-bold">Pertanyaan {question}</span>
              <span className="font-black tabular-nums">
                {formatRupiah(prize)}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function FinishedConsole({ state }: { state: State }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="overflow-hidden border-slate-200 py-0 shadow-sm">
        <div className="border-t-4 border-t-primary bg-[var(--ink)] p-6 text-white">
          <Award size={48} className="text-red-200" />
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-red-200">
            Hasil Akhir Grand Final
          </p>
          <h2 className="mt-2 text-4xl font-black">
            {state.competition.grandFinalTeamName}
          </h2>
          <p className="mt-6 text-sm text-slate-300">Hadiah yang diperoleh</p>
          <p className="mt-1 text-5xl font-black tracking-tight text-white">
            {formatRupiah(state.competition.grandPrize)}
          </p>
          {state.competition.grandPrize === 0 ? (
            <p className="mt-3 font-semibold text-red-300">
              Gugur pada pertanyaan pertama.
            </p>
          ) : null}
        </div>
      </Card>
      <div className="space-y-4">
        <LeaderboardPanel state={state} showBreakdown />
        <RecentActionPanel state={state} />
      </div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = Math.max(0, Math.min(100, ((current - 1) / total) * 100));

  return (
    <div
      className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label="Kemajuan pertanyaan"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
    >
      <div
        className="h-full rounded-full bg-red-600 transition-[width]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function InlineNotice({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "warning";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
        tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {tone === "warning" ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}

function ActionForm({
  action,
  children,
  resetOnSuccess = false,
}: {
  action: ServerAction;
  children: ReactNode;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;

    if (submitter?.name) {
      formData.set(submitter.name, submitter.value);
    }

    startTransition(async () => {
      try {
        const result = await action(formData);

        if (result.ok) {
          toast.success(result.message);

          if (resetOnSuccess) {
            form.reset();
          }

          router.refresh();
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Koneksi gagal. Periksa jaringan lalu coba kembali.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
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
