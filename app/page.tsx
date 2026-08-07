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
