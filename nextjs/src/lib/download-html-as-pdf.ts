/** Client-only: render a DOM node to a letter-size PDF and trigger download. */
export async function downloadHtmlElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const mod = await import("html2pdf.js");
  const html2pdf = mod.default ?? mod;
  const safeName = filename.replace(/[^\w\-+.]+/g, "_").slice(0, 120) || "document.pdf";
  const finalName = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;

  const worker = html2pdf()
    .set({
      margin: 0.25,
      filename: finalName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    } as Record<string, unknown>)
    .from(element)
    .toPdf();

  const blob = await worker.output("blob");
  downloadBlob(blob, finalName);
}

/** Trigger a file download from a Blob (client-only). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
