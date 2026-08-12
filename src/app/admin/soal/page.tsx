import { getLiveState } from "@/lib/live-state";
import { QuestionViewer } from "@/components/admin/question-viewer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminSoalPage() {
  const state = await getLiveState();

  if (!state) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Event belum tersedia</CardTitle>
            <CardDescription>
              Jalankan migration dan seed database untuk membuat data awal event.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Master Studio Soal Controller */}
      <QuestionViewer state={state} />
    </div>
  );
}
