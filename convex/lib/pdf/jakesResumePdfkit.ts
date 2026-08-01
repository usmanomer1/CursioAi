"use node";

import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
import type { StructuredResume } from "../ai/resumeOptimizer";

const MARGIN = 36;
const HIGHLIGHT = "#d3f2dd"; // soft green behind added/rewritten content

export interface RenderOptions {
  /** Returns true when a content block is new/rewritten and should be
   * highlighted. Background rects only — text metrics are untouched, so
   * pagination matches the clean render exactly. */
  isNew?: (text: string) => boolean;
}
const BODY = 10;
const SMALL = 9;
const SECTION = 11;
const NAME = 22;
const LINE_GAP = 2;
const SECTION_GAP = 6;

function formatDates(start?: string, end?: string): string {
  const parts = [start, end].filter(Boolean);
  if (parts.length === 2) return `${parts[0]} – ${parts[1]}`;
  return parts.join(" ");
}

function normalizeHref(url: string, kind?: "mailto"): string {
  const t = url.trim();
  if (!t) return t;
  if (t.startsWith("mailto:")) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (kind === "mailto") return `mailto:${t}`;
  return `https://${t.replace(/^\/\//, "")}`;
}

function displayHref(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^mailto:/, "")
    .replace(/\/$/, "");
}

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - MARGIN * 2;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - MARGIN;
  if (doc.y + needed > bottom) {
    // Single-page template: avoid adding pages; caller trims content instead.
    return false;
  }
  return true;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, SECTION_GAP + 14);
  doc.moveDown(0.3);
  doc
    .font("Helvetica-Bold")
    .fontSize(SECTION)
    .fillColor("#111")
    .text(title.toUpperCase(), MARGIN, doc.y, {
      width: contentWidth(doc),
      characterSpacing: 0.6,
    });
  const y = doc.y;
  doc
    .moveTo(MARGIN, y + 2)
    .lineTo(doc.page.width - MARGIN, y + 2)
    .strokeColor("#111")
    .lineWidth(0.75)
    .stroke();
  doc.y = y + 6;
}

function drawSplitRow(
  doc: PDFKit.PDFDocument,
  left: string,
  right: string,
  opts: { bold?: boolean; italic?: boolean; size?: number } = {}
) {
  const width = contentWidth(doc);
  const leftW = width * 0.72;
  const rightW = width * 0.28;
  const y = doc.y;
  const font = opts.bold
    ? opts.italic
      ? "Helvetica-BoldOblique"
      : "Helvetica-Bold"
    : opts.italic
      ? "Helvetica-Oblique"
      : "Helvetica";
  const size = opts.size ?? BODY;

  doc.font(font).fontSize(size);
  const lh = Math.max(
    doc.heightOfString(left, { width: leftW }),
    doc.heightOfString(right, { width: rightW })
  );
  if (!ensureSpace(doc, lh + LINE_GAP)) return;

  doc.text(left, MARGIN, y, { width: leftW, lineBreak: false });
  doc.text(right, MARGIN + leftW, y, {
    width: rightW,
    align: "right",
    lineBreak: false,
  });
  doc.y = y + lh + LINE_GAP;
}

function drawBullets(
  doc: PDFKit.PDFDocument,
  bullets: string[],
  isNew?: (text: string) => boolean
) {
  const width = contentWidth(doc) - 10;
  doc.font("Helvetica").fontSize(SMALL + 0.5);
  for (const bullet of bullets) {
    const h = doc.heightOfString(bullet, { width: width - 8 });
    if (!ensureSpace(doc, h + 2)) break;
    const y = doc.y;
    if (isNew?.(bullet)) {
      doc
        .save()
        .rect(MARGIN, y - 1, contentWidth(doc), h + 2)
        .fill(HIGHLIGHT)
        .restore();
      doc.fillColor("#111");
    }
    doc.text("•", MARGIN + 2, y, { lineBreak: false });
    doc.text(bullet, MARGIN + 12, y, { width: width - 12 });
    doc.y = Math.max(doc.y, y + h) + 1;
  }
}

function drawContactLine(doc: PDFKit.PDFDocument, resume: StructuredResume) {
  const c = resume.contact;
  const tokens: Array<{ t: string; href?: string }> = [];

  if (c.phone) tokens.push({ t: c.phone });
  if (c.email) {
    tokens.push({
      t: displayHref(c.email),
      href: normalizeHref(c.email, "mailto"),
    });
  }
  if (c.linkedin) {
    tokens.push({
      t: /linkedin/i.test(c.linkedin) ? "LinkedIn" : displayHref(c.linkedin),
      href: normalizeHref(c.linkedin),
    });
  }
  if (c.github) {
    tokens.push({
      t: /github/i.test(c.github) ? "GitHub" : displayHref(c.github),
      href: normalizeHref(c.github),
    });
  }

  if (!tokens.length) return;

  doc.font("Helvetica").fontSize(SMALL).fillColor("#111");
  const sep = " | ";
  let totalW = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (i > 0) totalW += doc.widthOfString(sep);
    totalW += doc.widthOfString(tokens[i].t);
  }

  let x = MARGIN + (contentWidth(doc) - totalW) / 2;
  const y = doc.y;

  for (let i = 0; i < tokens.length; i++) {
    if (i > 0) {
      const sw = doc.widthOfString(sep);
      doc.text(sep, x, y, { lineBreak: false, width: sw });
      x += sw;
    }
    const tok = tokens[i];
    const w = doc.widthOfString(tok.t);
    if (tok.href) {
      doc.text(tok.t, x, y, {
        link: tok.href,
        underline: true,
        lineBreak: false,
        width: w,
      });
    } else {
      doc.text(tok.t, x, y, { lineBreak: false, width: w });
    }
    x += w;
  }

  doc.y = y + SMALL + 4;
}

