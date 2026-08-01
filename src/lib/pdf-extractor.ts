type ResumeLinks = {
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  projectLinks?: Array<{ name: string; url: string; label?: string }>;
};

const URL_REGEX =
  /(?:https?:\/\/|mailto:)[^\s<>)\]"']+|(?:www\.)[a-zA-Z0-9][-a-zA-Z0-9.]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const PHONE_REGEX =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

function cleanUrl(raw: string): string {
  return raw.replace(/[.,;]+$/, "");
}

function extractUrlsFromText(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(URL_REGEX)) {
    let url = cleanUrl(match[0]);
    if (!url.startsWith("http") && !url.startsWith("mailto:")) {
      url = `https://${url}`;
    }
    found.add(url);
  }
  return [...found];
}

function pickLinkedIn(urls: string[]): string | undefined {
  return urls.find((u) => /linkedin\.com/i.test(u));
}

function pickGitHub(urls: string[]): string | undefined {
  return urls.find((u) => /github\.com/i.test(u));
}

function pickEmail(text: string, urls: string[]): string | undefined {
  const mailto = urls.find((u) => u.startsWith("mailto:"));
  if (mailto) return mailto.replace(/^mailto:/, "");
  return text.match(EMAIL_REGEX)?.[0];
}

function pickPhone(text: string): string | undefined {
  return text.match(PHONE_REGEX)?.[0];
}

/** Infer project name → URL from "ProjectName | Live" patterns in text. */
function inferProjectLinks(text: string, urls: string[]): ResumeLinks["projectLinks"] {
  const used = new Set<string>();
  const contactUrls = urls.filter(
    (u) =>
      /linkedin\.com|github\.com|mailto:/i.test(u) ||
      /@/.test(u)
  );
  contactUrls.forEach((u) => used.add(u));

  const projectUrls = urls.filter((u) => !used.has(u));
  const lines = text.split("\n");
  const projects: NonNullable<ResumeLinks["projectLinks"]> = [];

  for (const line of lines) {
    const pipeMatch = line.match(/^([A-Za-z0-9][A-Za-z0-9\s.&/-]{1,40})\s*\|\s*(Live(?:\s*\([^)]+\))?)/i);
    if (!pipeMatch) continue;
    const name = pipeMatch[1].trim();
    const label = pipeMatch[2].trim();
    const url = projectUrls.find(
      (u) =>
        !projects.some((p) => p.url === u) &&
        !/linkedin|github/i.test(u)
    );
    if (url) {
      projects.push({ name, url, label });
      used.add(url);
    }
  }

  for (const url of projectUrls) {
    if (used.has(url)) continue;
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const slug = host.split(".")[0];
      if (slug && slug.length > 2) {
        projects.push({ name: slug, url, label: "Live" });
      }
    } catch {
      // skip invalid URLs
    }
  }

  return projects.length ? projects : undefined;
}

export function buildResumeLinksFromExtracted(
  text: string,
  annotationUrls: string[]
): ResumeLinks {
  const textUrls = extractUrlsFromText(text);
  const urls = [...new Set([...annotationUrls, ...textUrls])];

  return {
    email: pickEmail(text, urls),
    phone: pickPhone(text),
    linkedin: pickLinkedIn(urls),
    github: pickGitHub(urls),
    projectLinks: inferProjectLinks(text, urls),
  };
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const { text } = await extractResumeFromPdf(file);
  return text;
}

export async function extractResumeFromPdf(file: File): Promise<{
  text: string;
  links: ResumeLinks;
}> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  const annotationUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);

    const annotations = await page.getAnnotations();
    for (const ann of annotations) {
      if (ann.subtype === "Link" && typeof ann.url === "string") {
        annotationUrls.push(ann.url);
      }
      if (ann.subtype === "Link" && ann.unsafeUrl) {
        annotationUrls.push(String(ann.unsafeUrl));
      }
    }
  }

  const text = pages.join("\n\n").trim();
  const links = buildResumeLinksFromExtracted(text, annotationUrls);

  return { text, links };
}
