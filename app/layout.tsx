import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "Quipu Insights | Sostenibilidad El Niño Perú";
const description =
  "Dashboard abierto sobre El Niño Costero en Perú: estado ENFEN, ENSO global, ríos, dengue, anchoveta, agro, pronósticos e impactos económicos explicados.";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://quipuinsights.github.io/quipu-insights-el-nino-peru/",
  ),
  title,
  description,
  applicationName: "Quipu Insights",
  openGraph: {
    type: "website",
    locale: "es_PE",
    title,
    description,
    siteName: "Quipu Insights",
    images: [
      {
        url: "og-impactos.png",
        width: 1536,
        height: 1024,
        alt: "Quipu Insights: Sostenibilidad El Niño Perú",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["og-impactos.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#071c24",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "Quipu Insights | Sostenibilidad El Niño Perú";
const description =
  "Indicador y observatorio abierto para entender El Niño Costero en Perú: estado oficial, anomalía del mar, mapa, impactos y pronósticos explicados.";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://quipuinsights.github.io/quipu-insights-el-nino-peru/",
  ),
  title,
  description,
  applicationName: "Quipu Insights",
  openGraph: {
    type: "website",
    locale: "es_PE",
    title,
    description,
    siteName: "Quipu Insights",
    images: [
      {
        url: "og-sostenibilidad.png",
        width: 1536,
        height: 1024,
        alt: "Quipu Insights: Sostenibilidad El Niño Perú",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["og-sostenibilidad.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#071c24",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
