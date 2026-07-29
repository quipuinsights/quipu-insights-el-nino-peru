import { mkdir, writeFile } from "node:fs/promises";

const NOAA_WEEKLY =
  "https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for";
const NOAA_ONI =
  "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt";
const ENFEN_POSTS =
  "https://enfen.imarpe.gob.pe/wp-json/wp/v2/posts?search=Comunicado%20Oficial%20ENFEN&per_page=5&_fields=date,link,title,excerpt,content";

const monthIndex = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

const monthEs = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const FALLBACK = {
  indicators: {
    nino12: { value: 2.7, date: "09 jul 2026" },
    nino34: { value: 1.2, date: "09 jul 2026" },
    oni: { value: 0.98, date: "may 2026" },
    icen: { value: null, date: "publicación mensual ENFEN" },
  },
  history: [
    { year: 1950, nino12: null, nino34: -1.0 },
    { year: 1957, nino12: null, nino34: 0.8 },
    { year: 1965, nino12: null, nino34: 1.0 },
    { year: 1972, nino12: null, nino34: 0.9 },
    { year: 1981, nino12: -0.1, nino34: -0.2 },
    { year: 1982, nino12: 1.3, nino34: 1.0 },
    { year: 1988, nino12: -0.6, nino34: -1.2 },
    { year: 1997, nino12: 1.7, nino34: 1.4 },
    { year: 2007, nino12: -0.7, nino34: -0.8 },
    { year: 2015, nino12: 0.8, nino34: 1.3 },
    { year: 2017, nino12: 1.2, nino34: 0.0 },
    { year: 2023, nino12: 1.5, nino34: 1.1 },
    { year: 2026, nino12: 2.7, nino34: 1.2 },
  ],
  enfen: {
    title: "Comunicado Oficial ENFEN N.° 13-2026",
    state: "Alerta de El Niño Costero",
    date: "17 jul 2026",
    url: "https://enfen.imarpe.gob.pe/2026/07/17/comunicado-oficial-enfen-n-13-2026-estado-de-sistema-de-alerta-alerta-de-el-nino-costero/",
  },
};

function parseWeeklyDate(token) {
  const match = token.match(/^(\d{2})([A-Z]{3})(\d{4})$/);
  if (!match || monthIndex[match[2]] === undefined) return null;
  return new Date(
    Date.UTC(Number(match[3]), monthIndex[match[2]], Number(match[1])),
  );
}

function formatShortDate(date) {
  return `${String(date.getUTCDate()).padStart(2, "0")} ${
    monthEs[date.getUTCMonth()]
  } ${date.getUTCFullYear()}`;
}

function parseWeekly(text) {
  const points = [];
  for (const line of text.split(/\r?\n/)) {
    const dateMatch = line.match(/^\s*(\d{2}[A-Z]{3}\d{4})/);
    if (!dateMatch) continue;
    const date = parseWeeklyDate(dateMatch[1]);
    if (!date) continue;
    const numeric = line
      .slice(dateMatch[0].length)
      .match(/[-+]?\d+(?:\.\d+)?/g)
      ?.map(Number);
    if (!numeric || numeric.length < 8) continue;
    points.push({
      date,
      year: date.getUTCFullYear(),
      nino12: numeric[1],
      nino34: numeric[5],
    });
  }
  return points;
}

function parseOni(text) {
  const annual = new Map();
  let latest = null;
  for (const line of text.split(/\r?\n/)) {
    const match = line
      .trim()
      .match(
        /^([A-Z]{3})\s+(\d{4})\s+[-+]?\d+(?:\.\d+)?\s+([-+]?\d+(?:\.\d+)?)$/,
      );
    if (!match) continue;
    const year = Number(match[2]);
    const value = Number(match[3]);
    const values = annual.get(year) ?? [];
    values.push(value);
    annual.set(year, values);
    latest = { year, season: match[1], value };
  }
  return { annual, latest };
}

function average(values) {
  if (!values.length) return null;
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
  );
}

