import { mkdir, readFile, writeFile } from "node:fs/promises";

const NOAA_WEEKLY =
  "https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for";
const NOAA_ONI =
  "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt";
const NOAA_RONI =
  "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/";
const ENFEN_POSTS =
  "https://enfen.imarpe.gob.pe/wp-json/wp/v2/posts?search=Comunicado%20Oficial%20ENFEN&per_page=5&_fields=date,link,title,excerpt,content";
const LIMA_DISTRICTS =
  "https://services5.arcgis.com/bHvzrGGxW8wP6Utm/ArcGIS/rest/services/SISTEMA_VIAL_METROPOLITANO/FeatureServer/11/query?where=1%3D1&outFields=IDDIST%2CDISTRITO%2CPROVINCIA&outSR=4326&returnGeometry=true&f=geojson";

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
    nino12: { value: 3.8, date: "22 jul 2026" },
    nino34: { value: 2.2, date: "22 jul 2026" },
    roni: { value: 1.0, date: "MJJ 2026" },
    oni: { value: 0.98, date: "AMJ 2026" },
    icen: { value: 1.98, date: "may 2026 · pub. 26 jun" },
  },
  history: [],
  enfen: {
    title: "Comunicado Oficial ENFEN N.° 13-2026",
    state: "Alerta de El Niño Costero",
    date: "17 jul 2026",
    url: "https://enfen.imarpe.gob.pe/2026/07/17/comunicado-oficial-enfen-n-13-2026-estado-de-sistema-de-alerta-alerta-de-el-nino-costero/",
  },
};

const FIXED_MODULES = {
  hydrology: {
    status: "available",
    title: "Ríos de Lima",
    period: "jul–nov 2026",
    publishedAt: "jul 2026",
    freshUntil: "2026-11-30T23:59:59-05:00",
    summary:
      "El pronóstico estacional clasifica como normal el caudal mensual de Chillón, Rímac y Lurín entre julio y noviembre.",
    rivers: [
      {
        name: "Río Chillón",
        station: "Obrajillo",
        outlook: ["Normal", "Normal", "Normal", "Normal", "Normal"],
      },
      {
        name: "Río Rímac",
        station: "Chosica",
        outlook: ["Normal", "Normal", "Normal", "Normal", "Normal"],
      },
      {
        name: "Río Lurín",
        station: "Antapucro",
        outlook: ["Normal", "Normal", "Normal", "Normal", "Normal"],
      },
    ],
    months: ["Jul", "Ago", "Sep", "Oct", "Nov"],
    note:
      "Normal es una categoría mensual de caudal; no descarta crecidas puntuales ni reemplaza un aviso hidrológico.",
    source: "SENAMHI · Pronóstico hidrológico estacional",
    sourceUrl: "https://www.senamhi.gob.pe/load/file/02694SENA-71.pdf",
    alertsUrl: "https://www.senamhi.gob.pe/?p=avisos-detalle-hidrologicos",
  },
  dengue: {
    status: "available",
    cutoff: "25 jul 2026",
    epidemiologicalWeek: 29,
    updatedAt: "31 jul 2026",
    freshUntil: "2026-08-16T23:59:59-05:00",
    peru: {
      cases: 39925,
      previousCases: 29636,
      deaths: 44,
      previousDeaths: 48,
    },
    lima: {
      cases: 4347,
      previousCases: 1646,
      changePct: 164,
      latestWeekCases: 182,
      incidence: 12.55,
      deaths: 1,
      confirmed: 3865,
      probable: 482,
      diris: [
        { name: "Lima Norte", value: 1638 },
        { name: "Lima Centro", value: 1179 },
        { name: "Lima Sur", value: 924 },
        { name: "Lima Este", value: 439 },
        { name: "Lima Provincias", value: 167 },
      ],
      history: [
        { year: 2021, cases: 1179 },
        { year: 2022, cases: 927 },
        { year: 2023, cases: 28485 },
        { year: 2024, cases: 87604 },
        { year: 2025, cases: 1646 },
        { year: 2026, cases: 4347 },
      ],
    },
    note:
      "Comparación al mismo corte epidemiológico. Temperatura y lluvia pueden favorecer transmisión, pero no prueban causalidad por sí solas.",
    source: "CDC Perú · Sala Situacional de Dengue",
    sourceUrl: "https://app7.dge.gob.pe/maps/sala_metaxenica/",
    climateUrl: "https://app7.dge.gob.pe/maps2/shiny_observatorio_web/",
  },
  fishing: {
    status: "available",
    officialCutoff: "10 jun 2026",
    publishedAt: "12 jun 2026",
    freshUntil: "2026-09-15T23:59:59-05:00",
    northCentral: {
      landingTonnes: 469275,
      quotaTonnes: 1914049,
      quotaPct: 24.61,
    },
    south: {
      landingTonnes: 156412,
      quotaTonnes: 251000,
      quotaPct: 62.3,
    },
    scotiabank: {
      approximateLandingTonnes: 500000,
      usualSeasonTonnes: 2000000,
      reportDate: "jul 2026",
    },
    note:
      "IMARPE reportó cardúmenes adultos y juveniles cerca de la costa y cierres para proteger juveniles.",
    source: "ENFEN / IMARPE · Informe técnico N.° 12",
    sourceUrl:
      "https://enfen.imarpe.gob.pe/download/informe-tecnico-enfen-ano-12-n12-al-12-de-junio-de-2026/",
    liveUrl:
      "https://reportes.imarpe.gob.pe/archivos/reportes/Reporte_Anchoveta_I_2026.html",
  },
  agro: {
    status: "available",
    publishedAt: "jul 2026",
    freshUntil: "2026-09-30T23:59:59-05:00",
    productionForecast2026: 0.9,
    production2025: 4.8,
    series: [
      { year: 2013, value: 2.7 },
      { year: 2014, value: 1.6 },
      { year: 2015, value: 3.5 },
      { year: 2016, value: 2.7 },
      { year: 2017, value: 2.9 },
      { year: 2018, value: 7.7 },
      { year: 2019, value: 3.5 },
      { year: 2020, value: 1.0 },
      { year: 2021, value: 4.6 },
      { year: 2022, value: 4.6 },
      { year: 2023, value: -2.0 },
      { year: 2024, value: 5.4 },
      { year: 2025, value: 4.8 },
      { year: 2026, value: 0.9 },
    ],
    crops: ["Papa", "Maíz", "Arroz", "Café", "Cacao"],
    note:
      "La lluvia, temperatura mínima y déficit hídrico cambian por cultivo y territorio; no se publica un único riesgo nacional de plagas.",
    source: "Scotiabank Perú · Estudios Económicos, jul 2026",
    sourceUrl: "https://web2.senamhi.gob.pe/?p=boletines",
  },
};

