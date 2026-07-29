# Quipu Insights · Sostenibilidad El Niño Perú

Dashboard público sobre el Niño Costero en Perú y el ENSO global.

Sitio público: https://quipuinsights.github.io/quipu-insights-el-nino-peru/

## Qué incluye

- Estado oficial ENFEN y condición ENSO global.
- Índices Niño 1+2, Niño 3.4, ONI e ICEN.
- Historia NOAA desde 1950/1981.
- Pronósticos a 3, 6 y 9 meses.
- Selector de departamento sin mapa.
- Línea de tiempo de comunicados ENFEN.
- Descargas CSV y JSON.
- Semáforos de frescura y enlaces directos a cada fuente.

## Actualización automática

GitHub Actions consulta las fuentes abiertas de NOAA y ENFEN todos los días a
las 17:00, hora de Lima. Si una fuente falla, se mantiene el último respaldo y
el dashboard identifica el modo de datos. La actualización también puede
ejecutarse manualmente desde la pestaña **Actions**.

El sitio no utiliza ChatGPT durante las visitas.
