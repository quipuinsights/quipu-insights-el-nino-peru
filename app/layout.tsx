import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "Quipu Insights | Sostenibilidad El Niño Perú";
const description =
  "Dashboard abierto sobre el Niño Costero en Perú y el ENSO global, con indicadores, pronósticos, trazabilidad y fuentes oficiales.";

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
        url: "og.png",
        width: 1730,
        height: 909,
        alt: "Quipu Insights: Sostenibilidad El Niño Perú",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["og.png"],
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