const SCOTIABANK = {
  reportDate: "jul 2026",
  source: "Estudios Económicos Scotiabank Perú",
  globalVeryStrongProbability: 81,
  coastalSummerProbabilities: [
    { label: "Débil", value: 6 },
    { label: "Moderado", value: 23 },
    { label: "Fuerte", value: 38 },
    { label: "Extraordinario", value: 33 },
  ],
  historicalLosses: [
    { period: "1982–83", gdpPct: 7.0, usdMillions: 3283 },
    { period: "1997–98", gdpPct: 4.5, usdMillions: 3500 },
    { period: "2016–17", gdpPct: 2.3, usdMillions: 5000 },
  ],
  gdpImpactPoints: [
    { year: 1983, value: -4.1 },
    { year: 1998, value: -1.7 },
    { year: 2017, value: -0.8 },
    { year: 2023, value: -1.1 },
  ],
  sectorRevision2026: [
    { label: "Pesca y manufactura primaria", value: -0.3 },
    { label: "Agro", value: -0.2 },
    { label: "Minería", value: -0.1 },
    { label: "Hidrocarburos", value: -0.1 },
    { label: "Comercio", value: 0.2 },
    { label: "Servicios", value: 0.4 },
    { label: "Construcción", value: 0.4 },
  ],
  peruGdpForecast: { previous: 3.2, revised: 3.5 },
  regional: {
    chile: {
      title: "Chile: riesgo hidrológico y logístico",
      detail:
        "El impacto depende de lluvias centro-sur: agricultura, carreteras, puertos y energía pueden moverse en direcciones distintas.",
      evidence: "La tormenta de junio de 2023 dejó daños estimados en US$750 millones.",
    },
    mexico: {
      title: "México: dos riesgos opuestos",
      detail:
        "Sur y sureste: lluvia e inundación. Norte y noreste: sequía, reservorios bajos y presión sobre agro y ganadería.",
      evidence: "El Pacífico mexicano proyectó 18–21 sistemas en la temporada 2026.",
    },
  },
};

