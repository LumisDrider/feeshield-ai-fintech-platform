import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

/** Runs before first paint so the stored theme applies without a flash.
 *  Kept client-side so the landing page stays statically prerendered. */
const THEME_INIT = `(function(){try{var s=localStorage.getItem('feeshield-theme');var d=s==='dark'||((s!=='light')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export const metadata: Metadata = {
  title: { default: "FeeShield AI — Financial agreement intelligence", template: "%s · FeeShield AI" },
  description: "Evidence-linked hidden fee detection, explainable risk analysis, and true-cost estimates for financial agreements.",
};

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f3f6f9" }, { media: "(prefers-color-scheme: dark)", color: "#060b11" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /></head>
      <body>
        <ThemeProvider initialPreference="system">{children}</ThemeProvider>
      </body>
    </html>
  );
}
