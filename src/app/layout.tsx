import type { Metadata } from "next";
import "@fontsource-variable/overpass";
import "@fontsource-variable/source-serif-4/wght-italic.css";
import "./globals.css";
import SiteNav from "@/components/cwm/SiteNav";
import SiteFooter from "@/components/cwm/SiteFooter";
import DevModal from "@/components/DevModal";
import A11yProvider from "@/components/A11yProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://cwmenergy.ca"),
  title: "CWM Energy: every tonne you've already cut counts",
  description:
    "A free, open-source carbon tracker for Canadians. Put solar, a heat pump or an EV on your timeline and see the tonnes and dollars each one has saved since.",
  icons: {
    icon:     [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple:    "/favicon.svg",
  },
  openGraph: {
    title: "CWM Energy: every tonne you've already cut counts",
    description:
      "Free and open source. See the tonnes and dollars your solar, heat pump or EV has saved, counted against your province's grid in every year.",
    url: "https://cwmenergy.ca",
    siteName: "CWM Energy",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CWM Energy: every tonne you've already cut counts",
    description: "A free, open-source carbon tracker for Canadians.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className="h-full antialiased" data-theme="light" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <A11yProvider>
          <a href="#main-content" className="skip-to-content">
            Skip to main content
          </a>
          <DevModal />
          <SiteNav />
          <main id="main-content" className="flex-1" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </A11yProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
