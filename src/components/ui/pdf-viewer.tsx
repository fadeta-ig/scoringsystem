"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

const PDFJS_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

type PdfViewerProps = {
  url: string;
  pageNumber: number;
  className?: string;
  onTotalPages?: (total: number) => void;
};

export function PdfViewer({
  url,
  pageNumber,
  className = "",
  onTotalPages,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<any>(null);

  const renderPage = useCallback(async (pdf: any, pageNum: number) => {
    if (!canvasRef.current || !pdf) return;

    try {
      const validPage = Math.max(1, Math.min(pageNum, pdf.numPages));
      const page = await pdf.getPage(validPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      // Render at high DPI scale for crisp text on proyektor / 4K displays
      const viewport = page.getViewport({ scale: 2.5 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error("Page Render Error:", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPdfJs() {
      if (window.pdfjsLib) {
        return window.pdfjsLib;
      }

      return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${PDFJS_CDN_URL}"]`);
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(window.pdfjsLib));
          existingScript.addEventListener("error", () => reject(new Error("Gagal memuat PDF.js CDN")));
          return;
        }

        const script = document.createElement("script");
        script.src = PDFJS_CDN_URL;
        script.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
            resolve(window.pdfjsLib);
          } else {
            reject(new Error("PDF.js tidak diinisialisasi"));
          }
        };
        script.onerror = () => reject(new Error("Gagal memuat PDF.js CDN"));
        document.head.appendChild(script);
      });
    }

    async function initPdf() {
      setLoading(true);
      setError(null);

      try {
        const pdfjs = await loadPdfJs();
        if (!isMounted) return;

        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;

        if (!isMounted) return;
        pdfDocRef.current = pdf;

        if (onTotalPages) {
          onTotalPages(pdf.numPages);
        }

        await renderPage(pdf, pageNumber);
      } catch (err) {
        if (isMounted) {
          console.error("PDF Load Error:", err);
          setError(err instanceof Error ? err.message : "Gagal memuat PDF");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initPdf();

    return () => {
      isMounted = false;
    };
  }, [url, pageNumber, onTotalPages, renderPage]);

  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(pdfDocRef.current, pageNumber);
    }
  }, [pageNumber, renderPage]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-slate-900 ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 text-white z-10">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Memuat Slide {pageNumber}...</p>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-red-400">
          <AlertCircle className="size-10" />
          <p className="text-sm font-medium">{error}</p>
          <iframe
            src={`${url}#page=${pageNumber}`}
            className="w-full h-[400px] border-0 rounded"
            title={`Slide ${pageNumber}`}
          />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full object-contain shadow-2xl transition-all duration-300"
        />
      )}
    </div>
  );
}