const GDP_BY_DEPARTMENT = {
  2017: {
    Tumbes: 0.9,
    Piura: -1.7,
    Lambayeque: 2.1,
    "La Libertad": 1.7,
    Cajamarca: 1.0,
    Amazonas: 5.9,
    "San Martin": 6.5,
    Loreto: 6.1,
    Ancash: 5.2,
    Huanuco: 8.3,
    Pasco: -1.3,
    Junin: 4.0,
    Lima: 1.9,
    Huancavelica: 4.6,
    Ica: 3.5,
    Ayacucho: 5.0,
    Cusco: -2.2,
    Apurimac: 23.6,
    Arequipa: 4.1,
    Moquegua: 0.8,
    Tacna: 0.5,
    Puno: 2.7,
    "Madre De Dios": -9.2,
    Ucayali: 1.8,
  },
  2023: {
    Tumbes: -4.1,
    Piura: 3.3,
    Lambayeque: -5.7,
    "La Libertad": -2.4,
    Cajamarca: -0.8,
    Amazonas: 2.7,
    "San Martin": 1.8,
    Loreto: 1.4,
    Ancash: -3.5,
    Huanuco: 6.4,
    Pasco: 2.2,
    Junin: -3.0,
    Lima: -1.4,
    Huancavelica: 1.7,
    Ica: 0.4,
    Ayacucho: -2.2,
    Cusco: 3.7,
    Apurimac: 6.4,
    Arequipa: -1.0,
    Moquegua: 27.0,
    Tacna: -0.1,
    Puno: -7.4,
    "Madre De Dios": 0.1,
    Ucayali: 0.2,
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

function parseRoni(text) {
  const plain = text.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const match = plain.match(/2026\s+((?:[-+]?\d+(?:\.\d+)?\s+){2,12})/);
  if (!match) return null;
  const values = match[1].trim().split(/\s+/).map(Number).filter(Number.isFinite);
  if (!values.length) return null;
  const seasons = ["NDJ", "DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND"];
  return { value: values.at(-1), date: `${seasons[values.length - 1] ?? "2026"} 2026` };
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
    const bucket = weeklyByYear.get(point.year) ?? { nino12: [], nino34: [] };
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

function buildEventProfile(weekly, year) {
  const monthly = new Map();
  for (const point of weekly) {
    if (point.year !== year) continue;
    const month = point.date.getUTCMonth() + 1;
    const values = monthly.get(month) ?? [];
    values.push(point.nino12);
    monthly.set(month, values);
  }
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    value: average(monthly.get(index + 1) ?? []),
  }));
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
  if (normalized.includes("alerta de el niño costero")) return "Alerta de El Niño Costero";
  if (normalized.includes("vigilancia de el niño costero")) return "Vigilancia de El Niño Costero";
  if (normalized.includes("vigilancia de la niña costera")) return "Vigilancia de La Niña Costera";
  if (normalized.includes("no activo")) return "No activo";
  return "Consultar comunicado vigente";
}

function nextRefreshWindow(now) {
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0),
  );
  if (now >= target) target.setUTCDate(target.getUTCDate() + 1);
  return target;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Quipu-Insights-El-Nino-Peru/2.0",
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
const [weeklyResult, oniResult, roniResult, enfenResult, districtResult] =
  await Promise.allSettled([
    fetchText(NOAA_WEEKLY),
    fetchText(NOAA_ONI),
    fetchText(NOAA_RONI),
    fetchText(ENFEN_POSTS),
    fetchText(LIMA_DISTRICTS),
  ]);

const weekly = weeklyResult.status === "fulfilled" ? parseWeekly(weeklyResult.value) : [];
const oni = oniResult.status === "fulfilled" ? parseOni(oniResult.value) : { annual: new Map(), latest: null };
const roni = roniResult.status === "fulfilled" ? parseRoni(roniResult.value) : null;
const latestWeekly = weekly.at(-1);

const previousData = await readFile(new URL("../public/data/live.json", import.meta.url), "utf8")
  .then(JSON.parse)
  .catch(() => null);

const enfen = { ...FALLBACK.enfen };
if (enfenResult.status === "fulfilled") {
  try {
    const posts = JSON.parse(enfenResult.value);
    const latest = posts[0];
    if (latest) {
      const published = new Date(latest.date);
      const body = stripHtml(
        `${latest.title?.rendered ?? ""} ${latest.excerpt?.rendered ?? ""} ${latest.content?.rendered ?? ""}`,
      );
      enfen.title = stripHtml(latest.title?.rendered ?? "") || FALLBACK.enfen.title;
      enfen.state = detectEnfenState(body);
      enfen.date = Number.isNaN(published.getTime()) ? FALLBACK.enfen.date : formatShortDate(published);
      enfen.url = latest.link || FALLBACK.enfen.url;
    }
  } catch {
    // Conserva el comunicado verificado de respaldo.
  }
}

