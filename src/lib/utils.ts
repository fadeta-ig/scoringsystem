import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(value: number) {
  return new Intl.NumberFormat("id-ID", {
    signDisplay: value > 0 ? "never" : "auto",
  }).format(value);
}

export function formatSignedScore(value: number) {
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat("id-ID").format(value)}`;
}

export function safeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function toInt(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number.parseInt(typeof value === "string" ? value : "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
