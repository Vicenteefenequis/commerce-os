import type { ReactNode } from "react";
import { Archivo, JetBrains_Mono } from "next/font/google";

// theme.css is loaded globally via app/globals.css's @import (see theme.css's
// header comment for why); this layout only applies the storefront-theme
// scope class and the self-hosted font variables.

/*
 * Self-hosted via next/font (design.md D2): no runtime request to
 * fonts.googleapis.com/fonts.gstatic.com, unlike the raw <link> the design
 * doc's mockup uses (fine for a static mockup, wrong for production).
 */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--sf-font-archivo",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--sf-font-jetbrains-mono",
});

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`storefront-theme ${archivo.variable} ${jetBrainsMono.variable}`}>
      {children}
    </div>
  );
}
