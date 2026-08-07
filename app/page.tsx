"use client";

import { useEffect, useMemo, useState } from "react";
import seedLiveData from "../public/data/live.json";

type Indicator = { value: number | null; date: string };
type EventPoint = { month: number; value: number | null };
type HistoryPoint = { year: number; nino12: number | null; nino34: number | null };
type Freshness = {
  name: string;
  state: "updated" | "delayed" | "unavailable";
  cadence: string;
  date: string;
  url: string;
};

type LiveData = {
  generatedAt: string;
  nextRefreshAt: string;
  mode: "live" | "partial" | "fallback";
  indicators: {
    nino12: Indicator;
    nino34: Indicator;
    roni: Indicator;
    oni: Indicator;
    icen: Indicator;
  };
  history: HistoryPoint[];
  eventProfiles: {
    currentYear: number;
    current: EventPoint[];
    nino1998: EventPoint[];
    nino2017: EventPoint[];
  };
  enfen: { title: string; state: string; date: string; url: string };
  modules: {
    hydrology: {
      status: string;
      title: string;
      period: string;
      publishedAt: string;
      freshUntil: string;
      summary: string;
      rivers: { name: string; station: string; outlook: string[] }[];
      months: string[];
      note: string;
      source: string;
      sourceUrl: string;
      alertsUrl: string;
    };
    dengue: {
      status: string;
      cutoff: string;
      epidemiologicalWeek: number;
      updatedAt: string;
      freshUntil: string;
      peru: {
        cases: number;
        previousCases: number;
        deaths: number;
        previousDeaths: number;
      };
      lima: {
        cases: number;
        previousCases: number;
        changePct: number;
        latestWeekCases: number;
        incidence: number;
        deaths: number;
        confirmed: number;
        probable: number;
        diris: { name: string; value: number }[];
        history: { year: number; cases: number }[];
      };
      note: string;
      source: string;
      sourceUrl: string;
      climateUrl: string;
    };
    fishing: {
      status: string;
      officialCutoff: string;
      publishedAt: string;
      freshUntil: string;
      northCentral: { landingTonnes: number; quotaTonnes: number; quotaPct: number };
      south: { landingTonnes: number; quotaTonnes: number; quotaPct: number };
      scotiabank: {
        approximateLandingTonnes: number;
        usualSeasonTonnes: number;
        reportDate: string;
      };
      note: string;
      source: string;
      sourceUrl: string;
      liveUrl: string;
    };
    agro: {
      status: string;
      publishedAt: string;
      freshUntil: string;
      productionForecast2026: number;
      production2025: number;
      series: { year: number; value: number }[];
      crops: string[];
      note: string;
      source: string;
      sourceUrl: string;
    };
  };
  scotiabank: {
    reportDate: string;
    source: string;
    globalVeryStrongProbability: number;
    coastalSummerProbabilities: { label: string; value: number }[];
    historicalLosses: { period: string; gdpPct: number; usdMillions: number }[];
    gdpImpactPoints: { year: number; value: number }[];
    sectorRevision2026: { label: string; value: number }[];
    peruGdpForecast: { previous: number; revised: number };
    regional: Record<string, { title: string; detail: string; evidence: string }>;
  };
  departmentHistory: Record<string, Record<string, number>>;
  freshness: Freshness[];
};

type Department = { code: string; name: string; path: string };
type PeruMapData = {
  source: string;
  sourceUrl: string;
  viewBox: string;
  departments: Department[];
};
type GeoFeature = {
  type: "Feature";
  properties: { IDDIST?: string; DISTRITO?: string; PROVINCIA?: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};
type GeoCollection = { type: "FeatureCollection"; features: GeoFeature[] };

const INITIAL_DATA = seedLiveData as unknown as LiveData;
const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const displayNames: Record<string, string> = {
  Ancash: "Áncash",
  Apurimac: "Apurímac",
  Huanuco: "Huánuco",
  Junin: "Junín",
  "Madre De Dios": "Madre de Dios",
  "San Martin": "San Martín",
};

const territoryNotes: Record<string, { zone: string; focus: string; river: string }> = {
  Tumbes: { zone: "Costa norte", focus: "Lluvia, conectividad y agricultura", river: "Río Tumbes" },
  Piura: { zone: "Costa norte", focus: "Lluvia, agroindustria y vías", river: "Ríos Piura y Chira" },
  Lambayeque: { zone: "Costa norte", focus: "Agro, drenaje urbano y comercio", river: "La Leche y Chancay" },
  "La Libertad": { zone: "Costa norte", focus: "Agroexportación, vías y pesca", river: "Chicama y Moche" },
  Lima: { zone: "Costa central", focus: "Agua, logística, salud y quebradas", river: "Rímac, Chillón y Lurín" },
  Callao: { zone: "Costa central", focus: "Puerto, logística y cuenca baja", river: "Cuenca baja del Rímac" },
  Ancash: { zone: "Costa y Andes", focus: "Pesca, vías y agricultura", river: "Río Santa" },
  Ica: { zone: "Costa sur", focus: "Agroexportación y disponibilidad hídrica", river: "Río Ica" },
  Arequipa: { zone: "Sur", focus: "Agro, minería y logística", river: "Chili y Ocoña" },
  Moquegua: { zone: "Sur", focus: "Agua, minería y agricultura", river: "Río Moquegua" },
  Tacna: { zone: "Sur", focus: "Déficit hídrico y agricultura", river: "Caplina y Sama" },
};

const limaEvents: Record<
  string,
  {
    name: string;
    basin: "Rímac / Huaycoloro" | "Chillón" | "Lurín / sur";
    year: string;
    event: string;
    impact: string;
    sources: { label: string; href: string }[];
  }
> = {
  CIENEGUILLA: {
    name: "Cieneguilla",
    basin: "Lurín / sur",
    year: "2017",
    event: "Crecida y desborde del río Lurín",
    impact: "Erosión de unos 200 m del malecón, caída de un muro, viviendas inundadas y afectación de cultivos y vías.",
    sources: [
      { label: "Andina · 14 mar 2017", href: "https://andina.pe/agencia/noticia-cieneguilla-rio-lurin-erosiona-parte-malecon-y-derriba-muro-contencion-657960.aspx" },
      { label: "Congreso · balance 2017", href: "https://comunicaciones.congreso.gob.pe/noticias/congresista-noceda-constato-peligros-en-cieneguilla/" },
    ],
  },
  "SAN JUAN DE LURIGANCHO": {
    name: "San Juan de Lurigancho",
    basin: "Rímac / Huaycoloro",
    year: "2017",
    event: "Desborde del río Huaycoloro",
    impact: "Inundó viviendas en Zárate y, en marzo, provocó el colapso del puente peatonal Talavera.",
    sources: [
      { label: "INDECI · Compendio 2017", href: "https://portal.indeci.gob.pe/wp-content/uploads/2019/01/201802271714541.pdf" },
      { label: "ANIN · obra Huaycoloro", href: "https://www.gob.pe/institucion/anin/noticias/1247801-huaycoloro-nunca-mas-obra-protegera-a-miles-de-habitantes-de-campoy-nieveria-huachipa-y-cajamarquilla" },
    ],
  },
  LURIGANCHO: {
    name: "Lurigancho–Chosica",
    basin: "Rímac / Huaycoloro",
    year: "2017",
    event: "Activación de quebradas y huaicos",
    impact: "Desde enero se reportaron daños en viviendas, vías, instituciones educativas y población.",
    sources: [{ label: "INDECI · Compendio 2017", href: "https://portal.indeci.gob.pe/wp-content/uploads/2019/01/201802271714541.pdf" }],
  },
  CHACLACAYO: {
    name: "Chaclacayo",
    basin: "Rímac / Huaycoloro",
    year: "2017",
    event: "Huaicos y deslizamientos",
    impact: "Las lluvias activaron quebradas y afectaron viviendas, vías y equipamiento local.",
    sources: [{ label: "INDECI · Compendio 2017", href: "https://portal.indeci.gob.pe/wp-content/uploads/2019/01/201802271714541.pdf" }],
  },
  PACHACAMAC: {
    name: "Pachacámac",
    basin: "Lurín / sur",
    year: "2017",
    event: "Desborde del río Lurín",
    impact: "Afectó cultivos y vías en Pampa Flores, Lote B y Pica Piedra.",
    sources: [{ label: "INDECI · Compendio 2017", href: "https://portal.indeci.gob.pe/wp-content/uploads/2019/01/201802271714541.pdf" }],
  },
  "PUNTA HERMOSA": {
    name: "Punta Hermosa",
    basin: "Lurín / sur",
    year: "2017",
    event: "Huaico en la quebrada Río Seco",
    impact: "El flujo arrastró vehículos y residuos, afectó el entorno urbano y produjo daños personales y materiales.",
    sources: [{ label: "INDECI · Compendio 2017", href: "https://portal.indeci.gob.pe/wp-content/uploads/2019/01/201802271714541.pdf" }],
  },
  CARABAYLLO: {
    name: "Carabayllo",
    basin: "Chillón",
    year: "2017",
    event: "Desborde del río Chillón",
    impact: "Afectó terrenos agrícolas y sectores ribereños del norte de Lima.",
    sources: [{ label: "INDECI · Compendio 2017", href: "https://portal.indeci.gob.pe/wp-content/uploads/2019/01/201802271714541.pdf" }],
  },
  COMAS: {
    name: "Comas",
    basin: "Chillón",
    year: "2017",
    event: "Crecida y desborde del río Chillón",
    impact: "Se reportaron viviendas y vías expuestas en sectores próximos a Huertos de Pro.",
    sources: [{ label: "Andina · riberas del Chillón", href: "https://andina.pe/agencia/noticia-alcaldes-acuerdan-declarar-emergencia-ribera-del-rio-chillon-658642.aspx" }],
  },
  PUCUSANA: {
    name: "Pucusana",
    basin: "Lurín / sur",
    year: "2017",
    event: "Desborde del río Chilca",
    impact: "El evento alcanzó zonas residenciales; INDECI incluyó al distrito entre los afectados del sur de Lima.",
    sources: [{ label: "INDECI · Compendio 2017", href: "https://portal.indeci.gob.pe/wp-content/uploads/2019/01/201802271714541.pdf" }],
  },
};

function showName(name: string) {
  return displayNames[name] ?? name;
}

function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function signed(value: number | null, decimals = 1) {
  if (value === null) return "Sin dato";
  return `${value > 0 ? "+" : ""}${formatNumber(value, decimals)}`;
}

function limaDate(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(date);
}

function moduleFresh(freshUntil: string) {
  return Date.now() <= new Date(freshUntil).getTime();
}

function sourceStateLabel(state: Freshness["state"]) {
  if (state === "updated") return "Actualizado";
  if (state === "delayed") return "Atrasado";
  return "No disponible";
}

function gdpColor(value: number | undefined) {
  if (value === undefined) return "#d9ddd8";
  if (value <= -5) return "#9f2d2d";
  if (value < -1) return "#df654d";
  if (value < 1) return "#efb23d";
  if (value < 5) return "#78aa9e";
  return "#177d75";
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <p className="section-detail">{detail}</p>
    </div>
  );
}

function Info({ children }: { children: React.ReactNode }) {
  return <span className="info" title={String(children)} aria-label={`Información: ${String(children)}`}>i</span>;
}

