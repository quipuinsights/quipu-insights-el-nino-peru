"use client";

import { useEffect, useMemo, useState } from "react";

type Indicator = {
  value: number | null;
  date: string;
};

type HistoryPoint = {
  year: number;
  nino12: number | null;
  nino34: number | null;
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
  enfen: EnfenRelease;
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
  enfen: {
    title: "Comunicado Oficial ENFEN N.° 13-2026",
    state: "Alerta de El Niño Costero",
    date: "17 jul 2026",
    url: "https://enfen.imarpe.gob.pe/2026/07/17/comunicado-oficial-enfen-n-13-2026-estado-de-sistema-de-alerta-alerta-de-el-nino-costero/",
  },
};

const departments = [
  ["Tumbes", "costa-norte"],
  ["Piura", "costa-norte"],
  ["Lambayeque", "costa-norte"],
  ["La Libertad", "costa-norte"],
  ["Áncash", "costa-central"],
  ["Lima", "costa-central"],
  ["Callao", "costa-central"],
  ["Ica", "costa-central"],
  ["Arequipa", "costa-sur"],
  ["Moquegua", "costa-sur"],
  ["Tacna", "costa-sur"],
  ["Cajamarca", "andes"],
  ["Huánuco", "andes"],
  ["Pasco", "andes"],
  ["Junín", "andes"],
  ["Huancavelica", "andes"],
  ["Ayacucho", "andes"],
  ["Apurímac", "andes"],
  ["Cusco", "andes"],
  ["Puno", "andes"],
  ["Amazonas", "amazonia"],
  ["Loreto", "amazonia"],
  ["San Martín", "amazonia"],
  ["Ucayali", "amazonia"],
  ["Madre de Dios", "amazonia"],
] as const;

