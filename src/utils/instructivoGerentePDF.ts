import jsPDF from "jspdf";

const PRIMARY: [number, number, number] = [75, 13, 109]; // #4b0d6d
const SECONDARY: [number, number, number] = [149, 25, 141]; // #95198d
const ACCENT: [number, number, number] = [224, 68, 3]; // #e04403
const TEXT: [number, number, number] = [33, 33, 33];
const MUTED: [number, number, number] = [110, 110, 110];

export interface InstructivoSeccion {
  id: string;
  orden: number;
  titulo: string;
  contenido: string;
}

export interface InstructivoPDFData {
  titulo: string;
  descripcion?: string | null;
  version?: number;
  actualizado_en?: string | null;
  secciones: InstructivoSeccion[];
}

const MARGIN_X = 18;
const MARGIN_TOP = 22;
const MARGIN_BOTTOM = 20;
const LINE_H = 5.2;

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, pageHeight - 12, pageWidth - MARGIN_X, pageHeight - 12);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Mayorista Soto · RRHH", MARGIN_X, pageHeight - 7);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - MARGIN_X,
      pageHeight - 7,
      { align: "right" }
    );
  }
}

function ensureSpace(doc: jsPDF, cursorY: number, needed = LINE_H): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursorY + needed > pageHeight - MARGIN_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return cursorY;
}

/** Render simple markdown:  ## heading, **bold**, - bullets, plain paragraphs */
function renderMarkdown(doc: jsPDF, text: string, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - MARGIN_X * 2;
  let y = startY;
  const lines = text.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      y += LINE_H * 0.5;
      continue;
    }

    // Heading ##
    if (line.startsWith("## ")) {
      y = ensureSpace(doc, y + 2, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...SECONDARY);
      doc.text(line.replace(/^##\s+/, ""), MARGIN_X, y);
      y += LINE_H + 1.5;
      continue;
    }

    // Bullet
    if (/^[-*]\s+/.test(line)) {
      const content = line.replace(/^[-*]\s+/, "");
      const wrapped = doc.splitTextToSize(content, maxWidth - 5);
      for (let i = 0; i < wrapped.length; i++) {
        y = ensureSpace(doc, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...TEXT);
        if (i === 0) {
          doc.setTextColor(...ACCENT);
          doc.text("•", MARGIN_X + 1, y);
          doc.setTextColor(...TEXT);
        }
        renderInline(doc, wrapped[i], MARGIN_X + 5, y);
        y += LINE_H;
      }
      continue;
    }

    // Paragraph
    const wrapped = doc.splitTextToSize(line, maxWidth);
    for (const w of wrapped) {
      y = ensureSpace(doc, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      renderInline(doc, w, MARGIN_X, y);
      y += LINE_H;
    }
  }

  return y;
}

/** Render a single line of text with **bold** support */
function renderInline(doc: jsPDF, line: string, x: number, y: number) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  let cursorX = x;
  for (const part of parts) {
    if (!part) continue;
    const isBold = part.startsWith("**") && part.endsWith("**");
    const text = isBold ? part.slice(2, -2) : part;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(text, cursorX, y);
    cursorX += doc.getTextWidth(text);
  }
}

export function generarInstructivoGerentePDF(data: InstructivoPDFData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // === Portada ===
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 55, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 55, pageWidth, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MAYORISTA SOTO · RRHH", MARGIN_X, 20);

  doc.setFontSize(22);
  const tituloLines = doc.splitTextToSize(data.titulo, pageWidth - MARGIN_X * 2);
  doc.text(tituloLines, MARGIN_X, 35);

  if (data.descripcion) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(240, 230, 245);
    const descLines = doc.splitTextToSize(data.descripcion, pageWidth - MARGIN_X * 2);
    doc.text(descLines, MARGIN_X, 35 + tituloLines.length * 8);
  }

  let y = 72;
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const fechaStr = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Generado: ${fechaStr}`, MARGIN_X, y);
  if (data.version) {
    doc.text(`Versión: ${data.version}`, pageWidth - MARGIN_X, y, { align: "right" });
  }
  y += 8;

  // Índice
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.text("Contenido", MARGIN_X, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  const sorted = [...data.secciones].sort((a, b) => a.orden - b.orden);
  for (const sec of sorted) {
    y = ensureSpace(doc, y);
    doc.text(`•  ${sec.titulo}`, MARGIN_X + 2, y);
    y += LINE_H + 0.5;
  }

  // === Secciones ===
  for (const sec of sorted) {
    doc.addPage();
    y = MARGIN_TOP;

    // Encabezado de sección
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, pageWidth, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(sec.titulo, MARGIN_X, 9.5);

    y = 24;
    y = renderMarkdown(doc, sec.contenido || "", y);
  }

  addFooter(doc);

  const slug = data.titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`${slug || "instructivo"}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
