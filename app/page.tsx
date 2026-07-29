"use client";

import { useEffect, useMemo, useState } from "react";

type Profile = "citizen" | "agro" | "technical";
type LayerKey = "ocean" | "rain" | "rivers";
type Severity = "low" | "medium" | "high";

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

const profileContent: Record<
  Profile,
  { label: string; eyebrow: string; description: string }
> = {
  citizen: {
    label: "Vista Ciudadano",
    eyebrow: "Lo esencial primero",
    description:
      "Riesgos, alertas e impactos explicados con lenguaje directo.",
  },
  agro: {
    label: "Vista Agro",
    eyebrow: "Decisiones productivas",
    description:
      "Destaca lluvia, temperatura, pronósticos y señales para el campo.",
  },
  technical: {
    label: "Vista Técnico",
    eyebrow: "Trazabilidad completa",
    description:
      "Muestra índices oceánicos, series históricas y metodología.",
  },
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

function severityFor(layer: LayerKey, department: string): Severity {
  if (layer === "ocean") {
    if (
      belongsTo("northCoast", department) ||
      belongsTo("centralCoast", department)
    ) {
      return "high";
    }
    if (belongsTo("southCoast", department)) return "medium";
    return "low";
  }

  if (layer === "rain") {
    if (belongsTo("northCoast", department)) return "high";
    if (
      belongsTo("centralCoast", department) ||
      department === "Cajamarca" ||
      department === "Amazonas"
    ) {
      return "medium";
    }
    return "low";
  }

  if (
    ["Tumbes", "Piura", "Lambayeque", "Loreto", "Ucayali"].includes(
      department,
    )
  ) {
    return "high";
  }
  if (
    belongsTo("centralCoast", department) ||
    ["Huanuco", "San Martin", "Amazonas"].includes(department)
  ) {
    return "medium";
  }
  return "low";
}

function combinedSeverity(
  layers: Set<LayerKey>,
  department: string,
): Severity {
  const rank: Record<Severity, number> = { low: 1, medium: 2, high: 3 };
  const active = Array.from(layers).map((layer) =>
    severityFor(layer, department),
  );
  return active.sort((a, b) => rank[b] - rank[a])[0] ?? "low";
}

function territoryCopy(department: string) {
  if (belongsTo("northCoast", department)) {
    return {
      zone: "Costa norte",
      rain: "Señal demostrativa alta: priorizar avisos y acumulados recientes.",
      temperature: "Anomalía costera cálida con vigilancia reforzada.",
      dengue:
        "Clima favorable no equivale a brote; revisar casos por semana epidemiológica.",
      agro: "Mayor atención a anegamiento, plagas y temperatura mínima.",
    };
  }
  if (belongsTo("centralCoast", department)) {
    return {
      zone: "Costa central",
      rain: "Señal demostrativa media, variable entre cuencas.",
      temperature: "Condición cálida costera; verificar la estación más cercana.",
      dengue: "Cruce climático en preparación con datos territoriales del MINSA.",
      agro: "Vigilar disponibilidad hídrica y cultivos sensibles al calor.",
    };
  }
  if (belongsTo("southCoast", department)) {
    return {
      zone: "Costa sur",
      rain: "Sin señal departamental uniforme en esta capa demostrativa.",
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
  profile,
  department,
  onDepartmentChange,
}: {
  profile: Profile;
  department: string;
  onDepartmentChange: (department: string) => void;
}) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [layers, setLayers] = useState<Set<LayerKey>>(
    new Set(["rain", "rivers"]),
  );

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
  const selectedSeverity = combinedSeverity(layers, department);

  function toggleLayer(layer: LayerKey) {
    setLayers((current) => {
      const next = new Set(current);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }

  const layerLabels: Record<LayerKey, string> = {
    ocean: "Anomalía del mar",
    rain: "Riesgo de lluvia",
    rivers: "Caudales y avisos",
  };

  return (
    <section
      className={`risk-map-section ${profile === "agro" ? "profile-highlight" : ""}`}
      id="mapa"
    >
      <div className="section-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Territorio primero</p>
            <h2>Mapa de señales e impactos</h2>
          </div>
          <p className="section-intro">
            Selecciona un departamento y combina capas. Los colores actuales son
            una demostración de la arquitectura, no una alerta local.
          </p>
        </div>

        <div className="map-toolbar" aria-label="Capas del mapa">
          {(["ocean", "rain", "rivers"] as LayerKey[]).map((layer) => (
            <button
              type="button"
              key={layer}
              aria-pressed={layers.has(layer)}
              className={layers.has(layer) ? "active" : ""}
              onClick={() => toggleLayer(layer)}
            >
              <i className={`layer-icon layer-${layer}`} />
              {layerLabels[layer]}
            </button>
          ))}
          <span className="demo-badge">Capa demostrativa</span>
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
                  const severity = combinedSeverity(layers, item.name);
                  const selected = item.name === department;
                  return (
                    <path
                      key={item.code}
                      d={item.path}
                      className={`map-region severity-${severity} ${selected ? "selected" : ""}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${displayDepartment(item.name)}: señal ${severity}`}
                      onClick={() => onDepartmentChange(item.name)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onDepartmentChange(item.name);
                        }
                      }}
                    >
                      <title>
                        {displayDepartment(item.name)} · señal{" "}
                        {severity === "high"
                          ? "alta"
                          : severity === "medium"
                            ? "media"
                            : "baja"}
                      </title>
                    </path>
                  );
                })}
              </svg>
            ) : (
              <div className="map-loading">Preparando mapa oficial del INEI…</div>
            )}
            <div className="map-legend" aria-label="Leyenda">
              <span><i className="legend-low" />Baja</span>
              <span><i className="legend-medium" />Media</span>
              <span><i className="legend-high" />Alta</span>
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
              <strong className={`risk-pill risk-${selectedSeverity}`}>
                Señal{" "}
                {selectedSeverity === "high"
                  ? "alta"
                  : selectedSeverity === "medium"
                    ? "media"
                    : "baja"}
              </strong>
            </div>
            <p className="territory-intro">
              Lectura departamental orientativa. Al incorporar datos
              provinciales se mostrará el nivel territorial real de cada fuente.
            </p>
            <div className="territory-grid">
              <article>
                <span>Lluvia</span>
                <p>{selectedCopy.rain}</p>
              </article>
              <article>
                <span>Temperatura</span>
                <p>{selectedCopy.temperature}</p>
              </article>
              <article>
                <span>Ríos priorizados</span>
                <p>{riverByDepartment[department] ?? "Estaciones regionales"}</p>
              </article>
              <article>
                <span>{profile === "agro" ? "Agro" : "Salud"}</span>
                <p>
                  {profile === "agro" ? selectedCopy.agro : selectedCopy.dengue}
                </p>
              </article>
            </div>
            <div className="territory-actions">
              <a
                href="https://www.senamhi.gob.pe/?p=avisos-detalle-hidrologicos"
                target="_blank"
                rel="noreferrer"
              >
                Avisos SENAMHI ↗
              </a>
              <a
                href="https://www.senamhi.gob.pe/?p=pronostico-climatico"
                target="_blank"
                rel="noreferrer"
              >
                Pronóstico local ↗
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
  const [profile, setProfile] = useState<Profile>("citizen");
  const [historyStart, setHistoryStart] = useState<1950 | 1981>(1981);
  const [department, setDepartment] = useState("Piura");

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

  const enfenRisk =
    live.enfen.state.toLocaleLowerCase("es").includes("alerta") ? "high" : "medium";

  return (
    <main className={`profile-${profile}`}>
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
          Actualización automática <strong>cada 24 horas · 5:00 p. m.</strong>
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

      <section className="profile-bar" aria-label="Selector de perfil">
        <div className="profile-switcher" role="group" aria-label="Tipo de vista">
          {(Object.keys(profileContent) as Profile[]).map((item) => (
            <button
              type="button"
              key={item}
              className={profile === item ? "active" : ""}
              aria-pressed={profile === item}
              onClick={() => setProfile(item)}
            >
              {profileContent[item].label}
            </button>
          ))}
        </div>
        <p>
          <strong>{profileContent[profile].eyebrow}</strong>
          {profileContent[profile].description}
        </p>
      </section>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Observatorio abierto · Perú primero</p>
          <h1>
            Del océano
            <span>a los impactos</span>
          </h1>
          <p className="hero-lede">
            Quipu Insights conecta el Niño Costero con lluvia, ríos, salud y
            actividad productiva, siempre mostrando la fecha y la fuente.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#mapa">Explorar el mapa</a>
            <a className="button secondary" href="#impactos">Ver impactos</a>
          </div>
        </div>

        <aside className="hero-risk-board" aria-label="Resumen de riesgo">
          <div className="risk-board-title">
            <span>Resumen oficial y territorial</span>
            <time>{live.enfen.date}</time>
          </div>
          <article>
            <div>
              <span>Estado climático ENFEN</span>
              <strong>{live.enfen.state}</strong>
            </div>
            <i className={`risk-light risk-${enfenRisk}`} />
          </article>
          <article>
            <div>
              <span>Impactos territoriales</span>
              <strong>Cobertura piloto</strong>
            </div>
            <i className="risk-light risk-medium" />
          </article>
          <a href={live.enfen.url} target="_blank" rel="noreferrer">
            Abrir comunicado vigente ↗
          </a>
          <small>
            Separamos el estado de El Niño del riesgo de desborde, dengue o
            afectación productiva.
          </small>
        </aside>
      </section>

      <section className="summary section-shell" id="resumen">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lectura rápida</p>
            <h2>Qué sabemos hoy</h2>
          </div>
          <p className="section-intro">
            El océano explica el contexto. Las consecuencias se verifican con
            lluvia, ríos y datos territoriales.
          </p>
        </div>
        <div className="summary-grid">
          <article className="summary-card primary-summary">
            <span>Niño Costero</span>
            <strong>{live.enfen.state}</strong>
            <small>ENFEN · {live.enfen.date}</small>
          </article>
          <article className="summary-card">
            <span>Niño 1+2</span>
            <strong>{signed(live.indicators.nino12.value)}</strong>
            <small>NOAA · {live.indicators.nino12.date}</small>
          </article>
          <article className="summary-card">
            <span>Territorio</span>
            <strong>Mapa piloto</strong>
            <small>Capas de mar, lluvia y ríos</small>
          </article>
          <article className="summary-card">
            <span>Próxima revisión</span>
            <strong>24 horas</strong>
            <small>{formatDateTime(live.nextRefreshAt)}</small>
          </article>
        </div>
      </section>

      {profile !== "citizen" && (
        <section className="technical-snapshot section-shell" id="indicadores">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Contexto oceánico</p>
              <h2>Dos zonas, una historia conectada</h2>
            </div>
            <p className="section-intro">
              Niño 1+2 representa el Pacífico oriental cercano al Perú. Niño
              3.4 resume el Pacífico ecuatorial central.
            </p>
          </div>
          <div className="metric-grid">
            {[
              ["Niño 1+2", live.indicators.nino12, "Costa peruana"],
              ["ICEN", live.indicators.icen, "Índice costero ENFEN"],
              ["Niño 3.4", live.indicators.nino34, "Pacífico central"],
              ["ONI", live.indicators.oni, "Promedio trimestral"],
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
        </section>
      )}

      <PeruRiskMap
        profile={profile}
        department={department}
        onDepartmentChange={setDepartment}
      />

      <section
        className={`impacts-section section-shell ${profile === "agro" ? "profile-highlight" : ""}`}
        id="impactos"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">De la señal a la consecuencia</p>
            <h2>Módulos de impacto</h2>
          </div>
          <p className="section-intro">
            Cada módulo declara qué está conectado, qué es histórico y qué sigue
            en validación.
          </p>
        </div>
        <div className="impact-grid">
          <article className="impact-card hydrology-card">
            <div className="impact-card-top">
              <span>01 · Hidrología</span>
              <i className="status-dot amber" />
            </div>
            <h3>Ríos y reservorios</h3>
            <strong>Conexión en validación</strong>
            <p>
              Priorizamos Piura, Chira, Rímac y las cuencas con avisos activos
              del SENAMHI.
            </p>
            <div className="impact-tags">
              <span>Caudal actual</span>
              <span>Normal mensual</span>
              <span>Aviso vigente</span>
            </div>
            <a
              href="https://www.senamhi.gob.pe/?p=avisos-detalle-hidrologicos"
              target="_blank"
              rel="noreferrer"
            >
              Abrir avisos oficiales ↗
            </a>
          </article>

          <article className="impact-card health-card">
            <div className="impact-card-top">
              <span>02 · Salud pública</span>
              <i className="status-dot green" />
            </div>
            <h3>Dengue</h3>
            <strong>Serie histórica 2000–2024</strong>
            <p>
              Datos oficiales por semana, departamento, provincia y distrito.
              La asociación climática no se presenta como causa única.
            </p>
            <div className="impact-tags">
              <span>Semana epidemiológica</span>
              <span>Tasa territorial</span>
              <span>Desfase climático</span>
            </div>
            <a
              href="https://www.datosabiertos.gob.pe/dataset/vigilancia-epidemiol%C3%B3gica-de-dengue"
              target="_blank"
              rel="noreferrer"
            >
              Abrir dataset MINSA ↗
            </a>
          </article>

          <article className="impact-card fish-card">
            <div className="impact-card-top">
              <span>03 · Pesca</span>
              <i className="status-dot amber" />
            </div>
            <h3>Anchoveta</h3>
            <strong>Último crucero disponible</strong>
            <p>
              Biomasa, distribución, profundidad y juveniles se actualizan
              cuando IMARPE publica una evaluación oficial.
            </p>
            <div className="impact-tags">
              <span>Biomasa</span>
              <span>Distribución</span>
              <span>Juveniles</span>
            </div>
            <a
              href="https://repositorio.imarpe.gob.pe/"
              target="_blank"
              rel="noreferrer"
            >
              Repositorio IMARPE ↗
            </a>
          </article>

          <article className="impact-card agro-card">
            <div className="impact-card-top">
              <span>04 · Agro</span>
              <i className="status-dot amber" />
            </div>
            <h3>Estrés hídrico y plagas</h3>
            <strong>Metodología en preparación</strong>
            <p>
              Combinará lluvia, temperatura mínima, déficit hídrico y calendario
              de cultivos sin llamarlo “riesgo oficial”.
            </p>
            <div className="impact-tags">
              <span>CHIRPS</span>
              <span>Temperatura mínima</span>
              <span>Cultivo</span>
            </div>
            <a
              href="https://siea.midagri.gob.pe/portal/"
              target="_blank"
              rel="noreferrer"
            >
              Estadística agraria ↗
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

      <section
        className={`forecast-section section-shell ${profile === "agro" ? "profile-highlight" : ""}`}
        id="pronosticos"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mirada hacia adelante</p>
            <h2>Pronóstico a 3, 6 y 9 meses</h2>
          </div>
          <p className="section-intro">
            Solo mostramos probabilidades publicadas. Una conclusión cualitativa
            no se convierte en un porcentaje inventado.
          </p>
        </div>
        <div className="forecast-grid">
          <article className="forecast-card">
            <span className="horizon">3 meses</span>
            <div className="forecast-score">
              <strong>97%</strong>
              <span>persistencia</span>
            </div>
            <div className="probability-track"><span style={{ width: "97%" }} /></div>
            <h3>El Niño continúa</h3>
            <p>Probabilidad NOAA publicada para la persistencia del evento.</p>
            <a
              href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc_Sp.shtml"
              target="_blank"
              rel="noreferrer"
            >
              Fuente NOAA ↗
            </a>
          </article>
          <article className="forecast-card featured">
            <span className="horizon">6 meses</span>
            <div className="forecast-score">
              <strong>81%</strong>
              <span>muy fuerte</span>
            </div>
            <div className="probability-track"><span style={{ width: "81%" }} /></div>
            <h3>Pico hacia fin de año</h3>
            <p>Probabilidad publicada para una intensidad muy fuerte en OND 2026.</p>
            <a
              href="https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/strengths/"
              target="_blank"
              rel="noreferrer"
            >
              Fuente NOAA ↗
            </a>
          </article>
          <article className="forecast-card qualitative">
            <span className="horizon">9 meses</span>
            <div className="forecast-score">
              <strong>Probable</strong>
              <span>sin % único</span>
            </div>
            <div className="qualitative-track"><span /></div>
            <h3>Hasta abril de 2027</h3>
            <p>Escenario cualitativo comunicado por ENFEN.</p>
            <a href={live.enfen.url} target="_blank" rel="noreferrer">
              Fuente ENFEN ↗
            </a>
          </article>
        </div>
        <p className="chart-explainer">
          La intensidad oceánica no determina por sí sola los impactos en cada
          región o actividad del Perú.
        </p>
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
            <h3>Demostración</h3>
            <p>Las capas piloto están marcadas y nunca se presentan como alertas.</p>
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