function SignalMeter({ data }: { data: LiveData }) {
  const strongCoastal = (data.indicators.nino12.value ?? 0) >= 0.5;
  const globalWarm = (data.indicators.roni.value ?? 0) >= 0.5;
  const strongForecast = data.scotiabank.coastalSummerProbabilities
    .filter((item) => item.label === "Fuerte" || item.label === "Extraordinario")
    .reduce((sum, item) => sum + item.value, 0) >= 50;
  const officialAlert = data.enfen.state.toLowerCase().includes("alerta");
  const signals = [
    { label: "Costa cálida", active: strongCoastal },
    { label: "ENSO global", active: globalWarm },
    { label: "Pronóstico", active: strongForecast },
    { label: "ENFEN", active: officialAlert },
  ];
  const active = signals.filter((signal) => signal.active).length;
  return (
    <div className="signal-meter" aria-label={`${active} de 4 señales activas`}>
      <div className="signal-score">
        <strong>{active}/4</strong>
        <span>señales activas</span>
      </div>
      <div className="signal-dots">
        {signals.map((signal) => (
          <div key={signal.label} className="signal-dot-row">
            <span className={signal.active ? "dot dot-on" : "dot"} />
            <span>{signal.label}</span>
          </div>
        ))}
      </div>
      <p>No es una probabilidad. Resume cuatro evidencias que se leen por separado.</p>
    </div>
  );
}

function EventLineChart({ data, compare1998, compare2017 }: { data: LiveData; compare1998: boolean; compare2017: boolean }) {
  const width = 840;
  const height = 330;
  const pad = { left: 48, right: 20, top: 28, bottom: 42 };
  const minY = -2;
  const maxY = 5;
  const point = (item: EventPoint) => {
    const x = pad.left + ((item.month - 1) / 11) * (width - pad.left - pad.right);
    const y = pad.top + ((maxY - (item.value ?? 0)) / (maxY - minY)) * (height - pad.top - pad.bottom);
    return [x, y] as const;
  };
  const line = (items: EventPoint[]) => {
    let started = false;
    return items.reduce((path, item) => {
      if (item.value === null) return path;
      const [x, y] = point(item);
      const command = started ? "L" : "M";
      started = true;
      return `${path}${command}${x.toFixed(1)},${y.toFixed(1)} `;
    }, "");
  };
  const yTicks = [-2, 0, 2, 4];
  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución mensual de Niño 1+2 y comparación con 1998 y 2017">
        {yTicks.map((tick) => {
          const y = pad.top + ((maxY - tick) / (maxY - minY)) * (height - pad.top - pad.bottom);
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="chart-grid" />
              <text x={pad.left - 9} y={y + 4} textAnchor="end" className="chart-label">{tick > 0 ? "+" : ""}{tick}°</text>
            </g>
          );
        })}
        {monthLabels.map((month, index) => (
          <text key={month} x={pad.left + (index / 11) * (width - pad.left - pad.right)} y={height - 12} textAnchor="middle" className="chart-label">{month}</text>
        ))}
        {compare1998 && <path d={line(data.eventProfiles.nino1998)} className="line ghost ghost-1998" />}
        {compare2017 && <path d={line(data.eventProfiles.nino2017)} className="line ghost ghost-2017" />}
        <path d={line(data.eventProfiles.current)} className="line line-current" />
        {data.eventProfiles.current.filter((item) => item.value !== null).map((item) => {
          const [x, y] = point(item);
          return <circle key={item.month} cx={x} cy={y} r="4.5" className="current-point"><title>{monthLabels[item.month - 1]} 2026: {signed(item.value)} °C</title></circle>;
        })}
      </svg>
    </div>
  );
}

function MiniBars({ values, valueKey = "value", labelKey = "name", color = "teal" }: { values: Record<string, string | number>[]; valueKey?: string; labelKey?: string; color?: string }) {
  const maximum = Math.max(...values.map((item) => Number(item[valueKey])), 1);
  return (
    <div className="mini-bars">
      {values.map((item) => (
        <div className="mini-bar-row" key={String(item[labelKey])}>
          <span>{item[labelKey]}</span>
          <div className="mini-track"><i className={`bar-${color}`} style={{ width: `${Math.max(3, (Number(item[valueKey]) / maximum) * 100)}%` }} /></div>
          <strong>{formatNumber(Number(item[valueKey]))}</strong>
        </div>
      ))}
    </div>
  );
}

function ProbabilityBar({ values }: { values: { label: string; value: number }[] }) {
  const colors = ["#e8be5f", "#e48b45", "#e55d3b", "#9f2d2d"];
  return (
    <div>
      <div className="probability-bar" aria-label="Probabilidades de magnitud del Niño Costero">
        {values.map((item, index) => (
          <span key={item.label} style={{ width: `${item.value}%`, background: colors[index] }}><b>{item.value}%</b></span>
        ))}
      </div>
      <div className="probability-legend">
        {values.map((item, index) => (
          <span key={item.label}><i style={{ background: colors[index] }} />{item.label} {item.value}%</span>
        ))}
      </div>
    </div>
  );
}

function PeruMap({ map, values, selected, onSelect }: { map: PeruMapData | null; values: Record<string, number>; selected: string; onSelect: (name: string) => void }) {
  if (!map) return <div className="map-loading">Cargando límites departamentales…</div>;
  return (
    <svg className="peru-map" viewBox={map.viewBox} role="img" aria-label="Mapa interactivo del Perú por departamento">
      {map.departments.map((department) => {
        const value = values[department.name];
        return (
          <path
            key={department.code}
            d={department.path}
            fill={gdpColor(value)}
            className={selected === department.name ? "department selected" : "department"}
            tabIndex={0}
            role="button"
            aria-label={`${showName(department.name)}: ${value === undefined ? "sin dato" : signed(value)}%`}
            onClick={() => onSelect(department.name)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(department.name);
            }}
          ><title>{showName(department.name)}: {value === undefined ? "sin dato" : `${signed(value)}%`}</title></path>
        );
      })}
    </svg>
  );
}

function normalizeDistrict(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function geometryPoints(feature: GeoFeature): number[][] {
  const points: number[][] = [];
  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      points.push(node as number[]);
      return;
    }
    node.forEach(walk);
  };
  walk(feature.geometry.coordinates);
  return points;
}

function districtPath(feature: GeoFeature, bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  const width = 680;
  const height = 620;
  const pad = 18;
  const project = (point: number[]) => {
    const x = pad + ((point[0] - bounds.minX) / (bounds.maxX - bounds.minX)) * (width - pad * 2);
    const y = pad + ((bounds.maxY - point[1]) / (bounds.maxY - bounds.minY)) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const polygons = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates as number[][][]]
    : (feature.geometry.coordinates as number[][][][]);
  return polygons.map((polygon) => polygon.map((ring) => `M${ring.map(project).join("L")}Z`).join(" ")).join(" ");
}

function DistrictMap({ geo, selected, filter, onSelect }: { geo: GeoCollection | null; selected: string; filter: string; onSelect: (name: string) => void }) {
  const bounds = useMemo(() => {
    const points = geo?.features.flatMap(geometryPoints) ?? [];
    return {
      minX: Math.min(...points.map((p) => p[0]), -77.2),
      maxX: Math.max(...points.map((p) => p[0]), -76.7),
      minY: Math.min(...points.map((p) => p[1]), -12.6),
      maxY: Math.max(...points.map((p) => p[1]), -11.7),
    };
  }, [geo]);
  if (!geo) return <div className="map-loading">Cargando distritos de Lima y Callao…</div>;
  return (
    <svg className="district-map" viewBox="0 0 680 620" role="img" aria-label="Mapa histórico de distritos de Lima y Callao">
      {geo.features.map((feature) => {
        const name = normalizeDistrict(feature.properties.DISTRITO);
        const item = limaEvents[name];
        const visible = item && (filter === "Todos" || item.basin === filter);
        const className = ["district", visible ? "has-event" : "", selected === name ? "selected" : ""].join(" ");
        return (
          <path
            key={feature.properties.IDDIST ?? name}
            d={districtPath(feature, bounds)}
            className={className}
            tabIndex={item ? 0 : -1}
            role={item ? "button" : undefined}
            aria-label={item ? `${item.name}, evento documentado de ${item.year}` : feature.properties.DISTRITO}
            onClick={() => item && onSelect(name)}
            onKeyDown={(event) => {
              if (item && (event.key === "Enter" || event.key === " ")) onSelect(name);
            }}
          ><title>{item ? `${item.name}: ${item.event}` : feature.properties.DISTRITO}</title></path>
        );
      })}
    </svg>
  );
}

