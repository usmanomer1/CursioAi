"use node";

import { PDFDocument } from "pdf-lib";
import type { StructuredResume } from "../ai/resumeOptimizer";
import { normalizeStructuredResume } from "../ai/resumeOptimizer";
import { renderJakesResumePdf } from "./jakesResumePdfkit";
import { trimResumeForOnePage } from "./trimForOnePage";
import type { ResumeLinks } from "./resumeLinks";
import { mergePreservedLinks } from "./resumeLinks";

const MAX_TRIM_LEVELS = 6;

async function countPages(pdfBytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPageCount();
}

/**
 * "Is this content new?" heuristic for the highlighted variant: a block is
 * considered new/rewritten when most of its significant words don't appear in
 * the original resume text. Word-set membership is robust to the original
 * being a single extracted-PDF blob with no line structure.
 */
function buildIsNew(originalText: string): (text: string) => boolean {
  const orig = new Set(
    originalText
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/i)
      .filter((w) => w.length >= 4)
  );
  return (text: string) => {
    const words = text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/i)
      .filter((w) => w.length >= 4);
    if (words.length === 0) return false;
    const known = words.filter((w) => orig.has(w)).length;
    return known / words.length < 0.6;
  };
}

export interface ResumePdfBundle {
  pdf: Uint8Array;
  /** Same content and layout, with new/rewritten blocks highlighted green. */
  highlighted: Uint8Array | null;
}

export async function generateResumePdfBundle(
  raw: StructuredResume,
  preservedLinks?: ResumeLinks | null,
  highlightAgainst?: string
): Promise<ResumePdfBundle> {
  const base = mergePreservedLinks(
    normalizeStructuredResume(raw),
    preservedLinks
  );

  let lastBytes: Uint8Array | null = null;
  let fittingTrim: StructuredResume | null = null;

  for (let level = 0; level < MAX_TRIM_LEVELS; level++) {
    const trimmed = trimResumeForOnePage(base, level);
    const bytes = await renderJakesResumePdf(trimmed);
    lastBytes = bytes;
    fittingTrim = trimmed;

    const pages = await countPages(bytes);
    if (pages <= 1) break;
  }

  let highlighted: Uint8Array | null = null;
  if (highlightAgainst && fittingTrim) {
    // Background rects only — text metrics are identical, so this renders
    // with the exact same pagination as the clean variant.
    highlighted = await renderJakesResumePdf(fittingTrim, {
      isNew: buildIsNew(highlightAgainst),
    });
  }

  return { pdf: lastBytes!, highlighted };
}

export async function generateResumePdf(
  raw: StructuredResume,
  preservedLinks?: ResumeLinks | null
): Promise<Uint8Array> {
  const { pdf } = await generateResumePdfBundle(raw, preservedLinks);
  return pdf;
}
