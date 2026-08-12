"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type QuestionUploadProps = {
  activeStage: string;
  onUploadSuccess?: () => void;
};

const stageOptions = [
  { value: "PRELIMINARY", label: "Babak Penyisihan" },
  { value: "FINAL_SESSION_1", label: "Final Sesi 1" },
  { value: "FINAL_SESSION_2", label: "Final Sesi 2" },
  { value: "FINAL_SESSION_3", label: "Final Sesi 3" },
  { value: "GRAND_FINAL", label: "Grand Final" },
];

export function QuestionUpload({ activeStage, onUploadSuccess }: QuestionUploadProps) {
  const [selectedStage, setSelectedStage] = useState(
    stageOptions.some((opt) => opt.value === activeStage) ? activeStage : "PRELIMINARY"
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file PDF, PPT, atau PPTX terlebih dahulu.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("stage", selectedStage);

    try {
      const res = await fetch("/api/admin/questions/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Gagal mengunggah file.");
      }

      toast.success(`File ${data.file.originalName} berhasil diunggah (${data.file.totalPages} slide).`);
      setFile(null);
      if (onUploadSuccess) {
        onUploadSuccess();
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
          Unggah file materi presentation untuk babak Final & Grand Final. Slide akan dipetakan ke nomor soal.
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
                File Presentation (Maks. 20MB)
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

          {file && (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-blue-600 shrink-0" />
                <span className="font-medium truncate">{file.name}</span>
                <span className="text-slate-500">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="submit"
              variant="dark"
              disabled={!file || uploading}
              className="min-w-36"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Mengunggah...
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
