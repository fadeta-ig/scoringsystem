"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { IndonesianAnimalMascot } from "@/components/ui/mascot-avatar";

export function TeamPhotoUpload({
  teamId,
  teamName,
  photoPath: initialPhotoPath,
  bannerColor,
}: {
  teamId: string;
  teamName: string;
  photoPath: string | null;
  bannerColor: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [photoPath, setPhotoPath] = useState(initialPhotoPath);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 2 MB.");
      return;
    }

    setBusy(true);
    const formData = new FormData();
    formData.set("photo", file);

    try {
      const response = await fetch(
        `/api/admin/teams/${encodeURIComponent(teamId)}/photo`,
        { method: "POST", body: formData },
      );
      const result = (await response.json()) as {
        ok?: boolean;
        photoPath?: string;
        error?: string;
      };

      if (!response.ok || !result.photoPath) {
        throw new Error(result.error || "Foto gagal diunggah.");
      }

      setPhotoPath(result.photoPath);
      toast.success(`Foto ${teamName} diperbarui.`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Foto gagal diunggah.",
      );
    } finally {
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function remove() {
    setBusy(true);

    try {
      const response = await fetch(
        `/api/admin/teams/${encodeURIComponent(teamId)}/photo`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Foto gagal dihapus.");
      }

      setPhotoPath(null);
      toast.success(`Foto ${teamName} dihapus.`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Foto gagal dihapus.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div
        className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-slate-50 text-slate-400 p-0.5"
        style={{ borderColor: `${bannerColor}55` }}
      >
        {photoPath ? (
          <Image
            src={photoPath}
            alt={`Foto ${teamName}`}
            fill
            sizes="48px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <IndonesianAnimalMascot seed={teamId} name={teamName} />
        )}

        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-white/80">
            <LoaderCircle className="animate-spin text-primary" size={18} />
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void upload(file);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          aria-label={`Unggah foto ${teamName}`}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={14} />
        </Button>
        {photoPath ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-slate-400 hover:text-destructive"
            disabled={busy}
            onClick={() => void remove()}
            aria-label={`Hapus foto ${teamName}`}
          >
            <Trash2 size={13} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