export default function Home() {
  const [data, setData] = useState<LiveData>(INITIAL_DATA);
  const [peruMap, setPeruMap] = useState<PeruMapData | null>(null);
  const [districtGeo, setDistrictGeo] = useState<GeoCollection | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("Piura");
  const [mapYear, setMapYear] = useState<2017 | 2023>(2023);
  const [districtFilter, setDistrictFilter] = useState("Todos");
  const [selectedDistrict, setSelectedDistrict] = useState("CIENEGUILLA");
  const [compare1998, setCompare1998] = useState(true);
  const [compare2017, setCompare2017] = useState(true);
  const [dengueView, setDengueView] = useState<"lima" | "peru">("lima");

  useEffect(() => {
    Promise.allSettled([
      fetch("./data/live.json", { cache: "no-store" }).then((response) => response.json()),
      fetch("./data/peru-departments.json").then((response) => response.json()),
      fetch("./data/lima-callao-districts.json").then((response) => response.json()),
    ]).then(([live, peru, districts]) => {
      if (live.status === "fulfilled") setData(live.value as LiveData);
      if (peru.status === "fulfilled") setPeruMap(peru.value as PeruMapData);
      if (districts.status === "fulfilled") setDistrictGeo(districts.value as GeoCollection);
    });
  }, []);

  const coastalGap = (data.indicators.nino12.value ?? 0) - (data.indicators.nino34.value ?? 0);
  const strongCoastalProbability = data.scotiabank.coastalSummerProbabilities
    .filter((item) => item.label === "Fuerte" || item.label === "Extraordinario")
    .reduce((sum, item) => sum + item.value, 0);
  const departmentValues = data.departmentHistory[String(mapYear)] ?? {};
  const selectedGdp = departmentValues[selectedDepartment];
  const territory = territoryNotes[selectedDepartment] ?? {
    zone: "Territorio peruano",
    focus: "El impacto depende de lluvia, agua, vías y actividad productiva",
    river: "Consulta la cuenca local",
  };
  const districtEvent = limaEvents[selectedDistrict] ?? limaEvents.CIENEGUILLA;
  const availableModules = [
    moduleFresh(data.modules.hydrology.freshUntil) ? "hydrology" : null,
    moduleFresh(data.modules.dengue.freshUntil) ? "dengue" : null,
    moduleFresh(data.modules.fishing.freshUntil) ? "fishing" : null,
    moduleFresh(data.modules.agro.freshUntil) ? "agro" : null,
  ].filter(Boolean);

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quipu-insights-el-nino-peru.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const rows = [
      ["indicador", "valor", "fecha", "fuente"],
      ["Niño 1+2", data.indicators.nino12.value, data.indicators.nino12.date, "NOAA CPC"],
      ["Niño 3.4", data.indicators.nino34.value, data.indicators.nino34.date, "NOAA CPC"],
      ["RONI", data.indicators.roni.value, data.indicators.roni.date, "NOAA CPC"],
      ["ONI histórico", data.indicators.oni.value, data.indicators.oni.date, "NOAA CPC"],
      ["ICEN", data.indicators.icen.value, data.indicators.icen.date, "ENFEN"],
      ["Dengue Lima acumulado", data.modules.dengue.lima.cases, data.modules.dengue.cutoff, "CDC Perú"],
      ["Anchoveta norte-centro t", data.modules.fishing.northCentral.landingTonnes, data.modules.fishing.officialCutoff, "ENFEN / IMARPE"],
      ["Agro 2026 variación %", data.modules.agro.productionForecast2026, data.modules.agro.publishedAt, "Scotiabank Perú"],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quipu-insights-indicadores.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Quipu Insights, inicio">
          <span className="brand-mark">Q</span>
          <span><b>Quipu</b> insights</span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#resumen">Resumen</a>
          <a href="#pronostico">Pronóstico</a>
          <a href="#territorio">Territorio</a>
          <a href="#impactos">Impactos</a>
          <a href="#economia">Economía</a>
        </nav>
        <a className="instagram-link" href="https://www.instagram.com/quipuinsights/" target="_blank" rel="noreferrer">Instagram ↗</a>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow light">Quipu Insights · Sostenibilidad</p>
          <h1>El Niño Perú:<br />de la señal al impacto</h1>
          <p className="hero-lead">Un tablero abierto para entender el océano, anticipar consecuencias y tomar mejores decisiones en Perú.</p>
          <div className="hero-actions">
            <a className="button primary" href="#resumen">Ver lectura de hoy</a>
            <a className="button secondary" href={data.enfen.url} target="_blank" rel="noreferrer">Comunicado ENFEN ↗</a>
          </div>
          <div className="update-line"><span className="live-pulse" /> Revisión automática cada 24 horas · próxima ejecución 17:00 h (Perú)</div>
        </div>
        <div className="hero-panel">
          <div className="official-status">
            <span>Estado oficial ENFEN</span>
            <strong>{data.enfen.state}</strong>
            <small>{data.enfen.date}</small>
          </div>
          <SignalMeter data={data} />
        </div>
      </section>

      <section className="quick-section" id="resumen">
        <SectionHeading
          eyebrow="Lectura rápida"
          title="Qué sabemos hoy"
          detail="Cada tarjeta responde una pregunta distinta. El océano indica el contexto; lluvia, ríos, salud y producción muestran las consecuencias."
        />
        <div className="quick-grid">
          <article className="quick-card alert-card">
            <div className="card-label">Niño Costero <Info>Estado oficial publicado por ENFEN para la costa peruana.</Info></div>
            <h3>{data.enfen.state}</h3>
            <p>Es una categoría oficial de vigilancia; no significa que todo el Perú tenga el mismo nivel de impacto.</p>
            <small>ENFEN · {data.enfen.date}</small>
          </article>
          <article className="quick-card">
            <div className="card-label">Niño 1+2 <Info>Anomalía semanal del mar junto a Perú y Ecuador respecto de su promedio.</Info></div>
            <h3>{signed(data.indicators.nino12.value)} °C</h3>
            <p>El mar costero está más cálido que su promedio. Es señal oceánica, no una medida directa de daño.</p>
            <small>NOAA · {data.indicators.nino12.date}</small>
          </article>
          <article className="quick-card">
            <div className="card-label">ENSO global · RONI <Info>Índice oficial de NOAA ajustado por el calentamiento del océano tropical global.</Info></div>
            <h3>{signed(data.indicators.roni.value)}</h3>
            <p>Describe el Pacífico central. Desde 2026 NOAA usa RONI para el monitoreo operativo del ENSO.</p>
            <small>NOAA · {data.indicators.roni.date}</small>
          </article>
          <article className="quick-card accent-card">
            <div className="card-label">Costa frente al Pacífico <Info>Diferencia simple entre Niño 1+2 y Niño 3.4 de la misma semana.</Info></div>
            <h3>{signed(coastalGap)} °C</h3>
            <p>La costa está {coastalGap >= 0 ? "más cálida" : "menos cálida"} que el Pacífico central. No es un índice oficial ni un pronóstico.</p>
            <small>Indicador comparativo Quipu</small>
          </article>
        </div>
        <div className="color-guide">
          <strong>Cómo leer los colores</strong>
          <span><i className="green" /> Normal o actualizado</span>
          <span><i className="yellow" /> Atención / revisar</span>
          <span><i className="orange" /> Preparar acciones</span>
          <span><i className="red" /> Alerta oficial o impacto alto</span>
          <p>El color resume una categoría dentro de cada gráfico; siempre debe leerse junto con su título y fecha.</p>
        </div>
      </section>

      <section className="ocean-section section-pad">
        <SectionHeading
          eyebrow="Dos zonas, una lectura"
          title="Costa peruana y ENSO global"
          detail="Niño 1+2 mira el mar cercano a Perú; Niño 3.4, RONI y ONI describen el Pacífico central con metodologías distintas."
        />
        <div className="indicator-strip">
          {[
            ["Niño 1+2", data.indicators.nino12, "Costa Perú–Ecuador"],
            ["Niño 3.4", data.indicators.nino34, "Pacífico central semanal"],
            ["ICEN", data.indicators.icen, "Niño Costero mensual"],
            ["RONI", data.indicators.roni, "ENSO operativo NOAA"],
            ["ONI", data.indicators.oni, "Serie histórica NOAA"],
          ].map(([label, indicator, detail]) => {
            const item = indicator as Indicator;
            return (
              <article key={String(label)}>
                <span>{String(label)}</span>
                <strong>{signed(item.value, 2)}</strong>
                <p>{String(detail)}</p>
                <small>{item.date}</small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="forecast-section section-pad" id="pronostico">
        <SectionHeading
          eyebrow="Mirada hacia adelante"
          title="Pronóstico explicado a 3, 6 y 9 meses"
          detail="Son horizontes y preguntas distintas. Las probabilidades provienen del reporte Scotiabank de julio 2026, basado en publicaciones de NOAA y ENFEN."
        />
        <div className="forecast-grid">
          <article className="forecast-card">
            <span className="horizon">3 meses</span>
            <strong>{data.scotiabank.globalVeryStrongProbability}%</strong>
            <h3>ENSO global muy fuerte en 4T26</h3>
            <p>Probabilidad reportada para el Pacífico central durante el cuarto trimestre de 2026.</p>
          </article>
          <article className="forecast-card featured">
            <span className="horizon">6 meses</span>
            <strong>{strongCoastalProbability}%</strong>
            <h3>Niño Costero fuerte o extraordinario</h3>
            <p>Suma de los escenarios fuerte (38%) y extraordinario (33%) para dic. 2026–mar. 2027.</p>
          </article>
          <article className="forecast-card">
            <span className="horizon">9 meses</span>
            <strong className="word-value">Hasta abr. 2027</strong>
            <h3>Persistencia posible</h3>
            <p>ENFEN contempla continuidad del evento; no es una probabilidad única ni una fecha de término asegurada.</p>
          </article>
        </div>
        <div className="probability-card">
          <div>
            <p className="card-label">Magnitud del Niño Costero · verano 2026–27</p>
            <h3>71% se concentra en escenarios fuerte o extraordinario</h3>
            <p>La intensidad del océano no determina por sí sola el daño: importan la lluvia local, la cuenca, la exposición y la preparación.</p>
          </div>
          <ProbabilityBar values={data.scotiabank.coastalSummerProbabilities} />
        </div>
      </section>

      <section className="territory-section section-pad" id="territorio">
        <SectionHeading
          eyebrow="Impacto territorial histórico"
          title="Perú no responde igual en todas partes"
          detail="El mapa usa crecimiento regional del PBI en 2017 y 2023. Sirve para comparar impactos pasados; no es un pronóstico actual."
        />
        <div className="toggle-row" role="group" aria-label="Seleccionar año del mapa">
          {[2017, 2023].map((year) => (
            <button key={year} className={mapYear === year ? "toggle active" : "toggle"} onClick={() => setMapYear(year as 2017 | 2023)}>PBI {year}</button>
          ))}
        </div>
        <div className="map-layout">
          <div className="map-card">
            <PeruMap map={peruMap} values={departmentValues} selected={selectedDepartment} onSelect={setSelectedDepartment} />
            <div className="map-legend">
              <span><i style={{ background: "#9f2d2d" }} /> ≤ −5%</span>
              <span><i style={{ background: "#df654d" }} /> −5 a −1%</span>
              <span><i style={{ background: "#efb23d" }} /> −1 a +1%</span>
              <span><i style={{ background: "#78aa9e" }} /> +1 a +5%</span>
              <span><i style={{ background: "#177d75" }} /> ≥ +5%</span>
            </div>
          </div>
          <aside className="map-detail">
            <p className="eyebrow">Haz clic en un departamento</p>
            <h3>{showName(selectedDepartment)}</h3>
            <div className="big-stat">{selectedGdp === undefined ? "s/d" : `${signed(selectedGdp)}%`}</div>
            <p className="stat-caption">Variación real del PBI regional en {mapYear}.</p>
            <dl>
              <div><dt>Zona</dt><dd>{territory.zone}</dd></div>
              <div><dt>Frentes a observar</dt><dd>{territory.focus}</dd></div>
              <div><dt>Cuenca de referencia</dt><dd>{territory.river}</dd></div>
            </dl>
            <p className="source-note">Fuente: INEI, procesado en el reporte de Estudios Económicos Scotiabank Perú, jul. 2026.</p>
          </aside>
        </div>
      </section>

      <section className="lima-section section-pad" id="lima-callao">
        <SectionHeading
          eyebrow="Memoria territorial"
          title="Qué ocurrió en Lima y Callao"
          detail="Mapa por distritos con eventos documentados del Niño Costero 2017. Un antecedente no equivale a una predicción del próximo evento."
        />
        <div className="filter-row" role="group" aria-label="Filtrar eventos por cuenca">
          {["Todos", "Rímac / Huaycoloro", "Chillón", "Lurín / sur"].map((filter) => (
            <button key={filter} className={districtFilter === filter ? "filter active" : "filter"} onClick={() => setDistrictFilter(filter)}>{filter}</button>
          ))}
        </div>
        <div className="district-layout">
          <div className="district-map-card">
            <DistrictMap geo={districtGeo} selected={selectedDistrict} filter={districtFilter} onSelect={setSelectedDistrict} />
            <p className="map-instruction"><span /> Distrito con antecedente documentado · selecciona uno para leer el hecho y la fuente.</p>
          </div>
          <aside className="event-detail">
            <span className="event-year">Niño Costero {districtEvent.year}</span>
            <h3>{districtEvent.name}</h3>
            <strong>{districtEvent.event}</strong>
            <p>{districtEvent.impact}</p>
            <dl>
              <div><dt>Cuenca</dt><dd>{districtEvent.basin}</dd></div>
              <div><dt>Uso empresarial</dt><dd>Revisar sedes, rutas, proveedores y personal expuestos a la misma cuenca o quebrada.</dd></div>
            </dl>
            <div className="source-links">
              {districtEvent.sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a>)}
            </div>
          </aside>
        </div>
      </section>

      <section className="impact-section section-pad" id="impactos">
        <SectionHeading
          eyebrow="De la señal a la consecuencia"
          title="Módulos con datos útiles y vigentes"
          detail={`${availableModules.length} módulos visibles. Si una fuente supera su ventana de frescura, el módulo se oculta hasta recuperar datos verificables.`}
        />
        <div className="module-grid">
          {moduleFresh(data.modules.hydrology.freshUntil) && (
            <article className="module-card hydrology-card">
              <div className="module-top"><span>01 · Hidrología</span><span className="fresh-chip">Vigente</span></div>
              <h3>Ríos de Lima</h3>
              <p>{data.modules.hydrology.summary}</p>
              <div className="river-table">
                <div className="river-head"><span>Estación</span>{data.modules.hydrology.months.map((month) => <b key={month}>{month}</b>)}</div>
                {data.modules.hydrology.rivers.map((river) => (
                  <div className="river-row" key={river.name}><span><strong>{river.name}</strong><small>{river.station}</small></span>{river.outlook.map((value, index) => <i key={`${river.name}-${index}`} title={`${data.modules.hydrology.months[index]}: ${value}`}>N</i>)}</div>
                ))}
              </div>
              <p className="module-note">{data.modules.hydrology.note}</p>
              <div className="card-actions"><a href={data.modules.hydrology.alertsUrl} target="_blank" rel="noreferrer">Avisos en vivo ↗</a><a href={data.modules.hydrology.sourceUrl} target="_blank" rel="noreferrer">Pronóstico ↗</a></div>
              <small className="cutoff">Periodo: {data.modules.hydrology.period} · {data.modules.hydrology.source}</small>
            </article>
          )}

          {moduleFresh(data.modules.dengue.freshUntil) && (
            <article className="module-card dengue-card">
              <div className="module-top"><span>02 · Salud pública</span><span className="fresh-chip">SE {data.modules.dengue.epidemiologicalWeek}</span></div>
              <div className="module-title-row"><h3>Dengue</h3><div className="small-toggle"><button className={dengueView === "lima" ? "active" : ""} onClick={() => setDengueView("lima")}>Lima</button><button className={dengueView === "peru" ? "active" : ""} onClick={() => setDengueView("peru")}>Perú</button></div></div>
              {dengueView === "lima" ? (
                <>
                  <div className="module-stats"><div><strong>{formatNumber(data.modules.dengue.lima.cases)}</strong><span>casos acumulados</span></div><div><strong>+{data.modules.dengue.lima.changePct}%</strong><span>vs. mismo corte 2025</span></div><div><strong>{formatNumber(data.modules.dengue.lima.latestWeekCases)}</strong><span>casos en SE29</span></div></div>
                  <MiniBars values={data.modules.dengue.lima.diris as unknown as Record<string, string | number>[]} />
                </>
              ) : (
                <div className="module-stats wide"><div><strong>{formatNumber(data.modules.dengue.peru.cases)}</strong><span>casos Perú 2026</span></div><div><strong>{formatNumber(data.modules.dengue.peru.previousCases)}</strong><span>mismo corte 2025</span></div><div><strong>{data.modules.dengue.peru.deaths}</strong><span>defunciones</span></div></div>
              )}
              <p className="module-note">{data.modules.dengue.note}</p>
              <div className="card-actions"><a href={data.modules.dengue.climateUrl} target="_blank" rel="noreferrer">Cruzar casos, lluvia y temperatura ↗</a><a href={data.modules.dengue.sourceUrl} target="_blank" rel="noreferrer">Sala oficial ↗</a></div>
              <small className="cutoff">Corte: {data.modules.dengue.cutoff} · actualizado {data.modules.dengue.updatedAt}</small>
            </article>
          )}

          {moduleFresh(data.modules.fishing.freshUntil) && (
            <article className="module-card fishing-card">
              <div className="module-top"><span>03 · Pesca</span><span className="fresh-chip">Monitoreo oficial</span></div>
              <h3>Anchoveta</h3>
              <div className="fish-hero"><strong>{formatNumber(data.modules.fishing.northCentral.landingTonnes)}</strong><span>toneladas desembarcadas al {data.modules.fishing.officialCutoff}</span></div>
              <div className="progress-line"><i style={{ width: `${data.modules.fishing.northCentral.quotaPct}%` }} /></div>
              <p><b>{formatNumber(data.modules.fishing.northCentral.quotaPct, 1)}%</b> de la cuota norte–centro. El reporte Scotiabank resume cerca de 500 mil t frente a 2 millones habituales.</p>
              <p className="module-note">{data.modules.fishing.note}</p>
              <div className="card-actions"><a href={data.modules.fishing.liveUrl} target="_blank" rel="noreferrer">Reporte IMARPE ↗</a><a href={data.modules.fishing.sourceUrl} target="_blank" rel="noreferrer">Informe ENFEN ↗</a></div>
              <small className="cutoff">Fuente oficial publicada {data.modules.fishing.publishedAt}</small>
            </article>
          )}

          {moduleFresh(data.modules.agro.freshUntil) && (
            <article className="module-card agro-card">
              <div className="module-top"><span>04 · Agro</span><span className="fresh-chip">Jul 2026</span></div>
              <h3>Producción y clima</h3>
              <div className="module-stats"><div><strong>{signed(data.modules.agro.productionForecast2026)}%</strong><span>producción agraria 2026P</span></div><div><strong>{signed(data.modules.agro.production2025)}%</strong><span>resultado 2025</span></div></div>
              <MiniBars values={data.modules.agro.series.slice(-6).map((item) => ({ name: String(item.year), value: Math.max(item.value, 0.1) }))} color="orange" />
              <div className="tag-row">{data.modules.agro.crops.map((crop) => <span key={crop}>{crop}</span>)}</div>
              <p className="module-note">{data.modules.agro.note}</p>
              <div className="card-actions"><a href={data.modules.agro.sourceUrl} target="_blank" rel="noreferrer">Boletines agroclimáticos ↗</a></div>
              <small className="cutoff">Proyección: {data.modules.agro.source}</small>
            </article>
          )}
        </div>
      </section>

      <section className="history-section section-pad">
        <SectionHeading
          eyebrow="Comparación histórica"
          title="¿Cómo se parece 2026 a otros eventos?"
          detail="Las líneas fantasma comparan el ciclo mensual de Niño 1+2. Coincidencia de temperatura no implica el mismo patrón de lluvia ni el mismo daño."
        />
        <div className="chart-toolbar">
          <span><i className="legend-current" /> 2026 actual</span>
          <button className={compare1998 ? "chart-toggle active" : "chart-toggle"} onClick={() => setCompare1998((value) => !value)}><i className="legend-1998" /> Comparar 1998</button>
          <button className={compare2017 ? "chart-toggle active" : "chart-toggle"} onClick={() => setCompare2017((value) => !value)}><i className="legend-2017" /> Comparar 2017</button>
        </div>
        <EventLineChart data={data} compare1998={compare1998} compare2017={compare2017} />
        <p className="source-note">Anomalía semanal Niño 1+2, promediada por mes. Fuente: NOAA CPC.</p>
      </section>

      <section className="economy-section section-pad" id="economia">
        <SectionHeading
          eyebrow="Análisis económico validado"
          title="Lo que El Niño puede mover en la economía"
          detail="Datos del informe FEN de Estudios Económicos Scotiabank Perú, julio 2026, proporcionado y validado para este tablero."
        />
        <div className="economy-grid">
          <article className="economic-card hero-economic">
            <span>PBI Perú 2026</span>
            <div className="forecast-change"><del>{formatNumber(data.scotiabank.peruGdpForecast.previous, 1)}%</del><b>→</b><strong>{formatNumber(data.scotiabank.peruGdpForecast.revised, 1)}%</strong></div>
            <p>La revisión combina menor aporte de sectores primarios con mayor dinamismo de construcción, servicios y comercio.</p>
          </article>
          <article className="economic-card">
            <span>Pérdidas económicas históricas</span>
            <div className="loss-bars">
              {data.scotiabank.historicalLosses.map((item) => <div key={item.period}><b>{item.period}</b><i><em style={{ width: `${(item.gdpPct / 7) * 100}%` }} /></i><strong>{formatNumber(item.gdpPct, 1)}% del PBI</strong></div>)}
            </div>
            <p>Son episodios y metodologías históricas; no representan una pérdida prevista para 2026–27.</p>
          </article>
          <article className="economic-card sector-card">
            <span>Revisión sectorial 2026 · puntos porcentuales</span>
            <div className="sector-list">
              {data.scotiabank.sectorRevision2026.map((item) => <div key={item.label}><span>{item.label}</span><i className={item.value < 0 ? "negative" : "positive"} style={{ width: `${Math.abs(item.value) * 120}px` }} /><strong>{signed(item.value)} pp</strong></div>)}
            </div>
          </article>
        </div>
        <div className="regional-grid">
          {Object.values(data.scotiabank.regional).map((item) => (
            <article key={item.title}><span>Perspectiva regional</span><h3>{item.title}</h3><p>{item.detail}</p><strong>{item.evidence}</strong></article>
          ))}
        </div>
      </section>

      <section className="business-section section-pad">
        <SectionHeading
          eyebrow="Uso para empresas"
          title="Indicador Quipu de continuidad"
          detail="Tres preguntas simples para empresas industriales de Lima. No reemplaza una evaluación de riesgo de cada sede."
        />
        <div className="continuity-grid">
          <article><span className="continuity-state review">Revisar</span><h3>Agua y operación</h3><p>Los ríos de Lima tienen escenario mensual normal hasta noviembre, pero la ventana lluviosa de verano requiere revisar drenaje, bombeo y almacenamiento.</p><strong>Acción: verificar plan de agua y anegamiento.</strong></article>
          <article><span className="continuity-state prepare">Preparar</span><h3>Logística y proveedores</h3><p>Los eventos pasados interrumpieron vías, puentes y acceso a zonas industriales. El mapa muestra qué cuencas y distritos tuvieron antecedentes.</p><strong>Acción: identificar rutas y proveedor alterno.</strong></article>
          <article><span className="continuity-state review">Revisar</span><h3>Personas y salud</h3><p>Lima acumula {formatNumber(data.modules.dengue.lima.cases)} casos de dengue al corte, {data.modules.dengue.lima.changePct}% más que en el mismo periodo de 2025.</p><strong>Acción: reforzar control vectorial y comunicación.</strong></article>
        </div>
      </section>

      <section className="sources-section section-pad" id="fuentes">
        <SectionHeading
          eyebrow="Transparencia"
          title="Frescura, metodología y descargas"
          detail="La página se revisa cada día; cada institución conserva su propia frecuencia. Una fecha de corte antigua se marca o se retira del resumen."
        />
        <div className="sources-layout">
          <div className="freshness-list">
            {data.freshness.map((source) => (
              <a key={source.name} href={source.url} target={source.url.startsWith("#") ? undefined : "_blank"} rel="noreferrer">
                <span className={`fresh-dot ${source.state}`} />
                <div><strong>{source.name}</strong><small>{source.cadence} · {source.date}</small></div>
                <b>{sourceStateLabel(source.state)} ↗</b>
              </a>
            ))}
          </div>
          <aside className="method-card">
            <h3>Cómo construimos la lectura</h3>
            <ol>
              <li>Descargamos indicadores y comunicados desde sus fuentes.</li>
              <li>Conservamos la fecha de corte de cada dato, no solo la hora de la página.</li>
              <li>Separamos señal oceánica, pronóstico, impacto observado y antecedente histórico.</li>
              <li>No convertimos correlaciones en causas ni inventamos probabilidades territoriales.</li>
            </ol>
            <div className="download-row"><button onClick={downloadCsv}>Descargar CSV</button><button onClick={downloadJson}>Descargar JSON</button></div>
            <p>Última revisión automática: {limaDate(data.generatedAt)}.</p>
          </aside>
        </div>
      </section>

      <section className="instagram-band">
        <div><span>Quipu Insights</span><h2>¿Una duda o una idea para el tablero?</h2><p>Escríbenos por Instagram. Ahí recibimos consultas, correcciones y propuestas de nuevas lecturas.</p></div>
        <a href="https://www.instagram.com/quipuinsights/" target="_blank" rel="noreferrer">Encontrarnos en @quipuinsights ↗</a>
      </section>

      <footer>
        <div><span className="brand footer-brand"><span className="brand-mark">Q</span><span><b>Quipu</b> insights</span></span><p>Sostenibilidad El Niño Perú</p></div>
        <p>Actualización automática cada 24 horas a las 17:00 h · Perú (UTC−5)</p>
        <div><a href="https://www.instagram.com/quipuinsights/" target="_blank" rel="noreferrer">Instagram @quipuinsights ↗</a><small>Bases de datos oficiales y fuentes validadas. Metodología y fecha visibles en cada módulo.</small></div>
      </footer>
    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";

type LayerKey = "ocean" | "rain" | "rivers";
type ForecastHorizon = 3 | 6 | 9;

type Indicator = {
  value: number | null;
  date: string;
};

type HistoryPoint = {
  year: number;
  nino12: number | null;
  nino34: number | null;
};

type EventPoint = {
  month: number;
  value: number | null;
};

type EnfenRelease = {
  title: string;
  state: string;
  date: string;
  url: string;
};

type LiveData = {
  generatedAt: string;
  nextRefreshAt: string;
  mode: "live" | "partial" | "fallback";
  indicators: {
    nino12: Indicator;
    nino34: Indicator;
    oni: Indicator;
    icen: Indicator;
  };
  history: HistoryPoint[];
  eventProfiles: {
    currentYear: number;
    current: EventPoint[];
    nino1998: EventPoint[];
    nino2017: EventPoint[];
  };
  enfen: EnfenRelease;
};

type MapDepartment = {
  code: string;
  name: string;
  path: string;
};

type MapData = {
  source: string;
  sourceUrl: string;
  viewBox: string;
  departments: MapDepartment[];
};

const FALLBACK_DATA: LiveData = {
  generatedAt: "2026-07-29T17:00:00-05:00",
  nextRefreshAt: "2026-07-30T17:00:00-05:00",
  mode: "fallback",
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
  eventProfiles: {
    currentYear: 2026,
    current: [],
    nino1998: [],
    nino2017: [],
  },
  enfen: {
    title: "Comunicado Oficial ENFEN N.° 13-2026",
    state: "Alerta de El Niño Costero",
    date: "17 jul 2026",
    url: "https://enfen.imarpe.gob.pe/2026/07/17/comunicado-oficial-enfen-n-13-2026-estado-de-sistema-de-alerta-alerta-de-el-nino-costero/",
  },
};

const displayNames: Record<string, string> = {
  Ancash: "Áncash",
  Apurimac: "Apurímac",
  Huanuco: "Huánuco",
  Junin: "Junín",
  "Madre De Dios": "Madre de Dios",
  "San Martin": "San Martín",
};

const departmentGroups = {
  northCoast: ["Tumbes", "Piura", "Lambayeque", "La Libertad"],
  centralCoast: ["Ancash", "Lima", "Callao", "Ica"],
  southCoast: ["Arequipa", "Moquegua", "Tacna"],
  andes: [
    "Cajamarca",
    "Huanuco",
    "Pasco",
    "Junin",
    "Huancavelica",
    "Ayacucho",
    "Apurimac",
    "Cusco",
    "Puno",
  ],
  amazon: ["Amazonas", "Loreto", "San Martin", "Ucayali", "Madre De Dios"],
} as const;

const riverByDepartment: Record<string, string> = {
  Tumbes: "Río Tumbes",
  Piura: "Río Piura y sistema Chira",
  Lambayeque: "Ríos La Leche y Chancay",
  "La Libertad": "Ríos Chicama y Moche",
  Ancash: "Ríos Santa y Casma",
  Lima: "Ríos Rímac, Chillón y Lurín",
  Callao: "Cuenca baja del Rímac",
  Ica: "Río Ica",
  Arequipa: "Ríos Chili y Ocoña",
  Moquegua: "Río Moquegua",
  Tacna: "Ríos Caplina y Sama",
  Cajamarca: "Marañón y afluentes",
  Huanuco: "Ríos Huallaga e Higueras",
  Pasco: "Cabeceras del Huallaga",
  Junin: "Ríos Mantaro y Perené",
  Huancavelica: "Cuenca alta del Mantaro",
  Ayacucho: "Ríos Pampas y Apurímac",
  Apurimac: "Río Apurímac",
  Cusco: "Ríos Vilcanota y Apurímac",
  Puno: "Ríos Ramis y Huancané",
  Amazonas: "Ríos Marañón y Utcubamba",
  Loreto: "Amazonas, Marañón y Ucayali",
  "San Martin": "Río Huallaga",
  Ucayali: "Río Ucayali",
  "Madre De Dios": "Río Madre de Dios",
};

const sources = [
  {
    name: "ENFEN",
    detail: "Estado oficial del Niño Costero, ICEN y comunicados.",
    cadence: "Según comunicado",
    status: "current",
    href: "https://enfen.imarpe.gob.pe/",
  },
  {
    name: "NOAA CPC",
    detail: "Niño 1+2, Niño 3.4, ONI y diagnóstico ENSO.",
    cadence: "Semanal / mensual",
    status: "current",
    href: "https://www.cpc.ncep.noaa.gov/data/indices/",
  },
  {
    name: "SENAMHI PHISIS",
    detail: "Avisos hidrológicos, niveles y caudales observados.",
    cadence: "Según aviso",
    status: "current",
    href: "https://www.senamhi.gob.pe/?p=avisos-detalle-hidrologicos",
  },
  {
    name: "ANA / SNIRH",
    detail: "Información oficial de ríos, reservorios y recursos hídricos.",
    cadence: "Variable",
    status: "validation",
    href: "https://www.gob.pe/86460-acceder-al-sistema-nacional-de-informacion-de-recursos-hidricos",
  },
  {
    name: "CDC MINSA",
    detail: "Vigilancia histórica del dengue por semana y territorio.",
    cadence: "Semanal / mensual",
    status: "historical",
    href: "https://www.datosabiertos.gob.pe/dataset/vigilancia-epidemiol%C3%B3gica-de-dengue",
  },
  {
    name: "IMARPE",
    detail: "Evaluación de anchoveta y condiciones del mar peruano.",
    cadence: "Según crucero",
    status: "historical",
    href: "https://repositorio.imarpe.gob.pe/",
  },
  {
    name: "CHIRPS v3",
    detail: "Precipitación diaria y anomalías de lluvia desde 1981.",
    cadence: "Diaria",
    status: "validation",
    href: "https://developers.google.com/earth-engine/datasets/catalog/UCSB-CHC_CHIRPS_V3_DAILY_SAT",
  },
  {
    name: "INEI",
    detail: "Límites departamentales usados en el mapa interactivo.",
    cadence: "Según actualización cartográfica",
    status: "current",
    href: "https://ide.inei.gob.pe/",
  },
] as const;

const timeline = [
  {
    date: "17 jul 2026",
    number: "13",
    state: "Alerta de El Niño Costero",
    href: "https://enfen.imarpe.gob.pe/2026/07/17/comunicado-oficial-enfen-n-13-2026-estado-de-sistema-de-alerta-alerta-de-el-nino-costero/",
  },
  {
    date: "26 jun 2026",
    number: "12",
    state: "Persistencia de condiciones cálidas",
    href: "https://enfen.imarpe.gob.pe/2026/06/26/comunicado-oficial-enfen-n-12-2026-estado-del-sistema-de-alerta-alerta-de-el-nino-costero/",
  },
  {
    date: "29 may 2026",
    number: "10",
    state: "Actualización del sistema de alerta",
    href: "https://enfen.imarpe.gob.pe/2026/05/29/comunicado-oficial-enfen-n-10-2026-estado-del-sistema-de-alerta-alerta-de-el-nino-costero/",
  },
] as const;

function displayDepartment(name: string) {
  return displayNames[name] ?? name;
}

function belongsTo(
  group: keyof typeof departmentGroups,
  department: string,
) {
  return (departmentGroups[group] as readonly string[]).includes(department);
}

function isCoastalDepartment(department: string) {
  return (
    belongsTo("northCoast", department) ||
    belongsTo("centralCoast", department) ||
    belongsTo("southCoast", department)
  );
}

function territoryCopy(department: string) {
  if (belongsTo("northCoast", department)) {
    return {
      zone: "Costa norte",
      rain: "La lluvia debe verificarse con avisos y acumulados recientes del SENAMHI.",
      temperature: "Niño 1+2 describe el mar costero, no la temperatura del aire.",
      dengue:
        "Clima favorable no equivale a brote; revisar casos por semana epidemiológica.",
      agro: "Mayor atención a anegamiento, plagas y temperatura mínima.",
    };
  }
  if (belongsTo("centralCoast", department)) {
    return {
      zone: "Costa central",
      rain: "La lluvia varía entre cuencas y requiere una lectura local.",
      temperature: "El contexto costero debe contrastarse con la estación más cercana.",
      dengue: "Cruce climático en preparación con datos territoriales del MINSA.",
      agro: "Vigilar disponibilidad hídrica y cultivos sensibles al calor.",
    };
  }
  if (belongsTo("southCoast", department)) {
    return {
      zone: "Costa sur",
      rain: "No se asigna un nivel departamental sin un dato oficial consolidado.",
      temperature: "Seguimiento costero y local por SENAMHI.",
      dengue: "No se infiere riesgo epidemiológico solo desde el océano.",
      agro: "Priorizar déficit hídrico y temperatura mínima.",
    };
  }
  if (belongsTo("andes", department)) {
    return {
      zone: "Andes",
      rain: "La señal cambia con altitud y vertiente; requiere lectura local.",
      temperature: "No se generaliza desde Niño 1+2 a cada provincia.",
      dengue: "El riesgo varía por altitud, estación y presencia del vector.",
      agro: "Vigilar déficit hídrico, heladas y calendario de cultivo.",
    };
  }
  return {
    zone: "Amazonía",
    rain: "Comportamiento heterogéneo; consultar cuencas y avisos vigentes.",
    temperature: "Seguimiento local con estaciones y satélite.",
    dengue: "La transmisión tiene dinámica propia y no depende solo del ENSO.",
    agro: "Vigilar exceso de humedad, plagas y accesibilidad.",
  };
}

function anomalyExplanation(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "NOAA no ofrece un valor reciente disponible para esta lectura.";
  }
  const magnitude = Math.abs(value).toFixed(1).replace(".", ",");
  if (value > 0) {
    return `La superficie del mar en Niño 1+2 está ${magnitude} °C más cálida que su promedio de referencia.`;
  }
  if (value < 0) {
    return `La superficie del mar en Niño 1+2 está ${magnitude} °C más fría que su promedio de referencia.`;
  }
  return "La superficie del mar en Niño 1+2 está cerca de su promedio de referencia.";
}

function signed(value: number | null, decimals = 1) {
  if (value === null || Number.isNaN(value)) return "Sin dato";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals).replace(".", ",")} °C`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(date);
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function HistoryChart({
  data,
  startYear,
}: {
  data: HistoryPoint[];
  startYear: 1950 | 1981;
}) {
  const width = 880;
  const height = 310;
  const margin = { top: 20, right: 28, bottom: 42, left: 48 };
  const filtered = data.filter((item) => item.year >= startYear);
  const years = filtered.map((item) => item.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const x = (year: number) =>
    margin.left +
    ((year - minYear) / Math.max(1, maxYear - minYear)) *
      (width - margin.left - margin.right);
  const y = (value: number) =>
    margin.top +
    ((2.5 - value) / 5) * (height - margin.top - margin.bottom);

  const pathFor = (key: "nino12" | "nino34") => {
    let drawing = false;
    return filtered
      .map((item) => {
        const value = item[key];
        if (value === null) {
          drawing = false;
          return "";
        }
        const command = drawing ? "L" : "M";
        drawing = true;
        return `${command}${x(item.year).toFixed(1)},${y(value).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");
  };

  const tickYears = filtered.filter(
    (item, index) =>
      index === 0 ||
      index === filtered.length - 1 ||
      item.year % (startYear === 1950 ? 10 : 5) === 0,
  );

  return (
    <svg
      className="history-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby="history-title history-description"
    >
      <title id="history-title">Evolución de anomalías del Pacífico</title>
      <desc id="history-description">
        Promedios anuales de Niño 1+2 y Niño 3.4; antes de 1981 se muestra ONI
        como referencia central.
      </desc>
      <rect
        x={margin.left}
        y={y(0.5)}
        width={width - margin.left - margin.right}
        height={y(-0.5) - y(0.5)}
        className="neutral-band"
      />
      {[-2, -1, 0, 1, 2].map((tick) => (
        <g key={tick}>
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={y(tick)}
            y2={y(tick)}
            className="chart-grid"
          />
          <text x={margin.left - 10} y={y(tick) + 4} className="axis-label">
            {tick > 0 ? `+${tick}` : tick}
          </text>
        </g>
      ))}
      {tickYears.map((item) => (
        <text
          key={item.year}
          x={x(item.year)}
          y={height - 14}
          className="axis-year"
        >
          {item.year}
        </text>
      ))}
      <path d={pathFor("nino34")} className="history-line central-line" />
      <path d={pathFor("nino12")} className="history-line coast-line" />
    </svg>
  );
}

function EventComparisonChart({
  profiles,
}: {
  profiles: LiveData["eventProfiles"];
}) {
  const [show1998, setShow1998] = useState(true);
  const [show2017, setShow2017] = useState(false);
  const width = 880;
  const height = 280;
  const margin = { top: 26, right: 28, bottom: 42, left: 48 };
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const x = (month: number) =>
    margin.left +
    ((month - 1) / 11) * (width - margin.left - margin.right);
  const y = (value: number) =>
    margin.top +
    ((4 - value) / 7) * (height - margin.top - margin.bottom);

  function pathFor(points: EventPoint[]) {
    let drawing = false;
    return points
      .map((point) => {
        if (point.value === null) {
          drawing = false;
          return "";
        }
        const command = drawing ? "L" : "M";
        drawing = true;
        return `${command}${x(point.month).toFixed(1)},${y(point.value).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  const hasProfiles = [
    ...profiles.current,
    ...profiles.nino1998,
    ...profiles.nino2017,
  ].some((point) => point.value !== null);

  return (
    <figure className="panel event-panel">
      <div className="panel-title-row">
        <div>
          <p className="panel-kicker">Comparador de episodios</p>
          <h3>Actual vs. 1998 y 2017</h3>
        </div>
        <div className="event-toggles">
          <button
            type="button"
            className={show1998 ? "active" : ""}
            aria-pressed={show1998}
            onClick={() => setShow1998((value) => !value)}
          >
            Comparar con 1998
          </button>
          <button
            type="button"
            className={show2017 ? "active" : ""}
            aria-pressed={show2017}
            onClick={() => setShow2017((value) => !value)}
          >
            Comparar con 2017
          </button>
        </div>
      </div>
      {hasProfiles ? (
        <svg
          className="event-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Comparación mensual de Niño 1+2"
        >
          {[-2, 0, 2, 4].map((tick) => (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y(tick)}
                y2={y(tick)}
                className="chart-grid"
              />
              <text
                x={margin.left - 10}
                y={y(tick) + 4}
                className="axis-label"
              >
                {tick > 0 ? `+${tick}` : tick}
              </text>
            </g>
          ))}
          {months.map((month, index) => (
            <text
              key={month}
              x={x(index + 1)}
              y={height - 13}
              className="axis-year"
            >
              {month}
            </text>
          ))}
          {show1998 && (
            <path
              d={pathFor(profiles.nino1998)}
              className="event-line event-1998"
            />
          )}
          {show2017 && (
            <path
              d={pathFor(profiles.nino2017)}
              className="event-line event-2017"
            />
          )}
          <path
            d={pathFor(profiles.current)}
            className="event-line event-current"
          />
        </svg>
      ) : (
        <div className="chart-empty">
          La comparación se completará en la próxima actualización diaria.
        </div>
      )}
      <div className="event-legend">
        <span><i className="current-swatch" />{profiles.currentYear}</span>
        <span><i className="ghost-1998" />1998</span>
        <span><i className="ghost-2017" />2017</span>
      </div>
      <figcaption>
        Promedios mensuales de Niño 1+2 calculados desde la serie semanal NOAA.
        Las líneas históricas son referencias, no pronósticos de impacto.
      </figcaption>
    </figure>
  );
}

function PeruRiskMap({
  department,
  nino12,
  onDepartmentChange,
}: {
  department: string;
  nino12: Indicator;
  onDepartmentChange: (department: string) => void;
}) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerKey>("ocean");

  useEffect(() => {
    const controller = new AbortController();
    fetch("./data/peru-departments.json", {
      signal: controller.signal,
      cache: "force-cache",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Mapa no disponible");
        return response.json() as Promise<MapData>;
      })
      .then(setMapData)
      .catch(() => setMapData(null));
    return () => controller.abort();
  }, []);

  const selectedCopy = territoryCopy(department);
  const coastalContext = isCoastalDepartment(department);

  const layerContent: Record<
    LayerKey,
    { label: string; title: string; explanation: string; status: string }
  > = {
    ocean: {
      label: "Mar costero",
      title: "Contexto oceánico",
      explanation:
        "Niño 1+2 describe el mar frente a Perú y Ecuador. No asigna por sí solo un riesgo a cada departamento.",
      status: coastalContext ? "Contexto costero" : "Requiere lectura local",
    },
    rain: {
      label: "Lluvia",
      title: "Lluvia departamental",
      explanation:
        "La página no colorea riesgo de lluvia mientras no exista un valor oficial consolidado para el departamento.",
      status: "Sin nivel consolidado",
    },
    rivers: {
      label: "Ríos y avisos",
      title: "Cuencas y avisos",
      explanation:
        "Se muestran las cuencas que conviene consultar. El nivel de alerta debe confirmarse directamente en SENAMHI.",
      status: "Consultar aviso vigente",
    },
  };
  const activeCopy = layerContent[activeLayer];

  return (
    <section className="risk-map-section" id="mapa">
      <div className="section-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Situación por departamento</p>
            <h2>Mapa interactivo del Perú</h2>
          </div>
          <p className="section-intro">
            Selecciona un departamento. Después elige qué información quieres
            consultar en el panel lateral.
          </p>
        </div>

        <div className="map-instruction">
          <strong>Cómo usarlo:</strong>
          <span>
            1. Elige una capa. 2. Haz clic en un departamento. 3. Revisa la
            explicación, fecha y fuente.
          </span>
        </div>

        <div className="map-toolbar" aria-label="Capas del mapa">
          {(["ocean", "rain", "rivers"] as LayerKey[]).map((layer) => (
            <button
              type="button"
              key={layer}
              aria-pressed={activeLayer === layer}
              className={activeLayer === layer ? "active" : ""}
              onClick={() => setActiveLayer(layer)}
            >
              <i className={`layer-icon layer-${layer}`} />
              {layerContent[layer].label}
            </button>
          ))}
          <span className="data-availability-badge">
            Sin colores de riesgo inventados
          </span>
        </div>

        <div className="map-layout">
          <div className="map-card">
            {mapData ? (
              <svg
                className="peru-map"
                viewBox={mapData.viewBox}
                role="group"
                aria-label="Mapa interactivo de departamentos del Perú"
              >
                {mapData.departments.map((item) => {
                  const selected = item.name === department;
                  const oceanContext =
                    activeLayer === "ocean" &&
                    isCoastalDepartment(item.name);
                  return (
                    <path
                      key={item.code}
                      d={item.path}
                      className={`map-region ${
                        oceanContext ? "ocean-context" : "data-neutral"
                      } ${selected ? "selected" : ""}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${displayDepartment(item.name)}${
                        selected ? ", seleccionado" : ""
                      }`}
                      onClick={() => onDepartmentChange(item.name)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onDepartmentChange(item.name);
                        }
                      }}
                    >
                      <title>
                        {displayDepartment(item.name)} · haz clic para consultar
                      </title>
                    </path>
                  );
                })}
              </svg>
            ) : (
              <div className="map-loading">Preparando mapa oficial del INEI…</div>
            )}
            <div className="map-legend" aria-label="Qué significan los colores">
              {activeLayer === "ocean" && (
                <span>
                  <i className="legend-ocean-map" />
                  Costa: contexto directo de Niño 1+2
                </span>
              )}
              <span>
                <i className="legend-neutral-map" />
                Sin nivel oficial consolidado
              </span>
              <span>
                <i className="legend-selected-map" />
                Departamento seleccionado
              </span>
            </div>
            <a
              className="map-source"
              href="https://ide.inei.gob.pe/"
              target="_blank"
              rel="noreferrer"
            >
              Geometría oficial INEI ↗
            </a>
          </div>

          <aside className="territory-panel" aria-live="polite">
            <div className="territory-head">
              <div>
                <span>{selectedCopy.zone}</span>
                <h3>{displayDepartment(department)}</h3>
              </div>
              <strong
                className={`territory-status ${
                  activeLayer === "ocean" && coastalContext
                    ? "context-available"
                    : "context-pending"
                }`}
              >
                {activeCopy.status}
              </strong>
            </div>
            <p className="territory-intro">
              {activeCopy.explanation}
            </p>
            <div className="territory-grid">
              <article>
                <span>{activeCopy.title}</span>
                <p>
                  {activeLayer === "ocean"
                    ? coastalContext
                      ? anomalyExplanation(nino12.value)
                      : "Niño 1+2 no debe trasladarse directamente a este departamento."
                    : activeLayer === "rain"
                      ? selectedCopy.rain
                      : riverByDepartment[department] ?? "Cuencas regionales"}
                </p>
              </article>
              <article>
                <span>Dato actual</span>
                <p>
                  {activeLayer === "ocean"
                    ? `${signed(nino12.value)} · NOAA · ${nino12.date}`
                    : "Aún no integrado en el tablero. Usa el enlace oficial de abajo."}
                </p>
              </article>
              <article>
                <span>Qué conviene verificar</span>
                <p>
                  {activeLayer === "rivers"
                    ? "Caudal actual, normal mensual y aviso vigente."
                    : activeLayer === "rain"
                      ? "Acumulado reciente, anomalía y pronóstico local."
                      : selectedCopy.temperature}
                </p>
              </article>
              <article>
                <span>Impactos relacionados</span>
                <p>{selectedCopy.dengue} {selectedCopy.agro}</p>
              </article>
            </div>
            <div className="territory-actions">
              <a
                href="https://www.senamhi.gob.pe/?p=avisos-detalle-hidrologicos"
                target="_blank"
                rel="noreferrer"
              >
                Abrir avisos SENAMHI ↗
              </a>
              <a
                href="https://www.senamhi.gob.pe/?p=pronostico-climatico"
                target="_blank"
                rel="noreferrer"
              >
                Abrir pronóstico local ↗
              </a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [live, setLive] = useState<LiveData>(FALLBACK_DATA);
  const [historyStart, setHistoryStart] = useState<1950 | 1981>(1981);
  const [department, setDepartment] = useState("Piura");
  const [showSituationHelp, setShowSituationHelp] = useState(false);
  const [showOceanHelp, setShowOceanHelp] = useState(false);
  const [forecastHorizon, setForecastHorizon] =
    useState<ForecastHorizon>(3);

  useEffect(() => {
    const controller = new AbortController();
    fetch("./data/live.json", { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Fuente temporalmente no disponible");
        return response.json() as Promise<Partial<LiveData>>;
      })
      .then((payload) =>
        setLive({
          ...FALLBACK_DATA,
          ...payload,
          indicators: {
            ...FALLBACK_DATA.indicators,
            ...(payload.indicators ?? {}),
          },
          eventProfiles:
            payload.eventProfiles ?? FALLBACK_DATA.eventProfiles,
          enfen: {
            ...FALLBACK_DATA.enfen,
            ...(payload.enfen ?? {}),
          },
        }),
      )
      .catch(() => setLive(FALLBACK_DATA));
    return () => controller.abort();
  }, []);

  const selectedTerritory = useMemo(
    () => territoryCopy(department),
    [department],
  );

  const downloadable = useMemo(
    () => ({
      brand: "Quipu Insights",
      dashboard: "Sostenibilidad El Niño Perú",
      generated_at: live.generatedAt,
      update_policy: "Revisión automática cada 24 horas a las 17:00 de Perú",
      data_mode: live.mode,
      indicators: live.indicators,
      history: live.history,
      event_profiles: live.eventProfiles,
      enfen: live.enfen,
      selected_department: {
        department: displayDepartment(department),
        ...selectedTerritory,
      },
      note:
        "Las capas territoriales demostrativas no sustituyen alertas oficiales.",
      sources,
    }),
    [department, live, selectedTerritory],
  );

  function downloadJson() {
    downloadFile(
      "quipu-insights-el-nino-peru.json",
      JSON.stringify(downloadable, null, 2),
      "application/json;charset=utf-8",
    );
  }

  function downloadCsv() {
    const rows = [
      "indicador,valor_c,fecha,fuente",
      `Nino 1+2,${live.indicators.nino12.value ?? ""},${live.indicators.nino12.date},NOAA CPC`,
      `Nino 3.4,${live.indicators.nino34.value ?? ""},${live.indicators.nino34.date},NOAA CPC`,
      `ONI,${live.indicators.oni.value ?? ""},${live.indicators.oni.date},NOAA CPC`,
      `ICEN,${live.indicators.icen.value ?? ""},${live.indicators.icen.date},ENFEN`,
    ];
    downloadFile(
      "quipu-insights-indicadores.csv",
      rows.join("\n"),
      "text/csv;charset=utf-8",
    );
  }

  const normalizedEnfenState = live.enfen.state.toLocaleLowerCase("es");
  const enfenLevel = normalizedEnfenState.includes("alerta")
    ? "alert"
    : normalizedEnfenState.includes("vigilancia")
      ? "watch"
      : "normal";

  const forecastOptions: Record<
    ForecastHorizon,
    {
      label: string;
      value: string;
      subject: string;
      period: string;
      meaning: string;
      limit: string;
      source: string;
      href: string;
      percent: number | null;
    }
  > = {
    3: {
      label: "3 meses",
      value: "97%",
      subject: "Persistencia del evento oceánico",
      period: "Horizonte aproximado de tres meses desde la publicación",
      meaning:
        "La fuente considera muy probable que las condiciones de El Niño continúen.",
      limit:
        "No significa 97% de probabilidad de inundación ni 97% del Perú afectado.",
      source: "NOAA CPC",
      href: "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc_Sp.shtml",
      percent: 97,
    },
    6: {
      label: "6 meses",
      value: "81%",
      subject: "Intensidad oceánica muy fuerte",
      period: "Periodo OND 2026: octubre, noviembre y diciembre",
      meaning:
        "El porcentaje publicado se refiere a una categoría de intensidad oceánica.",
      limit:
        "No es una estimación del territorio, la población o los cultivos que serían afectados.",
      source: "NOAA CPC",
      href: "https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/strengths/",
      percent: 81,
    },
    9: {
      label: "9 meses",
      value: "Cualitativo",
      subject: "Escenario comunicado por ENFEN",
      period: "Referencia hasta abril de 2027",
      meaning:
        "ENFEN comunica un escenario probable, pero no publica un porcentaje único comparable.",
      limit:
        "No debe compararse numéricamente con 97% o 81% porque responde a otra pregunta.",
      source: "ENFEN",
      href: live.enfen.url,
      percent: null,
    },
  };
  const selectedForecast = forecastOptions[forecastHorizon];

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Quipu Insights, inicio">
          <span className="brand-mark" aria-hidden="true">Q</span>
          <span>
            <strong>Quipu</strong>
            <small>insights</small>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#resumen">Resumen</a>
          <a href="#mapa">Mapa</a>
          <a href="#impactos">Impactos</a>
          <a href="#pronosticos">Pronósticos</a>
          <a href="#fuentes">Fuentes</a>
        </nav>
        <div className="header-freshness">
          <span className={`status-dot ${live.mode === "live" ? "green" : "amber"}`} />
          Datos revisados
        </div>
      </header>

      <aside className="top-notice" aria-label="Información del dashboard">
        <span>
          Sostenibilidad y datos abiertos · actualización{" "}
          <strong>cada 24 horas · 5:00 p. m.</strong>
        </span>
        <a href="#mapa">Lectura territorial de Perú</a>
        <a
          className="top-instagram"
          href="https://www.instagram.com/quipuinsights/"
          target="_blank"
          rel="noreferrer"
        >
          Encuéntranos en Instagram <strong>@quipuinsights</strong>
          <span aria-hidden="true">↗</span>
        </a>
      </aside>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">
            Quipu Insights · Sostenibilidad climática
          </p>
          <h1>
            Entender El Niño
            <span>para actuar mejor</span>
          </h1>
          <p className="hero-lede">
            Una lectura única para comprender el estado oficial, el calentamiento
            del mar y los impactos que deben confirmarse con datos del Perú.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#mapa">Explorar el mapa</a>
            <a className="button secondary" href="#pronosticos">
              Entender el pronóstico
            </a>
          </div>
        </div>

        <aside className="hero-risk-board" aria-label="Indicador de situación actual">
          <div className="risk-board-title">
            <span>Indicador de situación actual</span>
            <time>{live.enfen.date}</time>
          </div>
          <div className={`attention-state attention-${enfenLevel}`}>
            <span>Estado oficial ENFEN</span>
            <strong>{live.enfen.state}</strong>
          </div>
          <div className="attention-scale" aria-label="Escala de atención">
            {[
              ["normal", "Sin alerta"],
              ["watch", "Vigilancia"],
              ["alert", "Alerta oficial"],
            ].map(([level, label]) => (
              <span
                key={level}
                className={enfenLevel === level ? "active" : ""}
              >
                <i className={`attention-${level}`} />
                {label}
              </span>
            ))}
          </div>
          <div className="situation-signals">
            <article>
              <span>Mar costero Niño 1+2</span>
              <strong>{signed(live.indicators.nino12.value)}</strong>
              <small>{anomalyExplanation(live.indicators.nino12.value)}</small>
            </article>
            <article>
              <span>Impactos territoriales</span>
              <strong>Sin nivel consolidado</strong>
              <small>
                No se asigna riesgo sin lluvia, ríos o afectaciones observadas.
              </small>
            </article>
          </div>
          <button
            type="button"
            className="explain-control"
            aria-expanded={showSituationHelp}
            onClick={() => setShowSituationHelp((value) => !value)}
          >
            {showSituationHelp
              ? "Ocultar explicación"
              : "¿Qué significa este indicador?"}
          </button>
          {showSituationHelp && (
            <div className="indicator-explanation">
              <strong>Alerta no significa impacto en todo el Perú.</strong>
              <p>
                ENFEN describe la situación climática costera. Los desbordes,
                casos de dengue o daños productivos requieren evidencia
                territorial adicional.
              </p>
            </div>
          )}
          <a href={live.enfen.url} target="_blank" rel="noreferrer">
            Abrir comunicado vigente ↗
          </a>
        </aside>
      </section>

      <section className="summary section-shell" id="resumen">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lo esencial de hoy</p>
            <h2>Entiéndelo en menos de un minuto</h2>
          </div>
          <p className="section-intro">
            Última revisión: {formatDateTime(live.generatedAt)}. Cada tarjeta
            responde una pregunta diferente.
          </p>
        </div>
        <div className="summary-grid">
          <article className="summary-card primary-summary">
            <span>¿Cuál es el estado oficial?</span>
            <strong>{live.enfen.state}</strong>
            <p>Es la denominación publicada por ENFEN.</p>
            <small>Fuente: ENFEN · {live.enfen.date}</small>
          </article>
          <article className="summary-card">
            <span>¿Qué pasa con el mar?</span>
            <strong>{signed(live.indicators.nino12.value)}</strong>
            <p>{anomalyExplanation(live.indicators.nino12.value)}</p>
            <button
              type="button"
              className="card-explain-button"
              aria-expanded={showOceanHelp}
              onClick={() => setShowOceanHelp((value) => !value)}
            >
              {showOceanHelp ? "Cerrar explicación" : "Entender este valor"}
            </button>
            {showOceanHelp && (
              <small className="inline-explanation">
                No es temperatura del aire ni promedio de todo el Perú. Es una
                anomalía de la superficie del mar en la región Niño 1+2.
              </small>
            )}
          </article>
          <article className="summary-card">
            <span>¿Hay impactos confirmados?</span>
            <strong>Sin indicador único</strong>
            <p>
              Se revisan lluvia, ríos, salud, pesca y agro por separado.
            </p>
            <small>No se inventa un riesgo territorial.</small>
          </article>
          <article className="summary-card">
            <span>¿Qué conviene vigilar?</span>
            <strong>Ríos y lluvia</strong>
            <p>
              Consulta avisos locales y selecciona tu departamento en el mapa.
            </p>
            <a href="#mapa">Ir al mapa interactivo ↓</a>
          </article>
        </div>
      </section>

      <section className="technical-snapshot section-shell" id="indicadores">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Indicadores oceanográficos</p>
            <h2>Perú y el Pacífico central</h2>
          </div>
          <p className="section-intro">
            Son anomalías de temperatura del mar. Un valor positivo significa
            más calor que el promedio de referencia.
          </p>
        </div>
        <div className="metric-grid">
          {[
            [
              "Niño 1+2",
              live.indicators.nino12,
              "Mar cercano a Perú y Ecuador.",
            ],
            ["ICEN", live.indicators.icen, "Índice costero calculado por ENFEN."],
            [
              "Niño 3.4",
              live.indicators.nino34,
              "Pacífico ecuatorial central.",
            ],
            ["ONI", live.indicators.oni, "Promedio móvil de tres meses."],
          ].map(([name, rawIndicator, detail]) => {
            const indicator = rawIndicator as Indicator;
            return (
              <article className="metric-card" key={String(name)}>
                <div className="metric-label">{String(name)}</div>
                <strong>{signed(indicator.value)}</strong>
                <p>{String(detail)}</p>
                <span className="metric-date">{indicator.date}</span>
              </article>
            );
          })}
        </div>
        <p className="chart-explainer compact-explainer">
          Estos índices describen el océano; no indican por sí solos cuántas
          personas, provincias o cultivos serán afectados.
        </p>
      </section>

      <PeruRiskMap
        department={department}
        nino12={live.indicators.nino12}
        onDepartmentChange={setDepartment}
      />

      <section className="impacts-section section-shell" id="impactos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Del clima a la vida cotidiana</p>
            <h2>Impactos observados en Perú</h2>
          </div>
          <p className="section-intro">
            Esta sección no convierte el calentamiento del mar en daño
            automático. Indica qué dato existe y dónde verificarlo.
          </p>
        </div>
        <div className="impact-purpose">
          <strong>¿Para qué sirve este módulo?</strong>
          <p>
            Para comprobar consecuencias reales: desbordes, casos de dengue,
            cambios pesqueros o condiciones adversas para cultivos. Si no hay un
            valor oficial integrado, lo decimos expresamente.
          </p>
        </div>
        <div className="impact-status-list">
          <article className="impact-status-item">
            <div className="impact-status-heading">
              <span>01 · Hidrología</span>
              <strong className="data-status unavailable">
                Dato no integrado
              </strong>
            </div>
            <h3>Ríos y reservorios</h3>
            <p>
              Debe comparar caudal actual, normal mensual y aviso vigente. Por
              ahora la verificación se realiza en SENAMHI.
            </p>
            <a
              className="impact-action"
              href="https://www.senamhi.gob.pe/?p=avisos-detalle-hidrologicos"
              target="_blank"
              rel="noreferrer"
            >
              Consultar avisos oficiales ↗
            </a>
          </article>

          <article className="impact-status-item">
            <div className="impact-status-heading">
              <span>02 · Salud pública</span>
              <strong className="data-status historical">
                Serie histórica
              </strong>
            </div>
            <h3>Dengue</h3>
            <p>
              MINSA ofrece datos 2000–2024 por semana y territorio. La página no
              presenta el clima como causa única de los casos.
            </p>
            <a
              className="impact-action"
              href="https://www.datosabiertos.gob.pe/dataset/vigilancia-epidemiol%C3%B3gica-de-dengue"
              target="_blank"
              rel="noreferrer"
            >
              Abrir datos MINSA ↗
            </a>
          </article>

          <article className="impact-status-item">
            <div className="impact-status-heading">
              <span>03 · Pesca</span>
              <strong className="data-status periodic">
                Publicación periódica
              </strong>
            </div>
            <h3>Anchoveta</h3>
            <p>
              Biomasa, distribución y presencia de juveniles se verifican con
              la última evaluación publicada por IMARPE.
            </p>
            <a
              className="impact-action"
              href="https://repositorio.imarpe.gob.pe/"
              target="_blank"
              rel="noreferrer"
            >
              Consultar IMARPE ↗
            </a>
          </article>

          <article className="impact-status-item">
            <div className="impact-status-heading">
              <span>04 · Agricultura</span>
              <strong className="data-status unavailable">
                Sin indicador consolidado
              </strong>
            </div>
            <h3>Agua, temperatura y cultivos</h3>
            <p>
              Para evaluar afectación se necesitan lluvia, temperatura mínima,
              disponibilidad hídrica y calendario de cultivo.
            </p>
            <a
              className="impact-action"
              href="https://siea.midagri.gob.pe/portal/"
              target="_blank"
              rel="noreferrer"
            >
              Consultar MIDAGRI ↗
            </a>
          </article>
        </div>
      </section>

      <section className="history-section" id="historico">
        <div className="section-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Perspectiva larga</p>
              <h2>Evolución y episodios</h2>
            </div>
            <div className="segmented" aria-label="Periodo histórico">
              <button
                type="button"
                className={historyStart === 1981 ? "active" : ""}
                aria-pressed={historyStart === 1981}
                onClick={() => setHistoryStart(1981)}
              >
                Desde 1981
              </button>
              <button
                type="button"
                className={historyStart === 1950 ? "active" : ""}
                aria-pressed={historyStart === 1950}
                onClick={() => setHistoryStart(1950)}
              >
                Desde 1950
              </button>
            </div>
          </div>
          <figure className="panel history-panel">
            <div className="chart-legend history-legend">
              <span><i className="legend-coast" />Niño 1+2</span>
              <span><i className="legend-central" />Niño 3.4 / ONI</span>
              <span><i className="legend-neutral" />Zona neutral</span>
            </div>
            <HistoryChart data={live.history} startYear={historyStart} />
            <figcaption>
              Promedios anuales calculados desde datos NOAA; antes de 1981 se usa
              ONI como referencia central.
            </figcaption>
          </figure>
          <EventComparisonChart profiles={live.eventProfiles} />
        </div>
      </section>

      <section className="forecast-section section-shell" id="pronosticos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mirada hacia adelante</p>
            <h2>Pronóstico explicado</h2>
          </div>
          <p className="section-intro">
            Elige un horizonte. Los porcentajes responden preguntas distintas y
            no equivalen a probabilidad de inundación.
          </p>
        </div>
        <div
          className="forecast-selector"
          role="group"
          aria-label="Elegir horizonte del pronóstico"
        >
          {([3, 6, 9] as ForecastHorizon[]).map((horizon) => (
            <button
              type="button"
              key={horizon}
              className={forecastHorizon === horizon ? "active" : ""}
              aria-pressed={forecastHorizon === horizon}
              onClick={() => setForecastHorizon(horizon)}
            >
              <span>{forecastOptions[horizon].label}</span>
              <strong>{forecastOptions[horizon].value}</strong>
            </button>
          ))}
        </div>
        <article className="forecast-detail" aria-live="polite">
          <div className="forecast-detail-main">
            <span className="horizon">{selectedForecast.label}</span>
            <div className="forecast-detail-score">
              <strong>{selectedForecast.value}</strong>
              <span>{selectedForecast.subject}</span>
            </div>
            {selectedForecast.percent !== null ? (
              <div
                className="probability-track"
                aria-label={`${selectedForecast.percent}%`}
              >
                <span style={{ width: `${selectedForecast.percent}%` }} />
              </div>
            ) : (
              <div className="qualitative-message">
                No existe un porcentaje oficial único para este horizonte.
              </div>
            )}
            <p className="forecast-period">{selectedForecast.period}</p>
          </div>
          <dl className="forecast-explanation">
            <div>
              <dt>¿Qué significa?</dt>
              <dd>{selectedForecast.meaning}</dd>
            </div>
            <div>
              <dt>¿Qué no significa?</dt>
              <dd>{selectedForecast.limit}</dd>
            </div>
            <div>
              <dt>Fuente</dt>
              <dd>
                <a
                  href={selectedForecast.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir {selectedForecast.source} ↗
                </a>
              </dd>
            </div>
          </dl>
        </article>
        <div className="forecast-warning">
          <strong>Importante:</strong>
          <span>
            97% describe persistencia; 81% describe intensidad; la evaluación de
            9 meses es cualitativa. No son tres medidas equivalentes.
          </span>
        </div>
      </section>

      <section className="timeline-section section-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Decisiones oficiales</p>
            <h2>Línea de tiempo ENFEN</h2>
          </div>
          <p className="section-intro">
            Cada actualización conserva el enlace original para verificar fecha
            y contexto.
          </p>
        </div>
        <ol className="timeline">
          {timeline.map((item, index) => (
            <li key={item.number}>
              <span className="timeline-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <time>{item.date}</time>
                <a href={item.href} target="_blank" rel="noreferrer">
                  Comunicado Oficial N.° {item.number}-2026
                </a>
                <p>{item.state}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="sources-section" id="fuentes">
        <div className="section-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Datos abiertos</p>
              <h2>Fuentes, frecuencia y límites</h2>
            </div>
            <div className="download-actions">
              <button type="button" className="button primary" onClick={downloadCsv}>
                Descargar CSV
              </button>
              <button type="button" className="button secondary" onClick={downloadJson}>
                Descargar JSON
              </button>
            </div>
          </div>
          <div className="freshness-callout">
            <strong>El tablero revisa las fuentes cada 24 horas.</strong>
            <span>
              Si una institución publica con menor frecuencia, se conserva el
              último dato y se muestra su fecha real.
            </span>
            <time>Última revisión: {formatDateTime(live.generatedAt)}</time>
          </div>
          <div className="source-table" role="table" aria-label="Fuentes de datos">
            <div className="source-table-head" role="row">
              <span role="columnheader">Fuente</span>
              <span role="columnheader">Qué aporta</span>
              <span role="columnheader">Frecuencia</span>
              <span role="columnheader">Acceso</span>
            </div>
            {sources.map((source) => (
              <div className="source-row" role="row" key={source.name}>
                <strong role="cell">
                  <i
                    className={`status-dot ${
                      source.status === "current"
                        ? "green"
                        : source.status === "historical"
                          ? "amber"
                          : "red"
                    }`}
                  />
                  {source.name}
                </strong>
                <span role="cell">{source.detail}</span>
                <span role="cell">{source.cadence}</span>
                <a role="cell" href={source.href} target="_blank" rel="noreferrer">
                  Abrir ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="method-section section-shell" id="metodologia">
        <div>
          <p className="eyebrow">Metodología</p>
          <h2>Cómo cuidamos la lectura</h2>
        </div>
        <div className="method-grid">
          <article>
            <span>01</span>
            <h3>Oficial</h3>
            <p>ENFEN define el estado costero; cada impacto conserva su fuente.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Sin atajos</h3>
            <p>Si un dato territorial no está integrado, el mapa no inventa un nivel.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Frescura</h3>
            <p>Revisamos a diario sin cambiar la fecha real de publicación.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Asociación</h3>
            <p>Clima y dengue se comparan sin atribuir una causalidad automática.</p>
          </article>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true">Q</span>
          <div>
            <strong>Quipu Insights</strong>
            <p>Sostenibilidad El Niño Perú</p>
          </div>
        </div>
        <p className="official-note">
          Usa bases de datos oficiales y científicas de acceso abierto.
          <br />
          No sustituye alertas de ENFEN, SENAMHI ni autoridades de gestión del riesgo.
          <span className="instagram-contact">
            Encuéntranos en Instagram como{" "}
            <a
              href="https://www.instagram.com/quipuinsights/"
              target="_blank"
              rel="noreferrer"
            >
              @quipuinsights
            </a>
            . Para cualquier consulta o duda, escríbenos por allí.
          </span>
        </p>
        <a href="#inicio">Volver arriba ↑</a>
      </footer>
    </main>
  );
}
