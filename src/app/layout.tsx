import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Scoring HUT RI Ke-81",
  description:
    "Sistem scoring HUT RI Ke-81 oleh PT Wijaya Inovasi Gemilang.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
