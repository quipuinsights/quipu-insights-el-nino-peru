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
