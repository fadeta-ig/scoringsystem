import { getLiveState } from "@/lib/live-state";
import { QuestionViewer } from "@/components/admin/question-viewer";
import { QuestionUpload } from "@/components/admin/question-upload";
import { QuestionMapping } from "@/components/admin/question-mapping";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const qv = state.questionViewer;
  const currentStage = state.competition.stage;

  return (
    <div className="space-y-6 pb-12">
      {/* Question Viewer Controller */}
      <QuestionViewer state={state} />

      {/* Mapping Section if File exists */}
      {qv && (
        <div className="mx-auto max-w-7xl px-3 sm:px-4">
          <QuestionMapping
            fileId={qv.fileId}
            originalName={qv.originalName}
            totalPages={qv.totalPages}
            initialMappings={qv.mappings}
          />
        </div>
      )}

      {/* Upload Section */}
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <QuestionUpload activeStage={currentStage} />
      </div>
    </div>
  );
}
