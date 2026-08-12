import { execFile } from "node:child_process";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

const UPLOAD_ROOT = path.resolve(
  process.cwd(),
  process.env.STORAGE_DIR || "storage/uploads",
  "questions",
);

const LIBREOFFICE_PATH =
  process.env.LIBREOFFICE_PATH ||
  (process.platform === "win32"
    ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe"
    : "/usr/bin/soffice");

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ACCEPTED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.ms-powerpoint": "ppt",
};

const MAGIC_SIGNATURES: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    0x50, 0x4b, 0x03, 0x04,
  ],
  "application/vnd.ms-powerpoint": [0xd0, 0xcf, 0x11, 0xe0],
};

export type ProcessedFile = {
  storagePath: string;
  totalPages: number;
  mimeType: string;
};

export function validateFileType(mimeType: string, fileName?: string): string {
  let resolvedMime = mimeType;

  if (!ACCEPTED_MIME_TYPES[resolvedMime] && fileName) {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === ".pdf") resolvedMime = "application/pdf";
    else if (ext === ".pptx") resolvedMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    else if (ext === ".ppt") resolvedMime = "application/vnd.ms-powerpoint";
  }

  const extension = ACCEPTED_MIME_TYPES[resolvedMime];

  if (!extension) {
    throw new Error(
      "Format file tidak didukung. Gunakan PDF, PPT, atau PPTX.",
    );
  }

  return extension;
}

export function validateFileSize(size: number) {
  if (size === 0) {
    throw new Error("File kosong tidak dapat diproses.");
  }

  if (size > MAX_FILE_SIZE) {
    throw new Error("Ukuran file maksimal 20 MB.");
  }
}

export function validateMagicBytes(bytes: Uint8Array, mimeType: string) {
  const signature = MAGIC_SIGNATURES[mimeType];

  if (!signature) {
    return;
  }

  const matches = signature.every(
    (byte, index) => bytes[index] === byte,
  );

  if (!matches) {
    throw new Error("Isi file tidak sesuai dengan format yang dipilih.");
  }
}

export async function processUploadedFile(
  fileId: string,
  bytes: Uint8Array,
  originalName: string,
  mimeType: string,
): Promise<ProcessedFile> {
  const extension = validateFileType(mimeType);
  validateFileSize(bytes.length);
  validateMagicBytes(bytes, mimeType);

  const fileDir = path.join(UPLOAD_ROOT, fileId);
  await mkdir(fileDir, { recursive: true });

  const originalPath = path.join(fileDir, `original.${extension}`);
  await writeFile(originalPath, bytes, { flag: "wx" });

  let pdfPath: string;

  if (mimeType === "application/pdf") {
    pdfPath = originalPath;
  } else {
    pdfPath = await convertToPdf(originalPath, fileDir);
  }

  const totalPages = await extractPageCount(pdfPath);
  const storagePath = path.relative(
    path.resolve(process.cwd(), process.env.STORAGE_DIR || "storage/uploads"),
    pdfPath,
  );

  return {
    storagePath: `/storage/${storagePath.split(path.sep).join("/")}`,
    totalPages,
    mimeType: "application/pdf",
  };
}

async function convertToPdf(
  inputPath: string,
  outputDir: string,
): Promise<string> {
  try {
    await exec(LIBREOFFICE_PATH, [
      "--headless",
      "--norestore",
      "--convert-to",
      "pdf",
      "--outdir",
      outputDir,
      inputPath,
    ], {
      timeout: 120_000,
    });
  } catch (error) {
    throw new Error(
      `Gagal mengkonversi file ke PDF. Pastikan LibreOffice terinstal. ${
        error instanceof Error ? error.message : ""
      }`,
    );
  }

  const files = await readdir(outputDir);
  const pdfFile = files.find(
    (file) => file.endsWith(".pdf") && file !== "original.pdf",
  );

  if (pdfFile) {
    const oldPath = path.join(outputDir, pdfFile);
    const newPath = path.join(outputDir, "converted.pdf");
    await rename(oldPath, newPath);
    return newPath;
  }

  const convertedPath = path.join(outputDir, "converted.pdf");

  try {
    await stat(convertedPath);
    return convertedPath;
  } catch {
    throw new Error(
      "Konversi berhasil tetapi file PDF tidak ditemukan.",
    );
  }
}

async function extractPageCount(pdfPath: string): Promise<number> {
  try {
    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(pdfPath);
    const pdfText = buffer.toString("binary");

    // 1. Fast O(1) catalog search for /Count <N>
    const pagesMatch = pdfText.match(/\/Count\s+(\d+)/);
    if (pagesMatch && pagesMatch[1]) {
      const count = Number.parseInt(pagesMatch[1], 10);
      if (count > 0 && count < 2000) {
        return count;
      }
    }

    // 2. Fallback count of /Type /Page without unbounded backtracking
    const countMatches = pdfText.match(/\/Type\s*\/Page(?![sS])/g);
    if (countMatches && countMatches.length > 0) {
      return countMatches.length;
    }
  } catch (err) {
    console.error("Gagal menghitung halaman PDF:", err);
  }

  return 1;
}

export function getUploadRoot() {
  return UPLOAD_ROOT;
}

export async function removeQuestionFiles(fileId: string) {
  const fileDir = path.join(UPLOAD_ROOT, fileId);

  try {
    const files = await readdir(fileDir);

    for (const file of files) {
      await unlink(path.join(fileDir, file)).catch(() => undefined);
    }

    const { rmdir } = await import("node:fs/promises");
    await rmdir(fileDir).catch(() => undefined);
  } catch {
    // Directory may not exist
  }
}
