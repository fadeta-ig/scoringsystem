"use client";

import { useState } from "react";
import { Check, Hash, SlidersHorizontal, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type MappingItem = {
  id?: string;
  pageNumber: number;
  questionNumber: number | null;
};

type QuestionMappingProps = {
  fileId: string;
  originalName: string;
  totalPages: number;
  initialMappings: MappingItem[];
  onSaved?: () => void;
};

export function QuestionMapping({
  fileId,
  originalName,
  totalPages,
  initialMappings,
  onSaved,
}: QuestionMappingProps) {
  const [mappings, setMappings] = useState<MappingItem[]>(() => {
    // Fill any missing page numbers up to totalPages
    const map = new Map(initialMappings.map((m) => [m.pageNumber, m.questionNumber]));
    return Array.from({ length: totalPages }, (_, i) => ({
      pageNumber: i + 1,
      questionNumber: map.get(i + 1) ?? null,
    }));
  });
  const [saving, setSaving] = useState(false);

  function handleQuestionNumChange(pageNumber: number, val: string) {
    const parsed = val.trim() === "" ? null : parseInt(val, 10);
    const num = isNaN(parsed as number) ? null : (parsed as number);

    setMappings((prev) =>
      prev.map((m) => (m.pageNumber === pageNumber ? { ...m, questionNumber: num } : m))
    );
  }

  function handleAutoNumber(startPage: number = 1) {
    let currentQ = 1;
    setMappings((prev) =>
      prev.map((m) => {
        if (m.pageNumber < startPage) {
          return { ...m, questionNumber: null };
        }
        return { ...m, questionNumber: currentQ++ };
      })
    );
    toast.success(`Pemetaan nomor otomatis diterapkan (Mulai Slide ${startPage} = Soal 1).`);
  }

  function handleClearAll() {
    setMappings((prev) => prev.map((m) => ({ ...m, questionNumber: null })));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${fileId}/mapping`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings: mappings.map((m) => ({
            pageNumber: m.pageNumber,
            questionNumber: m.questionNumber,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Gagal menyimpan pemetaan.");
      }

      toast.success("Pemetaan slide ke nomor soal berhasil disimpan.");
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pemetaan.");
    } finally {
      setSaving(false);
    }
  }

  const mappedCount = mappings.filter((m) => m.questionNumber !== null).length;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Badge className="mb-2 bg-blue-50 text-blue-700 border-blue-200">
            {originalName} ({totalPages} Slide)
          </Badge>
          <CardTitle className="text-lg">Pemetaan Slide ke Nomor Soal</CardTitle>
          <CardDescription>
            Tentukan slide mana yang merupakan soal. Slide tanpa nomor soal akan diabaikan saat pertandingan.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleAutoNumber(1)}>
            <Hash className="size-3.5 mr-1" />
            Otomatis (Slide 1 = Q1)
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAutoNumber(3)}>
            <Hash className="size-3.5 mr-1" />
            Otomatis (Slide 3 = Q1)
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            <RotateCcw className="size-3.5 mr-1" />
            Reset
          </Button>
          <Button variant="dark" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-3.5 mr-1" />
            {saving ? "Menyimpan..." : "Simpan Pemetaan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
          <span>Total Slide: <strong>{totalPages}</strong></span>
          <span>Dipetakan sebagai Soal: <strong className="text-primary">{mappedCount} Slide</strong></span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[400px] overflow-y-auto p-1">
          {mappings.map((item) => (
            <div
              key={item.pageNumber}
              className={`flex flex-col rounded-lg border p-2.5 text-center transition-all ${
                item.questionNumber !== null
                  ? "border-red-300 bg-red-50/60 shadow-xs"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-500">
                Slide {item.pageNumber}
              </span>
              <div className="mt-1.5 flex items-center justify-center gap-1">
                <span className="text-xs text-slate-400 font-medium">Q</span>
                <Input
                  type="number"
                  min={1}
                  placeholder="—"
                  value={item.questionNumber ?? ""}
                  onChange={(e) => handleQuestionNumChange(item.pageNumber, e.target.value)}
                  className="h-7 w-12 text-center text-xs font-bold text-slate-900 px-1"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