const regionalSignals = {
  "costa-norte": {
    zone: "Costa norte",
    rain: "Normal a superior, con episodios localizados; aumenta hacia el verano.",
    temperature: "Muy por encima de lo habitual en la costa.",
    confidence: "Señal regional con respaldo ENFEN",
  },
  "costa-central": {
    zone: "Costa central",
    rain: "Mayor probabilidad de lluvia superior a lo normal en el verano 2026–2027.",
    temperature: "Muy por encima de lo habitual en la costa.",
    confidence: "Señal estacional, no pronóstico diario",
  },
  "costa-sur": {
    zone: "Costa sur",
    rain: "Sin una señal departamental robusta en el comunicado usado.",
    temperature: "Tendencia costera cálida; revisar avisos locales de SENAMHI.",
    confidence: "Información regional limitada",
  },
  andes: {
    zone: "Andes centrales y del sur",
    rain: "Condiciones de normales a inferiores durante el verano 2026–2027.",
    temperature: "Variable por altitud; el índice oceánico no predice cada localidad.",
    confidence: "Escenario estacional ENFEN",
  },
  amazonia: {
    zone: "Amazonía",
    rain: "Sin una señal única atribuible al ENSO para todo el departamento.",
    temperature: "Consultar los pronósticos regionales de SENAMHI.",
    confidence: "No se generaliza por falta de señal uniforme",
  },
} as const;

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
    name: "NOAA OISST",
    detail: "Temperatura superficial global desde 1981.",
    cadence: "Diaria",
    status: "current",
    href: "https://www.ncei.noaa.gov/products/optimum-interpolation-sst",
  },
  {
    name: "SENAMHI",
    detail: "Temperatura, lluvia, avisos y análisis para Perú.",
    cadence: "Diaria / mensual",
    status: "current",
    href: "https://www.senamhi.gob.pe/",
  },
  {
    name: "CHIRPS v3",
    detail: "Lluvia satelital y estaciones desde 1981.",
    cadence: "Pentadal",
    status: "current",
    href: "https://www.chc.ucsb.edu/data/chirps3",
  },
  {
    name: "NASA IMERG",
    detail: "Precipitación reciente por satélite.",
    cadence: "30 minutos",
    status: "registration",
    href: "https://gpm.nasa.gov/data/imerg",
  },
  {
    name: "Copernicus OSTIA",
    detail: "Mapa oceánico global de alta resolución.",
    cadence: "Diaria",
    status: "registration",
    href: "https://data.marine.copernicus.eu/product/SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001/description",
  },
  {
    name: "NOAA CFSv2",
    detail: "Pronósticos estacionales por ensamble.",
    cadence: "Diaria",
    status: "current",
    href: "https://www.cpc.ncep.noaa.gov/products/CFSv2/cfsv2_fcst_history/",
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
  {
    date: "15 may 2026",
    number: "09",
    state: "Seguimiento del evento costero",
    href: "https://enfen.imarpe.gob.pe/download/comunicado-oficial-enfen-n-09-2026/",
  },
  {
    date: "17 abr 2026",
    number: "07",
    state: "Continuidad de la alerta",
    href: "https://enfen.imarpe.gob.pe/download/comunicado-oficial-enfen-n-07-2026/",
  },
] as const;

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
      {filtered.map((item) => (
        <g key={item.year}>
          {item.nino34 !== null && (
            <circle
              cx={x(item.year)}
              cy={y(item.nino34)}
              r="2.2"
              className="history-point central-point"
            >
              <title>{`${item.year} · Niño 3.4: ${signed(item.nino34, 2)}`}</title>
            </circle>
          )}
          {item.nino12 !== null && (
            <circle
              cx={x(item.year)}
              cy={y(item.nino12)}
              r="2.2"
              className="history-point coast-point"
            >
              <title>{`${item.year} · Niño 1+2: ${signed(item.nino12, 2)}`}</title>
            </circle>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function Home() {
  const [live, setLive] = useState<LiveData>(FALLBACK_DATA);
  const [historyStart, setHistoryStart] = useState<1950 | 1981>(1981);
  const [department, setDepartment] = useState("Piura");

  useEffect(() => {
    const controller = new AbortController();
    fetch("./data/live.json", { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Fuente temporalmente no disponible");
        return response.json() as Promise<LiveData>;
      })
      .then((payload) => setLive(payload))
      .catch(() => setLive(FALLBACK_DATA));
    return () => controller.abort();
  }, []);

  const selectedRegion = useMemo(() => {
    const match = departments.find(([name]) => name === department);
    return regionalSignals[match?.[1] ?? "costa-norte"];
  }, [department]);

  const downloadable = useMemo(
    () => ({
      brand: "Quipu Insights",
      dashboard: "Sostenibilidad El Niño Perú",
      generated_at: live.generatedAt,
      data_mode: live.mode,
      indicators: live.indicators,
      history: live.history,
      enfen: live.enfen,
      selected_department: {
        department,
        ...selectedRegion,
      },
      forecast: [
        {
          horizon_months: 3,
          scenario: "Persistencia de El Niño",
          probability_percent: 97,
          source: "NOAA CPC, diagnóstico de julio de 2026",
        },
        {
          horizon_months: 6,
          scenario: "Intensidad muy fuerte en OND 2026",
          probability_percent: 81,
          source: "NOAA CPC, probabilidades de intensidad",
        },
        {
          horizon_months: 9,
          scenario: "Continuación del Niño Costero hasta abril de 2027",
          probability_percent: null,
          source: "ENFEN N.° 13-2026; probabilidad cualitativa",
        },
      ],
      sources,
    }),
    [department, live, selectedRegion],
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

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Quipu Insights, inicio">
          <span className="brand-mark" aria-hidden="true">
            Q
          </span>
          <span>
            <strong>Quipu</strong>
            <small>insights</small>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#indicadores">Indicadores</a>
          <a href="#historico">Histórico</a>
          <a href="#pronosticos">Pronósticos</a>
          <a href="#regiones">Departamentos</a>
          <a href="#fuentes">Fuentes</a>
        </nav>
        <div className="header-freshness">
          <span className={`status-dot ${live.mode === "live" ? "green" : "amber"}`} />
          Datos revisados
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Observatorio abierto · Perú primero</p>
          <h1>
            Sostenibilidad
            <span>El Niño Perú</span>
          </h1>
          <p className="hero-lede">
            Una lectura clara del Niño Costero y del ENSO global, con indicadores,
            pronósticos y fuentes verificables.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#indicadores">
              Ver estado actual
            </a>
            <a className="button secondary" href="#metodologia">
              Cómo se construye
            </a>
          </div>
        </div>
        <aside className="hero-status" aria-label="Resumen oficial">
          <div className="hero-status-top">
            <span className="live-pill">
              <span className="status-dot green" />
              Monitoreo activo
            </span>
            <span>{live.enfen.date}</span>
          </div>
          <p>Niño Costero · Perú</p>
          <strong>{live.enfen.state}</strong>
          <a href={live.enfen.url} target="_blank" rel="noreferrer">
            {live.enfen.title} <span aria-hidden="true">↗</span>
          </a>
          <div className="hero-status-rule" />
          <small>
            La clasificación oficial costera proviene de ENFEN. Las mediciones
            internacionales sirven como contraste, no como sustituto.
          </small>
        </aside>
      </section>

      <section className="snapshot section-shell" id="indicadores">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Estado actual</p>
            <h2>Dos zonas, una historia conectada</h2>
          </div>
          <p className="section-intro">
            Niño 1+2 representa el Pacífico oriental cercano al Perú. Niño 3.4
            resume el Pacífico ecuatorial central.
          </p>
        </div>

        <div className="metric-grid">
          <article className="metric-card accent-card">
            <div className="metric-label">
              Niño Costero
              <span className="status-dot green" />
            </div>
            <strong>Alerta</strong>
            <p>Estado oficial ENFEN</p>
            <span className="metric-date">{live.enfen.date}</span>
          </article>
          <article className="metric-card">
            <div className="metric-label">ENSO global</div>
            <strong>El Niño</strong>
            <p>Advertencia internacional</p>
            <span className="metric-date">NOAA CPC · jul 2026</span>
          </article>
          <article className="metric-card">
            <div className="metric-label">Niño 1+2</div>
            <strong>{signed(live.indicators.nino12.value)}</strong>
            <p>Anomalía semanal del mar</p>
            <span className="metric-date">{live.indicators.nino12.date}</span>
          </article>
          <article className="metric-card">
            <div className="metric-label">Niño 3.4</div>
            <strong>{signed(live.indicators.nino34.value)}</strong>
            <p>Anomalía semanal del mar</p>
            <span className="metric-date">{live.indicators.nino34.date}</span>
          </article>
        </div>

        <div className="dashboard-grid">
          <figure className="panel comparison-panel">
            <div className="panel-title-row">
              <div>
                <p className="panel-kicker">Comparación</p>
                <h3>Perú vs. Pacífico central</h3>
              </div>
              <div className="chart-legend">
                <span><i className="legend-coast" />Costa</span>
                <span><i className="legend-central" />Central</span>
              </div>
            </div>
            <div className="bar-chart">
              {[
                ["Niño 1+2", live.indicators.nino12.value, "coast"],
                ["ICEN", live.indicators.icen.value, "coast"],
                ["Niño 3.4", live.indicators.nino34.value, "central"],
                ["ONI", live.indicators.oni.value, "central"],
              ].map(([name, rawValue, zone]) => {
                const value = typeof rawValue === "number" ? rawValue : null;
                const chartWidth = value === null ? 0 : Math.min(100, Math.abs(value) / 3 * 100);
                return (
                  <div className="bar-row" key={String(name)} title={`${name}: ${signed(value)}`}>
                    <span>{name}</span>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${zone}`}
                        style={{ width: `${chartWidth}%` }}
                      />
                    </div>
                    <strong>{value === null ? "—" : signed(value)}</strong>
                  </div>
                );
              })}
            </div>
            <figcaption>
              Compara anomalías, no impactos. ICEN y ONI conservan la frecuencia
              mensual de su publicación oficial.
            </figcaption>
          </figure>

          <aside className="panel freshness-panel">
            <div className="panel-title-row">
              <div>
                <p className="panel-kicker">Trazabilidad</p>
                <h3>Frescura de datos</h3>
              </div>
              <span className="mode-label">
                {live.mode === "live" ? "En línea" : "Respaldo"}
              </span>
            </div>
            <div className="fresh-list">
              {[
                ["ENFEN", live.enfen.date, "green"],
                ["NOAA semanal", live.indicators.nino12.date, "green"],
                ["ONI", live.indicators.oni.date, "green"],
                ["ICEN", live.indicators.icen.date, live.indicators.icen.value === null ? "red" : "green"],
              ].map(([name, date, color]) => (
                <div className="fresh-row" key={name}>
                  <span>
                    <i className={`status-dot ${color}`} />
                    {name}
                  </span>
                  <small>{date}</small>
                </div>
              ))}
            </div>
            <div className="fresh-legend">
              <span><i className="status-dot green" />Actualizado</span>
              <span><i className="status-dot amber" />Atrasado</span>
              <span><i className="status-dot red" />No disponible</span>
            </div>
            <p className="refresh-time">
              Revisión: {formatDateTime(live.generatedAt)}
              <br />
              Próxima ventana: {formatDateTime(live.nextRefreshAt)}
            </p>
          </aside>
        </div>
      </section>

      <section className="history-section" id="historico">
        <div className="section-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Perspectiva larga</p>
              <h2>Evolución histórica</h2>
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
              ONI como referencia central porque OISST diario comienza en 1981.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="forecast-section section-shell" id="pronosticos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mirada hacia adelante</p>
            <h2>Pronóstico a 3, 6 y 9 meses</h2>
          </div>
          <p className="section-intro">
            Se muestran únicamente probabilidades publicadas. Cuando la fuente
            ofrece una conclusión cualitativa, no inventamos un porcentaje.
          </p>
        </div>
        <div className="forecast-grid">
          <article className="forecast-card">
            <span className="horizon">3 meses</span>
            <div className="forecast-score">
              <strong>97%</strong>
              <span>persistencia</span>
            </div>
            <div className="probability-track">
              <span style={{ width: "97%" }} />
            </div>
            <h3>El Niño continúa</h3>
            <p>NOAA estima una probabilidad muy alta de persistencia hasta comienzos de 2027.</p>
            <a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc_Sp.shtml" target="_blank" rel="noreferrer">
              Fuente NOAA <span aria-hidden="true">↗</span>
            </a>
          </article>
          <article className="forecast-card featured">
            <span className="horizon">6 meses</span>
            <div className="forecast-score">
              <strong>81%</strong>
              <span>muy fuerte</span>
            </div>
            <div className="probability-track">
              <span style={{ width: "81%" }} />
            </div>
            <h3>Pico hacia fin de año</h3>
            <p>Probabilidad publicada para una intensidad muy fuerte durante octubre–diciembre de 2026.</p>
            <a href="https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/strengths/" target="_blank" rel="noreferrer">
              Fuente NOAA <span aria-hidden="true">↗</span>
            </a>
          </article>
          <article className="forecast-card qualitative">
            <span className="horizon">9 meses</span>
            <div className="forecast-score">
              <strong>Probable</strong>
              <span>sin % único</span>
            </div>
            <div className="qualitative-track">
              <span />
            </div>
            <h3>Hasta abril de 2027</h3>
            <p>ENFEN considera probable que el Niño Costero continúe hasta abril de 2027.</p>
            <a href={live.enfen.url} target="_blank" rel="noreferrer">
              Fuente ENFEN <span aria-hidden="true">↗</span>
            </a>
          </article>
        </div>
        <p className="chart-explainer">
          La intensidad del índice oceánico no determina por sí sola la magnitud
          de los impactos en cada región del Perú.
        </p>
      </section>

      <section className="regions-section" id="regiones">
        <div className="section-shell region-layout">
          <div className="region-copy">
            <p className="eyebrow">Sin mapa confuso</p>
            <h2>Consulta por departamento</h2>
            <p>
              El selector traduce el escenario nacional a una lectura regional.
              No reemplaza un aviso meteorológico local ni atribuye cada evento
              al ENSO.
            </p>
            <label htmlFor="department">Departamento</label>
            <div className="select-wrap">
              <select
                id="department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                {departments.map(([name]) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </div>
            <a href="https://www.senamhi.gob.pe/?p=pronostico-climatico" target="_blank" rel="noreferrer">
              Consultar pronóstico local SENAMHI <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="region-result" aria-live="polite">
            <div className="region-result-head">
              <div>
                <span>{selectedRegion.zone}</span>
                <h3>{department}</h3>
              </div>
              <span className="source-badge">ENFEN · escenario regional</span>
            </div>
            <div className="region-metrics">
              <article>
                <span>Lluvia</span>
                <p>{selectedRegion.rain}</p>
              </article>
              <article>
                <span>Temperatura</span>
                <p>{selectedRegion.temperature}</p>
              </article>
              <article>
                <span>Confianza</span>
                <p>{selectedRegion.confidence}</p>
              </article>
            </div>
            <p className="region-note">
              Lectura corta del último escenario disponible. Próxima capa:
              acumulados CHIRPS/IMERG y estaciones SENAMHI.
            </p>
          </div>
        </div>
      </section>

      <section className="timeline-section section-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Decisiones oficiales</p>
            <h2>Línea de tiempo ENFEN</h2>
          </div>
          <p className="section-intro">
            Cada actualización mantiene su enlace original para verificar el
            contexto y la fecha de publicación.
          </p>
        </div>
        <ol className="timeline">
          {timeline.map((item, index) => (
            <li key={item.number}>
              <span className="timeline-index">{String(index + 1).padStart(2, "0")}</span>
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
              <h2>Fuentes y frecuencia</h2>
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
                  <i className={`status-dot ${source.status === "current" ? "green" : "amber"}`} />
                  {source.name}
                </strong>
                <span role="cell">{source.detail}</span>
                <span role="cell">{source.cadence}</span>
                <a role="cell" href={source.href} target="_blank" rel="noreferrer">
                  Abrir <span aria-hidden="true">↗</span>
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
            <h3>Jerarquía</h3>
            <p>ENFEN define el estado costero; NOAA describe el ENSO global.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Comparabilidad</h3>
            <p>Fechas, unidades y periodos se muestran antes de comparar índices.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Frescura</h3>
            <p>Si una fuente falla se conserva el último dato y se cambia el semáforo.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Incertidumbre</h3>
            <p>No convertimos una conclusión cualitativa en un porcentaje inventado.</p>
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
        </p>
        <a href="#inicio">Volver arriba ↑</a>
      </footer>
    </main>
  );
}
