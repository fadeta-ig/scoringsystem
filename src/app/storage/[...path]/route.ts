import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STORAGE_ROOT = path.resolve(
  process.cwd(),
  process.env.STORAGE_DIR || "storage/uploads",
);

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: "Path tidak valid." }, { status: 400 });
  }

  const requested = path.join(STORAGE_ROOT, ...segments);
  const resolved = path.resolve(requested);

  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const fileStat = await stat(resolved);

    if (!fileStat.isFile()) {
      return NextResponse.json(
        { error: "Bukan file." },
        { status: 404 },
      );
    }

    const extension = path.extname(resolved).toLowerCase();
    const contentType = CONTENT_TYPES[extension] || "application/octet-stream";
    const buffer = await readFile(resolved);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "File tidak ditemukan." },
      { status: 404 },
    );
  }
}
