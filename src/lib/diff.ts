export type DiffOp = "added" | "removed" | "same";

export interface DiffLine {
  op: DiffOp;
  text: string;
}

/**
 * Minimal LCS line diff — enough to highlight what the optimizer added or
 * dropped relative to the original resume. Inputs are short (a one-page
 * resume), so the O(n*m) table is fine.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n").map((l) => l.trimEnd());
  const b = after.split("\n").map((l) => l.trimEnd());

  const n = a.length;
  const m = b.length;

  // lcs[i][j] = length of longest common subsequence of a[i:] and b[j:]
  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ op: "same", text: b[j] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ op: "removed", text: a[i] });
      i++;
    } else {
      out.push({ op: "added", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ op: "removed", text: a[i++] });
  while (j < m) out.push({ op: "added", text: b[j++] });

  return out;
}

export function diffStats(lines: DiffLine[]) {
  return {
    added: lines.filter((l) => l.op === "added").length,
    removed: lines.filter((l) => l.op === "removed").length,
  };
}

export interface DiffSpan {
  op: DiffOp;
  text: string;
}

/**
 * Word-level diff rendered as flowing spans — readable even when one side is
 * a single extracted-PDF blob with no line structure (where a line diff just
 * strikes everything). Consecutive words with the same op are merged into one
 * span. Token counts are capped to keep the O(n·m) table bounded.
 */
export function diffWords(before: string, after: string): DiffSpan[] {
  const MAX = 2500;
  const a = before.split(/\s+/).filter(Boolean).slice(0, MAX);
  const b = after.split(/\s+/).filter(Boolean).slice(0, MAX);
  const n = a.length;
  const m = b.length;

  // Row-compressed LCS lengths, then a standard backtrack over a full table
  // would need O(n·m) memory anyway at these sizes — Int32Array keeps it cheap.
  const width = m + 1;
  const lcs = new Int32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * width + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * width + j + 1] + 1
          : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }

  const spans: DiffSpan[] = [];
  const push = (op: DiffOp, word: string) => {
    const last = spans[spans.length - 1];
    if (last && last.op === op) last.text += " " + word;
    else spans.push({ op, text: word });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      push("removed", a[i]);
      i++;
    } else {
      push("added", b[j]);
      j++;
    }
  }
  while (i < n) push("removed", a[i++]);
  while (j < m) push("added", b[j++]);

  return spans;
}
