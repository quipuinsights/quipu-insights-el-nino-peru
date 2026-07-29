import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "Quipu Insights | El Niño Perú: del océano a los impactos";
const description =
  "Observatorio abierto del Niño Costero y sus impactos en Perú: océano, lluvia, ríos, salud, agro y pesca con fuentes oficiales.";

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
        width: 1728,
        height: 910,
        alt: "Quipu Insights: El Niño Perú, del océano a los impactos",
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
