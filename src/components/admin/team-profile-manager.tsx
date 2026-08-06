"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, ImageIcon, Save, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateTeamProfile,
  type ActionResult,
} from "@/app/admin/actions";
import { TeamPhotoUpload } from "@/components/admin/team-photo-upload";
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
import { cn } from "@/lib/utils";

type State = NonNullable<LiveState>;

export function TeamProfileManager({
  initialState,
}: {
  initialState: State;
}) {
  const [selectedSession, setSelectedSession] = useState(1);
  const session =
    initialState.preliminarySessions.find(
      (item) => item.sessionNumber === selectedSession,
    ) ?? initialState.preliminarySessions[0];
  const uploadedPhotos = initialState.preliminarySessions.reduce(
    (total, item) =>
      total + item.entries.filter((team) => Boolean(team.photoPath)).length,
    0,
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 py-5 sm:px-4 sm:py-7">
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
            <UsersRound size={18} />
          </div>
          <div>
            <Badge className="bg-slate-100 text-slate-700">Profil Tim</Badge>
            <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-950">
              Nama dan foto peserta
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              Perubahan dapat dilakukan kapan saja dan langsung tampil pada
              leaderboard, replay, serta reveal proyeksi.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <ImageIcon size={16} className="text-primary" />
          <span>{uploadedPhotos}/24 foto tersedia</span>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Kelompok penyisihan</CardTitle>
          <CardDescription>
            Pilih kelompok, lalu ubah profil satu tim pada satu waktu agar aman
            saat operator bekerja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="tablist"
            aria-label="Kelompok penyisihan"
          >
            {initialState.preliminarySessions.map((item) => (
              <Button
                key={item.sessionNumber}
                type="button"
                role="tab"
                aria-selected={selectedSession === item.sessionNumber}
                variant={
                  selectedSession === item.sessionNumber ? "dark" : "outline"
                }
                onClick={() => setSelectedSession(item.sessionNumber)}
              >
                Kelompok {item.sessionNumber}
                {item.winner ? <Check size={15} /> : null}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {session.entries
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((team) => (
                <TeamProfileRow
                  key={team.id}
                  team={team}
                  sessionNumber={session.sessionNumber}
                />
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamProfileRow({
  team,
  sessionNumber,
}: {
  team: State["preliminarySessions"][number]["entries"][number];
  sessionNumber: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = (await updateTeamProfile(formData)) as ActionResult;

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3",
        team.isWinner && "border-amber-300 bg-amber-50/40",
      )}
    >
      <input type="hidden" name="teamId" value={team.id} />
      <TeamPhotoUpload
        teamId={team.id}
        teamName={team.name}
        photoPath={team.photoPath}
        bannerColor={team.bannerColor}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Kelompok {sessionNumber} · Tim {team.displayOrder}
          </span>
          {team.isWinner ? (
            <Badge className="bg-amber-100 text-amber-800">Lolos</Badge>
          ) : null}
        </div>
        <Input
          name="name"
          defaultValue={team.name}
          maxLength={60}
          required
          aria-label={`Nama tim ${team.displayOrder}`}
          className="h-9"
        />
      </div>
      <Button
        type="submit"
        size="icon"
        variant="outline"
        disabled={pending}
        aria-label={`Simpan nama ${team.name}`}
      >
        <Save size={15} />
      </Button>
    </form>
  );
}
