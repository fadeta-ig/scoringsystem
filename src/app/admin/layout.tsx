import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="admin-shell min-h-[100dvh] border-t-4 border-t-primary">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-red-200 bg-red-50 text-lg font-medium leading-none text-primary">
              81
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight text-[var(--foreground)] sm:text-base">
                PT Wijaya Inovasi Gemilang
              </p>
              <p className="truncate text-xs text-slate-500">
                Sistem Scoring HUT RI Ke-81 · {session.user?.name || "Admin"}
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
            >
              <a href="/admin">
                <LayoutDashboard size={16} />
                Scoring
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
            >
              <a href="/admin/soal">
                <FileText size={16} />
                Viewer Soal
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
            >
              <a href="/admin/tim">
                <UsersRound size={16} />
                Profil Tim
              </a>
            </Button>
            <Button
              asChild
              variant="dark"
              size="sm"
              className="w-full sm:w-auto"
            >
              <a href="/admin/proyeksi">
                <SlidersHorizontal size={16} />
                Ruang Proyeksi
              </a>
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
