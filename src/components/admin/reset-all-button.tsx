"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resetAllCompetitionResults } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

type ResetAllButtonProps = {
  className?: string;
  variant?: "outline" | "dark" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
};

export function ResetAllButton({
  className = "",
  variant = "outline",
  size = "sm",
}: ResetAllButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const res = await resetAllCompetitionResults();

      if (res.ok) {
        toast.success(res.message);
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <RotateCcw className="size-4 mr-1.5 text-red-600" />
        Reset Semua Hasil Lomba
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
                <h3 className="text-lg font-bold text-slate-900">Reset Semua Hasil Lomba?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan!</p>
              </div>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50/60 p-3.5 text-xs text-red-900 space-y-2 leading-relaxed">
              <p className="font-semibold">Perhatian Operator:</p>
              <ul className="list-disc list-inside space-y-1 text-red-800">
                <li>Seluruh skor dan poin dari tim akan dihapus (menjadi 0 / kosong).</li>
                <li>Riwayat aksi pertandingan akan dibersihkan.</li>
                <li>Tahap pertandingan akan dikembalikan ke <strong>Babak Penyisihan</strong>.</li>
                <li>Layar proyektor akan otomatis ter-refresh ke kondisi awal.</li>
              </ul>
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
                onClick={handleReset}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Mereset...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4 mr-1.5" />
                    Ya, Reset Sekarang
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
