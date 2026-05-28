import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Lato } from "next/font/google";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import Providers from "./providers";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: "Rent vs Buy",
  description:
    "A simple and sensible calculator for comparing renting vs owning a home.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const FAVICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="90">♌</text></svg>';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps} className={lato.variable}>
      <head>
        <ColorSchemeScript
          defaultColorScheme="auto"
          localStorageKey="rent-vs-buy-color-scheme"
        />
        <link rel="icon" type="image/svg+xml" href={FAVICON} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
