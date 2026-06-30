import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/**
 * Extract raw text from every page.
 */
export async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer,
  }).promise;

  let text = "";

  for (let page = 1; page <= pdf.numPages; page++) {
    const current = await pdf.getPage(page);

    const content = await current.getTextContent();

    text += content.items.map((item) => item.str).join(" ") + "\n";
  }

  return text;
}

/**
 * Try parsing a structured invoice.
 */
export function parseStructuredCart(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  const skipped = [];

  for (const line of lines) {
    const cols = line.split(/\s{2,}/);

    if (cols.length < 5) {
      skipped.push(line);
      continue;
    }

    const price = Number(cols.at(-1).replace(/[₹,Rs.\s]/g, ""));

    if (Number.isNaN(price)) {
      skipped.push(line);
      continue;
    }

    items.push({
      itemId: cols[0],
      product: cols[1],
      brand: cols[2],
      platform: cols[3],
      basePrice: price,
    });
  }

  return {
    items,
    skipped,
  };
}