"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Coffee,
  Crown,
  History,
  ImageIcon,
  MonitorPlay,
  Radio,
  Trophy,
  Users,
} from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  setProjectionView,
  type ActionResult,
} from "@/app/admin/actions";
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
import type { LiveState } from "@/lib/live-state";
import { shouldApplyLiveState } from "@/lib/live-state-client";
import { cn } from "@/lib/utils";

type State = NonNullable<LiveState>;
type ProjectionMode = State["competition"]["projectionMode"];

const modeLabels: Record<ProjectionMode, string> = {
  LIVE: "Live pertandingan",
  LEADERBOARD: "Leaderboard Final",
  SESSION_RESULT: "Replay hasil sesi",
  PRELIMINARY_RESULTS: "Hasil penyisihan",
  QUALIFIERS: "Tim yang lolos",
  BREAK: "Break",
  WINNER: "Pemenang",
};

export function ProjectionControlRoom({
  initialState,
}: {
  initialState: State;
}) {
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

    async function refreshState() {
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

    socket.on("live-state", () => {
      refreshState().catch(() => undefined);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const uploadedPhotos = state.preliminarySessions
    .flatMap((session) => session.entries)
    .filter((team) => team.photoPath).length;
  const selectedSession = state.competition.projectionSession;

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-4 sm:py-7 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card className="border-t-2 border-t-primary">
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge className="mb-3 border-red-200 bg-red-50 text-primary">
                Ruang Proyeksi
              </Badge>
              <CardTitle className="text-2xl">Kontrol tampilan layar</CardTitle>
              <CardDescription className="mt-2 max-w-2xl leading-relaxed">
                Pilih satu tampilan untuk ditayangkan. Perubahan langsung
                diteruskan ke layar proyeksi tanpa mengubah skor.
              </CardDescription>
            </div>
            <Button asChild variant="dark">
              <a href="/proyeksi" target="_blank" rel="noreferrer">
                <MonitorPlay />
                Buka layar
              </a>
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preset utama</CardTitle>
            <CardDescription>
              Gunakan Live selama pertandingan, lalu pilih preset reveal atau
              replay saat jeda.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProjectionPreset
              mode="LIVE"
              title="Live pertandingan"
              description="Mengikuti babak dan pertanyaan aktif."
              icon={<Radio />}
              active={state.competition.projectionMode === "LIVE"}
            />
            <ProjectionPreset
              mode="LEADERBOARD"
              title="Leaderboard Final"
              description="Menampilkan peringkat akumulasi terbaru."
              icon={<Trophy />}
              active={state.competition.projectionMode === "LEADERBOARD"}
              disabled={!state.finalists.length}
            />
            <ProjectionPreset
              mode="PRELIMINARY_RESULTS"
              title="Hasil Penyisihan"
              description="Replay empat pemenang dari setiap sesi."
              icon={<History />}
              active={
                state.competition.projectionMode === "PRELIMINARY_RESULTS"
              }
            />
            <ProjectionPreset
              mode="QUALIFIERS"
              title="Tim yang Lolos"
              description="Reveal tim finalis beserta foto."
              icon={<Users />}
              active={state.competition.projectionMode === "QUALIFIERS"}
              disabled={!state.finalists.length}
            />
            <ProjectionPreset
              mode="WINNER"
              title="Pemenang"
              description="Menampilkan pemenang dan hadiah akhir."
              icon={<Crown />}
              active={state.competition.projectionMode === "WINNER"}
              disabled={
                state.competition.stage !== "FINISHED" ||
                !state.competition.grandFinalTeamId
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replay hasil Final</CardTitle>
            <CardDescription>
              Peringkat dihitung khusus dari poin pada sesi yang dipilih.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((session) => (
              <ProjectionPreset
                key={session}
                mode="SESSION_RESULT"
                session={session}
                title={`Sesi ${session}`}
                description={`Hasil poin Final Sesi ${session}.`}
                icon={<History />}
                active={
                  state.competition.projectionMode === "SESSION_RESULT" &&
                  selectedSession === session
                }
                compact
                disabled={!state.finalists.length}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Layar break</CardTitle>
            <CardDescription>
              Tampilkan pesan singkat saat istirahat atau persiapan sesi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectionActionForm>
              <input type="hidden" name="mode" value="BREAK" />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  name="message"
                  maxLength={120}
                  defaultValue={
                    state.competition.projectionMessage ??
                    "Acara akan segera dilanjutkan."
                  }
                  aria-label="Pesan layar break"
                  placeholder="Tulis pesan break"
                />
                <Button
                  type="submit"
                  variant={
                    state.competition.projectionMode === "BREAK"
                      ? "dark"
                      : "outline"
                  }
                  className="sm:min-w-40"
                >
                  <Coffee />
                  Tampilkan Break
                </Button>
              </div>
            </ProjectionActionForm>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <Card className="overflow-hidden border-slate-300 py-0">
          <div className="bg-[var(--ink)] p-5 text-white">
            <p className="text-xs tracking-[0.16em] text-red-200">
              SEDANG TAYANG
            </p>
            <p className="mt-2 text-2xl font-medium">
              {modeLabels[state.competition.projectionMode]}
            </p>
            {state.competition.projectionMode === "SESSION_RESULT" ? (
              <p className="mt-1 text-sm text-slate-300">
                Final Sesi {selectedSession}
              </p>
            ) : null}
          </div>
          <CardContent className="space-y-4 p-5">
            <StatusRow label="Tahap lomba" value={state.flow.shortLabel} />
            <StatusRow
              label="Foto tim"
              value={`${uploadedPhotos}/24 tersedia`}
            />
            <StatusRow
              label="Finalis"
              value={`${state.finalists.length}/4 tim`}
            />
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm leading-relaxed text-red-800">
              Perpindahan otomatis ke replay hasil terjadi setelah Final Sesi 1,
              2, dan 3 selesai.
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function ProjectionPreset({
  mode,
  session,
  title,
  description,
  icon,
  active,
  compact = false,
  disabled = false,
}: {
  mode: ProjectionMode;
  session?: number;
  title: string;
  description: string;
  icon: ReactNode;
  active: boolean;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <ProjectionActionForm>
      <input type="hidden" name="mode" value={mode} />
      {session ? <input type="hidden" name="session" value={session} /> : null}
      <Button
        type="submit"
        variant="outline"
        disabled={disabled}
        className={cn(
          "h-auto w-full items-start justify-start whitespace-normal rounded-xl p-4 text-left",
          !compact && "min-h-28",
          active &&
            "border-primary bg-red-50 text-primary hover:border-primary hover:bg-red-50",
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 [&_svg]:size-4",
            active && "bg-primary text-white",
          )}
        >
          {active ? <Check /> : icon}
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">
            {description}
          </span>
        </span>
      </Button>
    </ProjectionActionForm>
  );
}

function ProjectionActionForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result: ActionResult = await setProjectionView(formData);

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className={cn(pending && "pointer-events-none opacity-60")}
    >
      {children}
    </form>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="flex items-center gap-2 text-slate-500">
        <ImageIcon size={15} />
        {label}
      </span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
