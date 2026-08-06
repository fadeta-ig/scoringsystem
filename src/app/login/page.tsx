import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/admin/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] w-full bg-[#f8f9fa] text-slate-800 antialiased border-t-2 border-[#c41f2e]">
      <div className="mx-auto flex min-h-[calc(100dvh-2px)] max-w-6xl flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
        {/* Header Branding */}
        <header className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-40">
              <Image
                src="/brand/wig-logo.png"
                alt="PT Wijaya Inovasi Gemilang"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <span className="hidden sm:inline-block text-xs tracking-wider text-slate-400 uppercase font-normal">
              | SISTEM SCORING PERLOMBAAN
            </span>
          </div>

          <span className="rounded-full border border-red-200 bg-red-50/80 px-3 py-1 text-xs font-medium text-[#c41f2e]">
            HUT RI KE-81
          </span>
        </header>

        {/* Content Section */}
        <div className="my-auto grid items-center gap-12 lg:grid-cols-12 py-8">
          {/* Left Column: HUT RI 81 Banner */}
          <section className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-widest text-[#c41f2e] uppercase">
                HUT REPUBLIK INDONESIA
              </p>
              <h1 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
                Sistem Scoring Perlombaan
              </h1>
            </div>

            {/* Logo HUT RI Ke-81 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 py-2">
              <div className="relative h-36 w-48 sm:h-44 sm:w-56 shrink-0">
                <Image
                  src="/brand/hut-ri-81.png"
                  alt="HUT RI Ke-81"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <p className="max-w-sm border-l border-slate-200 pl-5 text-sm leading-relaxed text-slate-600 font-normal">
                Merayakan kemerdekaan dengan sportivitas, ketelitian, dan semangat berkarya.
              </p>
            </div>

            <div className="pt-2 text-xs text-slate-400 font-normal">
              PT Wijaya Inovasi Gemilang &bull; 1945 — 2026
            </div>
          </section>

          {/* Right Column: Login Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <Suspense fallback={<div className="h-80 w-full max-w-sm rounded-lg bg-slate-100" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-slate-200/60 text-xs text-slate-400 font-normal">
          &copy; 2026 PT Wijaya Inovasi Gemilang. All rights reserved.
        </footer>
      </div>
    </main>
  );
}