function buildHistory(weekly, oniAnnual) {
  const weeklyByYear = new Map();
  for (const point of weekly) {
    const bucket = weeklyByYear.get(point.year) ?? {
      nino12: [],
      nino34: [],
    };
    bucket.nino12.push(point.nino12);
    bucket.nino34.push(point.nino34);
    weeklyByYear.set(point.year, bucket);
  }

  const years = new Set([...oniAnnual.keys(), ...weeklyByYear.keys()]);
  return Array.from(years)
    .sort((a, b) => a - b)
    .map((year) => {
      const weeklyYear = weeklyByYear.get(year);
      return {
        year,
        nino12: weeklyYear ? average(weeklyYear.nino12) : null,
        nino34: weeklyYear
          ? average(weeklyYear.nino34)
          : average(oniAnnual.get(year) ?? []),
      };
    });
}

function stripHtml(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#176;/g, "°")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function detectEnfenState(text) {
  const normalized = text.toLocaleLowerCase("es");
  if (normalized.includes("alerta de el niño costero")) {
    return "Alerta de El Niño Costero";
  }
  if (normalized.includes("vigilancia de el niño costero")) {
    return "Vigilancia de El Niño Costero";
  }
  if (normalized.includes("vigilancia de la niña costera")) {
    return "Vigilancia de La Niña Costera";
  }
  if (normalized.includes("no activo")) return "No activo";
  return "Consultar comunicado vigente";
}

function nextRefreshWindow(now) {
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      22,
      0,
      0,
    ),
  );
  if (now >= target) target.setUTCDate(target.getUTCDate() + 1);
  return target;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Quipu-Insights-El-Nino-Peru/1.0",
        Accept: "text/plain,text/html,application/json",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

const now = new Date();
const nextRefreshAt = nextRefreshWindow(now).toISOString();
const [weeklyResult, oniResult, enfenResult] = await Promise.allSettled([
  fetchText(NOAA_WEEKLY),
  fetchText(NOAA_ONI),
  fetchText(ENFEN_POSTS),
]);

const weekly =
  weeklyResult.status === "fulfilled" ? parseWeekly(weeklyResult.value) : [];
const oni =
  oniResult.status === "fulfilled"
    ? parseOni(oniResult.value)
    : { annual: new Map(), latest: null };

const latestWeekly = weekly.at(-1);
const enfen = { ...FALLBACK.enfen };
if (enfenResult.status === "fulfilled") {
  try {
    const posts = JSON.parse(enfenResult.value);
    const latest = posts[0];
    if (latest) {
      const published = new Date(latest.date);
      const body = stripHtml(
        `${latest.title?.rendered ?? ""} ${latest.excerpt?.rendered ?? ""} ${
          latest.content?.rendered ?? ""
        }`,
      );
      enfen.title =
        stripHtml(latest.title?.rendered ?? "") || FALLBACK.enfen.title;
      enfen.state = detectEnfenState(body);
      enfen.date = Number.isNaN(published.getTime())
        ? FALLBACK.enfen.date
        : formatShortDate(published);
      enfen.url = latest.link || FALLBACK.enfen.url;
    }
  } catch {
    // El último comunicado de respaldo permanece visible.
  }
}

const successfulSources = [
  weeklyResult.status === "fulfilled",
  oniResult.status === "fulfilled",
  enfenResult.status === "fulfilled",
].filter(Boolean).length;

const payload = {
  generatedAt: now.toISOString(),
  nextRefreshAt,
  mode:
    successfulSources === 3
      ? "live"
      : successfulSources > 0
        ? "partial"
        : "fallback",
  indicators: {
    nino12: latestWeekly
      ? {
          value: latestWeekly.nino12,
          date: formatShortDate(latestWeekly.date),
        }
      : FALLBACK.indicators.nino12,
    nino34: latestWeekly
      ? {
          value: latestWeekly.nino34,
          date: formatShortDate(latestWeekly.date),
        }
      : FALLBACK.indicators.nino34,
    oni: oni.latest
      ? {
          value: oni.latest.value,
          date: `${oni.latest.season} ${oni.latest.year}`,
        }
      : FALLBACK.indicators.oni,
    icen: FALLBACK.indicators.icen,
  },
  history:
    weekly.length && oni.annual.size
      ? buildHistory(weekly, oni.annual)
      : FALLBACK.history,
  enfen,
};

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../public/data/live.json", import.meta.url),
  `${JSON.stringify(payload, null, 2)}\n`,
  "utf8",
);

console.log(
  `Datos preparados: ${payload.mode} (${successfulSources}/3 fuentes disponibles)`,
);
