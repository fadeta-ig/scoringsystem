"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type DeleteQuestionFileButtonProps = {
  fileId: string;
  fileName: string;
  stageLabel?: string;
  className?: string;
  variant?: "outline" | "dark" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  onDeleted?: () => void;
};

export function DeleteQuestionFileButton({
  fileId,
  fileName,
  stageLabel,
  className = "",
  variant = "outline",
  size = "sm",
  onDeleted,
}: DeleteQuestionFileButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/questions/${fileId}`, {
          method: "DELETE",
        });

        const data = await res.json();

        if (res.ok && data.ok) {
          toast.success(`File soal "${fileName}" berhasil dihapus.`);
          setIsOpen(false);
          router.refresh();
          if (onDeleted) onDeleted();
        } else {
          toast.error(data.error || "Gagal menghapus file.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan jaringan saat menghapus file.");
      }
    });
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 font-semibold ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="size-4 mr-1.5 text-red-600" />
        Hapus File Soal
      </Button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Hapus File Soal Ini?</h3>
                <p className="text-xs text-slate-500">
                  {stageLabel ? `Sesi Lomba: ${stageLabel}` : "Tindakan ini tidak dapat dibatalkan."}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50/70 p-3.5 text-xs text-red-900 space-y-2 leading-relaxed">
              <p className="font-bold">File yang akan dihapus:</p>
              <p className="font-mono text-red-800 font-semibold bg-white p-2 rounded border border-red-200 truncate">
                📄 {fileName}
              </p>
              <p className="text-slate-600">
                Setelah dihapus, pemetaan slide untuk sesi ini akan dibersihkan. Anda dapat mengunggah file presentation baru secara bersih tanpa ada bentrokan file.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                variant="dark"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4 mr-1.5" />
                    Ya, Hapus File Soal
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
