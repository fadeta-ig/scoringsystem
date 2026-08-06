import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { emitLiveState } from "@/lib/realtime";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const UPLOAD_ROOT = path.resolve(process.cwd(), "public", "uploads", "teams");

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function requireOperator() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return false;
  }

  const operator = await prisma.adminUser.findFirst({
    where: { id: session.user.id, role: "ADMIN", isActive: true },
    select: { id: true },
  });

  return Boolean(operator);
}

function hasValidSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }

  if (mimeType === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

function localPhotoPath(photoPath: string | null) {
  if (!photoPath?.startsWith("/uploads/teams/")) {
    return null;
  }

  const resolved = path.resolve(
    process.cwd(),
    "public",
    photoPath.replace(/^\/+/, ""),
  );

  return resolved.startsWith(`${UPLOAD_ROOT}${path.sep}`) ? resolved : null;
}

async function removeLocalPhoto(photoPath: string | null) {
  const target = localPhotoPath(photoPath);

  if (!target) {
    return;
  }

  await unlink(target).catch(() => undefined);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  if (!(await requireOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await context.params;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, eventId: true, photoPath: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Tim tidak ditemukan." }, { status: 404 });
  }

  const formData = await request.formData();
  const photo = formData.get("photo");

  if (!(photo instanceof File)) {
    return NextResponse.json(
      { error: "Pilih file foto terlebih dahulu." },
      { status: 400 },
    );
  }

  const extension = extensions[photo.type];

  if (!extension) {
    return NextResponse.json(
      { error: "Gunakan foto JPG, PNG, atau WebP." },
      { status: 400 },
    );
  }

  if (photo.size === 0 || photo.size > MAX_PHOTO_SIZE) {
    return NextResponse.json(
      { error: "Ukuran foto maksimal 2 MB." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await photo.arrayBuffer());

  if (!hasValidSignature(bytes, photo.type)) {
    return NextResponse.json(
      { error: "Isi file tidak sesuai dengan format gambar." },
      { status: 400 },
    );
  }

  await mkdir(UPLOAD_ROOT, { recursive: true });
  const filename = `${team.id}-${Date.now()}.${extension}`;
  const target = path.join(UPLOAD_ROOT, filename);
  const photoPath = `/uploads/teams/${filename}`;

  await writeFile(target, bytes, { flag: "wx" });

  try {
    await prisma.team.update({
      where: { id: team.id },
      data: { photoPath },
    });
  } catch (error) {
    await unlink(target).catch(() => undefined);
    throw error;
  }

  await removeLocalPhoto(team.photoPath);
  await emitLiveState(team.eventId);

  return NextResponse.json({ ok: true, photoPath });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  if (!(await requireOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await context.params;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, eventId: true, photoPath: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Tim tidak ditemukan." }, { status: 404 });
  }

  await prisma.team.update({
    where: { id: team.id },
    data: { photoPath: null },
  });
  await removeLocalPhoto(team.photoPath);
  await emitLiveState(team.eventId);

  return NextResponse.json({ ok: true });
}
