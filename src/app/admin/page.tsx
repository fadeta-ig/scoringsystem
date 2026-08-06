import { AdminConsole } from "@/components/admin/admin-console";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLiveState } from "@/lib/live-state";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
          <CardContent className="text-sm text-muted-foreground">
            Database belum mengembalikan active event.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminConsole state={state} />;
}
