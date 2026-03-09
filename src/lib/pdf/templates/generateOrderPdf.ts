import puppeteer, { type Browser } from "puppeteer";
import path from "path";
import fs from "fs/promises";

interface OrderDesignInput {
  designCode: string;
  qty50?: number;
  qty90?: number;
  imageUrl?: string;
}

interface OrderGroupInput {
  fabricType: string;
  designs: OrderDesignInput[];
}

interface GenerateOrderPdfInput {
  data: {
    recipient: string;
    preparedBy?: string;
    challanNumber?: string;
    orderNumber?: string;
    date?: string;
    companyName?: string;
    groups: OrderGroupInput[];
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

let cachedArchivoFontFaces: string | null = null;
let cachedBrowserPromise: Promise<Browser> | null = null;
let browserHooksAttached = false;
type CachedTextFile = { filePath: string; mtimeMs: number; content: string };
let cachedOrderTemplate: CachedTextFile | null = null;
let cachedStylesTemplate: CachedTextFile | null = null;

async function readTextFileCached(filePath: string, cached: CachedTextFile | null): Promise<CachedTextFile> {
  try {
    const st = await fs.stat(filePath);
    const mtimeMs = Number(st.mtimeMs);
    if (cached && cached.filePath === filePath && cached.mtimeMs === mtimeMs) return cached;
    const content = await fs.readFile(filePath, "utf-8");
    return { filePath, mtimeMs, content };
  } catch {
    return { filePath, mtimeMs: 0, content: "" };
  }
}

async function getBrowser() {
  if (!cachedBrowserPromise) {
    cachedBrowserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  if (!browserHooksAttached) {
    browserHooksAttached = true;
    const closeBrowser = async () => {
      if (!cachedBrowserPromise) return;
      try {
        const browser = await cachedBrowserPromise;
        await browser.close();
      } catch {}
    };
    process.once("exit", closeBrowser);
    process.once("SIGINT", closeBrowser);
    process.once("SIGTERM", closeBrowser);
  }
  return cachedBrowserPromise;
}

async function getArchivoFontFacesCss() {
  if (cachedArchivoFontFaces !== null) return cachedArchivoFontFaces;

  const fontDir = path.join(process.cwd(), "src/lib/pdf/fonts");
  const fontCandidates: Array<{ file: string; weight: number }> = [
    { file: "Archivo-400.woff2", weight: 400 },
    { file: "Archivo-500.woff2", weight: 500 },
    { file: "Archivo-600.woff2", weight: 600 },
  ];

  const fontFaces: string[] = [];
  for (const f of fontCandidates) {
    try {
      const buf = await fs.readFile(path.join(fontDir, f.file));
      fontFaces.push(`
@font-face {
  font-family: "Archivo";
  font-style: normal;
  font-weight: ${f.weight};
  font-display: swap;
  src: url(data:font/woff2;base64,${buf.toString("base64")}) format("woff2");
}`.trim());
    } catch {}
  }

  cachedArchivoFontFaces = fontFaces.join("\n\n");
  return cachedArchivoFontFaces;
}

function formatDate(isoString?: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function placeholderImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f3f4f6"/>
          <stop offset="1" stop-color="#e5e7eb"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="600" height="750" rx="36" fill="url(#g)"/>
      <rect x="260" y="330" width="80" height="80" rx="10" fill="#d1d5db" transform="rotate(45 300 370)"/>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function getLogoDataUrl() {
  const candidates = [
    path.join(process.cwd(), "logo.png"),
    path.join(process.cwd(), "public", "greyexim-logo.png"),
    path.join(process.cwd(), "public", "greyexim-logo.jpg"),
    path.join(process.cwd(), "public", "greyexim-logo.jpeg"),
    path.join(process.cwd(), "public", "greyexim-logo.svg"),
    path.join(process.cwd(), "public", "greyexim-logo-white.png"),
  ];
  for (const filePath of candidates) {
    try {
      const buf = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime =
        ext === ".svg"
          ? "image/svg+xml"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "image/png";
      return ext === ".svg"
        ? `data:${mime};charset=utf-8,${encodeURIComponent(buf.toString("utf-8"))}`
        : `data:${mime};base64,${buf.toString("base64")}`;
    } catch {}
  }
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f3f4f6"/>
          <stop offset="1" stop-color="#e5e7eb"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="60" fill="url(#g)"/>
      <rect x="48" y="48" width="24" height="24" rx="3" fill="#d1d5db" transform="rotate(45 60 60)"/>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function buildCardHtml(item: OrderDesignInput, placeholderUrl: string) {
  const code = String(item?.designCode || "").trim();
  if (!code) return "";
  const badge = escapeHtml(code.replace("OG/SCF/", ""));
  const qty50 = Number(item?.qty50 || 0);
  const qty90 = Number(item?.qty90 || 0);
  const img = String(item?.imageUrl || "").trim() || placeholderUrl;
  const imgSafe = escapeHtml(img);
  return `
    <article class="card">
      <div class="sku-badge">${badge}</div>
      <div class="img">
        <img src="${imgSafe}" alt="${badge}" />
      </div>
      <div class="qty">
        <div class="row">
          <div class="label">50x50 cm (Small)</div>
          <div class="value">${qty50} pcs</div>
        </div>
        <div class="row">
          <div class="label">90x90 cm (Large)</div>
          <div class="value">${qty90} pcs</div>
        </div>
      </div>
    </article>
  `.trim();
}

function buildFabricSectionHtml(fabricType: string, cardsHtml: string) {
  const fabric = escapeHtml(fabricType);
  return `
    <section class="fabric-section">
      <div class="fabric-line">
        <div class="fabric-label">Fabric Type:</div>
        <div class="fabric-pill">${fabric}</div>
      </div>
      <div class="grid design-grid">
        ${cardsHtml}
      </div>
    </section>
  `.trim();
}

function buildHeaderHtml(data: GenerateOrderPdfInput["data"], logoDataUrl: string) {
  const company = escapeHtml(data.companyName || "Grey Exim");
  const recipient = escapeHtml(data.recipient || "");
  const date = escapeHtml(formatDate(data.date) || "");
  const orderNo = escapeHtml(data.orderNumber || "");
  const challanNo = escapeHtml(data.challanNumber || "");
  const preparedBy = escapeHtml(data.preparedBy || "");
  const logoImg = logoDataUrl
    ? `<img class="logo" src="${escapeHtml(logoDataUrl)}" alt="${company}" />`
    : `<div class="logo"></div>`;

  return `
    <header class="header">
      <div class="left">
        ${logoImg}
        <div>
          <div class="brand-name">${company}</div>
          <div class="title">Fabric Print Order</div>
        </div>
      </div>
      <div class="meta">
        <div class="meta-row">
          <div class="meta-k">To:</div>
          <div class="meta-v">${recipient}</div>
        </div>
        <div class="meta-row">
          <div class="meta-k">Date:</div>
          <div class="meta-v">${date}</div>
        </div>
        <div class="meta-row">
          <div class="meta-k">Order No:</div>
          <div class="meta-v">${orderNo}</div>
        </div>
        <div class="meta-row">
          <div class="meta-k">Challan No:</div>
          <div class="meta-v">${challanNo}</div>
        </div>
        <div class="meta-row">
          <div class="meta-k">Prepared by:</div>
          <div class="meta-v">${preparedBy}</div>
        </div>
      </div>
    </header>
  `.trim();
}

function buildFooterHtml(total50: number, total90: number) {
  return `
    <footer class="footer">
      <div class="totals">
        <div class="totals-title">Total Quantity</div>
        <div class="totals-row">
          <span>50x50 cm (Small):</span>
          <strong>${total50} pcs</strong>
        </div>
        <div class="totals-row">
          <span>90x90 cm (Large):</span>
          <strong>${total90} pcs</strong>
        </div>
      </div>
    </footer>
  `.trim();
}

function buildEmptyFooterHtml() {
  return `<div class="footer" style="border-top: none;"></div>`;
}

function buildPagesHtml(data: GenerateOrderPdfInput["data"], logoDataUrl: string) {
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const placeholderUrl = placeholderImageDataUrl();
  let total50 = 0;
  let total90 = 0;

  type Row = OrderDesignInput[];
  type FabricBlock = { fabricType: string; rows: Row[] };
  const rowsPerPage = 2;
  const pages: FabricBlock[][] = [];
  let current: FabricBlock[] = [];
  let rowsUsed = 0;

  for (const group of groups) {
    const fabricType = String(group?.fabricType || "").trim();
    if (!fabricType) continue;
    const designs = Array.isArray(group?.designs) ? group.designs : [];
    const validDesigns = designs.filter((d) => String(d?.designCode || "").trim());
    if (validDesigns.length === 0) continue;
    validDesigns.forEach((d) => {
      total50 += Number(d?.qty50 || 0);
      total90 += Number(d?.qty90 || 0);
    });

    const rows = chunk(validDesigns, 4);
    let idx = 0;
    while (idx < rows.length) {
      if (rowsUsed >= rowsPerPage) {
        pages.push(current);
        current = [];
        rowsUsed = 0;
      }
      const remaining = rowsPerPage - rowsUsed;
      const take = Math.min(remaining, rows.length - idx);
      const slice = rows.slice(idx, idx + take);
      current.push({ fabricType, rows: slice });
      rowsUsed += take;
      idx += take;
      if (rowsUsed >= rowsPerPage) {
        pages.push(current);
        current = [];
        rowsUsed = 0;
      }
    }
  }
  if (current.length > 0) pages.push(current);

  const headerHtml = buildHeaderHtml(data, logoDataUrl);
  const footerHtml = buildFooterHtml(total50, total90);
  const emptyFooterHtml = buildEmptyFooterHtml();

  return pages
    .map((pageBlocks, pageIndex) => {
      const sections = pageBlocks
        .map((block) => {
          const cards = block.rows
            .flat()
            .map((item) => buildCardHtml(item, placeholderUrl))
            .filter(Boolean)
            .join("\n");
          return buildFabricSectionHtml(block.fabricType, cards);
        })
        .join("\n");
      const footer = pageIndex === pages.length - 1 ? footerHtml : emptyFooterHtml;
      return `
        <div class="page">
          ${headerHtml}
          <main class="main">
            ${sections}
          </main>
          ${footer}
        </div>
      `.trim();
    })
    .join("\n");
}

export async function generateOrderPdf({ data }: GenerateOrderPdfInput): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    page.setDefaultNavigationTimeout(60_000);
    await page.setViewport({ width: 2800, height: 3963, deviceScaleFactor: 1 });

    const templatePath = path.join(process.cwd(), "src/lib/pdf/templates/single-fabric.html");
    cachedOrderTemplate = await readTextFileCached(templatePath, cachedOrderTemplate);
    let html = cachedOrderTemplate.content;
    const stylesPath = path.join(process.cwd(), "src/lib/pdf/templates/styles.css");
    cachedStylesTemplate = await readTextFileCached(stylesPath, cachedStylesTemplate);
    let styles = cachedStylesTemplate.content || "";
    styles = styles.replaceAll("{{archivoFontFaces}}", await getArchivoFontFacesCss());
    html = html.replaceAll("{{styles}}", styles);

    const logoDataUrl = await getLogoDataUrl();
    const pagesHtml = buildPagesHtml(data, logoDataUrl);
    html = html.replaceAll("{{pagesHtml}}", pagesHtml);

    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    await page.evaluate(async () => {
      const timeoutMs = 8_000;
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const fonts: any = (document as any).fonts;
      if (fonts?.ready) {
        await Promise.race([fonts.ready, sleep(timeoutMs)]);
      }
      const imgs = Array.from(document.images || []);
      await Promise.race([
        Promise.all(
          imgs.map(
            (img) =>
              img.complete
                ? Promise.resolve()
                : new Promise((resolve) => {
                    img.addEventListener("load", resolve, { once: true });
                    img.addEventListener("error", resolve, { once: true });
                  })
          )
        ),
        sleep(timeoutMs),
      ]);
    }).catch(() => {});

    const pdf = await page.pdf({
      width: "2800px",
      height: "3963px",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return pdf;
  } finally {
    try {
      await page.close();
    } catch {}
  }
}
