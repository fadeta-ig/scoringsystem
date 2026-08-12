"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DeleteQuestionFileButton } from "@/components/admin/delete-question-file-button";

type QuestionUploadProps = {
  activeStage: string;
  activeFileId?: string;
  activeFileName?: string;
  activeFileStageLabel?: string;
  onUploadSuccess?: () => void;
};

const stageOptions = [
  { value: "PRELIMINARY", label: "Babak Penyisihan" },
  { value: "FINAL_SESSION_1", label: "Final Sesi 1" },
  { value: "FINAL_SESSION_2", label: "Final Sesi 2" },
  { value: "FINAL_SESSION_3", label: "Final Sesi 3" },
  { value: "GRAND_FINAL", label: "Grand Final" },
];

export function QuestionUpload({
  activeStage,
  activeFileId,
  activeFileName,
  activeFileStageLabel,
  onUploadSuccess,
}: QuestionUploadProps) {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState(
    stageOptions.some((opt) => opt.value === activeStage) ? activeStage : "PRELIMINARY"
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setUploadProgress(0);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file PDF, PPT, atau PPTX terlebih dahulu.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const CHUNK_SIZE = 512 * 1024; // 512 KB per chunk to bypass 1MB server payload limits
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, (chunkIndex + 1) * CHUNK_SIZE);
        const chunk = file.slice(start, end);

        const res = await new Promise<{ ok: boolean; data?: any; error?: string }>(
          (resolve) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const chunkLoaded = event.loaded;
                const totalBytesUploaded = start + chunkLoaded;
                const percent = Math.min(
                  99,
                  Math.round((totalBytesUploaded / file.size) * 100)
                );
                setUploadProgress(percent);
              }
            };

            xhr.onload = () => {
              try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
                  resolve({ ok: true, data });
                } else {
                  resolve({ ok: false, error: data.error || "Gagal mengunggah potongan file." });
                }
              } catch {
                resolve({ ok: false, error: "Gagal memproses respon server." });
              }
            };

            xhr.onerror = () => {
              resolve({ ok: false, error: "Terjadi kesalahan jaringan saat mengunggah." });
            };

            xhr.open("POST", "/api/admin/questions/upload-chunk", true);
            xhr.setRequestHeader("x-upload-id", uploadId);
            xhr.setRequestHeader("x-chunk-index", String(chunkIndex));
            xhr.setRequestHeader("x-total-chunks", String(totalChunks));
            xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
            xhr.setRequestHeader("x-file-stage", selectedStage);
            xhr.setRequestHeader("x-total-size", String(file.size));
            xhr.setRequestHeader("content-type", file.type || "application/pdf");
            xhr.send(chunk);
          }
        );

        if (!res.ok) {
          throw new Error(res.error || `Gagal mengunggah potongan ${chunkIndex + 1}.`);
        }

        if (chunkIndex === totalChunks - 1 && res.data?.file) {
          setUploadProgress(100);
          toast.success(
            `File ${res.data.file.originalName} berhasil diunggah! (${res.data.file.totalPages} slide dipetakan).`
          );
          setFile(null);
          setUploadProgress(0);
          router.refresh();
          if (onUploadSuccess) onUploadSuccess();
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="border-t-2 border-t-accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Upload className="size-5 text-accent" />
          Upload File Soal (PDF / PPT / PPTX)
        </CardTitle>
        <CardDescription>
          Unggah file materi presentation untuk babak Penyisihan, Final, & Grand Final. Slide akan otomatis dipetakan ke nomor soal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Pilih Sesi Lomba
              </label>
              <NativeSelect
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                disabled={uploading}
              >
                {stageOptions.map((opt) => (
                  <NativeSelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                File Presentation (Maks. 50MB)
              </label>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-800 hover:file:bg-slate-200"
              />
            </div>
          </div>

          {/* Active File Banner Card if file exists for current stage */}
          {activeFileId && activeFileName && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-emerald-900 truncate">
                    File Aktif Terpasang: <span className="font-mono text-emerald-800">{activeFileName}</span>
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Sesi: {activeFileStageLabel || selectedStage} · Jika ingin mengganti file, Anda dapat menghapus file ini terlebih dahulu.
                  </p>
                </div>
              </div>

              <DeleteQuestionFileButton
                fileId={activeFileId}
                fileName={activeFileName}
                stageLabel={activeFileStageLabel || selectedStage}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-red-50 border-red-200 text-red-700 font-bold shrink-0"
              />
            </div>
          )}

          {file && (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 text-blue-600 shrink-0" />
                <span className="font-medium truncate">{file.name}</span>
                <span className="text-slate-500 shrink-0">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            </div>
          )}

          {/* Real-time Upload Progress Bar */}
          {uploading && (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/70 p-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-semibold text-red-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-red-600" />
                  {uploadProgress < 100
                    ? `Mengunggah potongan file ke server... (${uploadProgress}%)`
                    : "Memproses & menyiapkan slide soal..."}
                </span>
                <span className="font-mono text-red-700 font-bold">{uploadProgress}%</span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-red-100 border border-red-200">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-700 transition-all duration-200 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="submit"
              variant="dark"
              disabled={!file || uploading}
              className="min-w-36 font-bold"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  {uploadProgress < 100 ? `Mengunggah ${uploadProgress}%` : "Memproses..."}
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-2" />
                  Unggah & Petakan
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