function drawProjectHeading(
  doc: PDFKit.PDFDocument,
  proj: NonNullable<StructuredResume["projects"]>[number]
) {
  const width = contentWidth(doc);
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(SMALL + 0.5);

  let x = MARGIN;
  const url = proj.link ? normalizeHref(proj.link) : null;
  const label = proj.linkLabel ?? "Live";

  if (url) {
    const nameW = doc.widthOfString(proj.name);
    doc.text(proj.name, x, y, {
      link: url,
      underline: true,
      lineBreak: false,
      width: nameW,
    });
    x += nameW;
    const sep = " | ";
    const sepW = doc.widthOfString(sep);
    doc.font("Helvetica").text(sep, x, y, { lineBreak: false, width: sepW });
    x += sepW;
    doc.font("Helvetica-Oblique");
    const labelW = doc.widthOfString(label);
    doc.text(label, x, y, {
      link: url,
      underline: true,
      lineBreak: false,
      width: labelW,
    });
    x += labelW;
  } else {
    doc.text(proj.name, x, y, { lineBreak: false });
    x += doc.widthOfString(proj.name);
  }

  if (proj.technologies) {
    doc.font("Helvetica-Oblique").text(` (${proj.technologies})`, x, y, {
      lineBreak: false,
    });
  }

  if (proj.dates) {
    doc.font("Helvetica-Oblique").fontSize(SMALL);
    doc.text(proj.dates, MARGIN + width * 0.72, y, {
      width: width * 0.28,
      align: "right",
      lineBreak: false,
    });
  }

  doc.y = y + SMALL + 3;
}

function collectPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function renderJakesResumePdf(
  resume: StructuredResume,
  opts: RenderOptions = {}
): Promise<Uint8Array> {
  const { isNew } = opts;
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    autoFirstPage: true,
  });

  const bufferPromise = collectPdfBuffer(doc);

  doc.font("Helvetica-Bold").fontSize(NAME).fillColor("#111");
  doc.text(resume.contact.name.toUpperCase(), {
    align: "center",
    characterSpacing: 0.5,
  });
  doc.moveDown(0.15);

  drawContactLine(doc, resume);

  if (resume.summary) {
    drawSectionTitle(doc, "Summary");
    doc.font("Helvetica").fontSize(BODY);
    if (isNew?.(resume.summary)) {
      const h = doc.heightOfString(resume.summary, { width: contentWidth(doc) });
      doc
        .save()
        .rect(MARGIN, doc.y - 1, contentWidth(doc), h + 2)
        .fill(HIGHLIGHT)
        .restore();
      doc.fillColor("#111");
    }
    doc.text(resume.summary, MARGIN, doc.y, {
      width: contentWidth(doc),
      align: "left",
    });
    doc.moveDown(0.2);
  }

  if (resume.education.length) {
    drawSectionTitle(doc, "Education");
    for (const ed of resume.education) {
      const dates =
        ed.graduationDate ?? formatDates(ed.startDate, ed.endDate);
      drawSplitRow(doc, ed.institution, dates, { bold: true });
      drawSplitRow(doc, ed.degree, ed.location ?? "", { italic: true, size: SMALL });
      if (ed.details?.length) drawBullets(doc, ed.details, isNew);
      doc.moveDown(0.15);
    }
  }

  if (resume.experience.length) {
    drawSectionTitle(doc, "Experience");
    for (const exp of resume.experience) {
      drawSplitRow(doc, exp.company, formatDates(exp.startDate, exp.endDate), {
        bold: true,
      });
      drawSplitRow(doc, exp.title, exp.location ?? "", {
        italic: true,
        size: SMALL,
      });
      drawBullets(doc, exp.bullets, isNew);
      doc.moveDown(0.15);
    }
  }

  if (resume.projects?.length) {
    drawSectionTitle(doc, "Projects");
    for (const proj of resume.projects) {
      drawProjectHeading(doc, proj);
      drawBullets(doc, proj.bullets, isNew);
      doc.moveDown(0.15);
    }
  }

  if (resume.skills.categories.length) {
    drawSectionTitle(doc, "Technical Skills");
    for (const cat of resume.skills.categories) {
      if (!ensureSpace(doc, 12)) break;
      const y = doc.y;
      if (isNew?.(`${cat.category} ${cat.items}`)) {
        doc.font("Helvetica").fontSize(SMALL + 0.5);
        const h = doc.heightOfString(`${cat.category}: ${cat.items}`, {
          width: contentWidth(doc),
        });
        doc
          .save()
          .rect(MARGIN, y - 1, contentWidth(doc), h + 2)
          .fill(HIGHLIGHT)
          .restore();
        doc.fillColor("#111");
      }
      doc.font("Helvetica-Bold").fontSize(SMALL + 0.5).text(`${cat.category}: `, MARGIN, y, {
        continued: true,
        lineBreak: false,
      });
      doc.font("Helvetica").text(cat.items, { width: contentWidth(doc) });
      doc.moveDown(0.1);
    }
  }

  doc.end();
  const buffer = await bufferPromise;
  return new Uint8Array(buffer);
}
