"use node";

import { PDFDocument } from "pdf-lib";
import type { StructuredResume } from "../ai/resumeOptimizer";
import {
  normalizeStructuredResume,
} from "../ai/resumeOptimizer";
import { renderJakesResumePdf } from "./jakesResumePdfkit";
import { trimResumeForOnePage } from "./trimForOnePage";
import type { ResumeLinks } from "./resumeLinks";
import { mergePreservedLinks } from "./resumeLinks";

const MAX_TRIM_LEVELS = 6;

async function countPages(pdfBytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPageCount();
}

export async function generateResumePdf(
  raw: StructuredResume,
  preservedLinks?: ResumeLinks | null
): Promise<Uint8Array> {
  const base = mergePreservedLinks(
    normalizeStructuredResume(raw),
    preservedLinks
  );

  let lastBytes: Uint8Array | null = null;

  for (let level = 0; level < MAX_TRIM_LEVELS; level++) {
    const trimmed = trimResumeForOnePage(base, level);
    const bytes = await renderJakesResumePdf(trimmed);
    lastBytes = bytes;

    const pages = await countPages(bytes);
    if (pages <= 1) {
      return bytes;
    }
  }

  return lastBytes!;
}