const successfulSources = [
  weeklyResult.status === "fulfilled",
  oniResult.status === "fulfilled",
  roniResult.status === "fulfilled",
  enfenResult.status === "fulfilled",
].filter(Boolean).length;

const payload = {
  generatedAt: now.toISOString(),
  nextRefreshAt,
  mode: successfulSources === 4 ? "live" : successfulSources > 0 ? "partial" : "fallback",
  indicators: {
    nino12: latestWeekly
      ? { value: latestWeekly.nino12, date: formatShortDate(latestWeekly.date) }
      : previousData?.indicators?.nino12 ?? FALLBACK.indicators.nino12,
    nino34: latestWeekly
      ? { value: latestWeekly.nino34, date: formatShortDate(latestWeekly.date) }
      : previousData?.indicators?.nino34 ?? FALLBACK.indicators.nino34,
    roni: roni ?? previousData?.indicators?.roni ?? FALLBACK.indicators.roni,
    oni: oni.latest
      ? { value: oni.latest.value, date: `${oni.latest.season} ${oni.latest.year}` }
      : previousData?.indicators?.oni ?? FALLBACK.indicators.oni,
    icen: FALLBACK.indicators.icen,
  },
  history:
    weekly.length && oni.annual.size
      ? buildHistory(weekly, oni.annual)
      : previousData?.history?.length
        ? previousData.history
        : FALLBACK.history,
  eventProfiles: {
    currentYear: now.getUTCFullYear(),
    current: weekly.length
      ? buildEventProfile(weekly, now.getUTCFullYear())
      : previousData?.eventProfiles?.current ?? [],
    nino1998: weekly.length ? buildEventProfile(weekly, 1998) : previousData?.eventProfiles?.nino1998 ?? [],
    nino2017: weekly.length ? buildEventProfile(weekly, 2017) : previousData?.eventProfiles?.nino2017 ?? [],
  },
  enfen,
  modules: FIXED_MODULES,
  scotiabank: SCOTIABANK,
  departmentHistory: GDP_BY_DEPARTMENT,
  freshness: [
    { name: "NOAA CPC", state: weeklyResult.status === "fulfilled" ? "updated" : "delayed", cadence: "Semanal", date: latestWeekly ? formatShortDate(latestWeekly.date) : FALLBACK.indicators.nino12.date, url: NOAA_WEEKLY },
    { name: "ENFEN", state: enfenResult.status === "fulfilled" ? "updated" : "delayed", cadence: "Según comunicado", date: enfen.date, url: enfen.url },
    { name: "SENAMHI ríos", state: "updated", cadence: "Mensual / avisos", date: FIXED_MODULES.hydrology.publishedAt, url: FIXED_MODULES.hydrology.sourceUrl },
    { name: "CDC Dengue", state: now <= new Date(FIXED_MODULES.dengue.freshUntil) ? "updated" : "delayed", cadence: "Semanal", date: FIXED_MODULES.dengue.updatedAt, url: FIXED_MODULES.dengue.sourceUrl },
    { name: "IMARPE anchoveta", state: now <= new Date(FIXED_MODULES.fishing.freshUntil) ? "updated" : "delayed", cadence: "Según monitoreo", date: FIXED_MODULES.fishing.publishedAt, url: FIXED_MODULES.fishing.liveUrl },
    { name: "Agro", state: now <= new Date(FIXED_MODULES.agro.freshUntil) ? "updated" : "delayed", cadence: "Mensual", date: FIXED_MODULES.agro.publishedAt, url: FIXED_MODULES.agro.sourceUrl },
    { name: "Scotiabank Perú", state: "updated", cadence: "Edición jul 2026", date: SCOTIABANK.reportDate, url: "#economia" },
  ],
};

const dataDirectory = new URL("../public/data/", import.meta.url);
await mkdir(dataDirectory, { recursive: true });
await writeFile(
  new URL("../public/data/live.json", import.meta.url),
  `${JSON.stringify(payload, null, 2)}\n`,
  "utf8",
);

if (districtResult.status === "fulfilled") {
  try {
    const geojson = JSON.parse(districtResult.value);
    if (geojson?.type === "FeatureCollection" && geojson.features?.length) {
      await writeFile(
        new URL("../public/data/lima-callao-districts.json", import.meta.url),
        `${JSON.stringify(geojson)}\n`,
        "utf8",
      );
    }
  } catch {
    // La geometría estable ya descargada permanece disponible.
  }
}

console.log(
  `Datos preparados: ${payload.mode} (${successfulSources}/4 fuentes dinámicas; módulos con fecha de corte)`,
);
