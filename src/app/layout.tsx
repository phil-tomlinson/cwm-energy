import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import DevModal from "@/components/DevModal";
import A11yProvider from "@/components/A11yProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://cwmenergy.ca"),
  title: "CWM Energy — Understand Your Energy",
  description:
    "Free tools to help Canadians understand their home energy use, reduce their carbon footprint, and find the most cost-effective upgrades.",
  icons: {
    icon:     [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple:    "/favicon.svg",
  },
  openGraph: {
    title: "CWM Energy — Understand Your Energy",
    description:
      "Free, science-based tools to help Canadians cut energy bills and carbon footprint. No tape measure needed.",
    url: "https://cwmenergy.ca",
    siteName: "CWM Energy",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CWM Energy — Understand Your Energy",
    description:
      "Free, science-based tools to help Canadians cut energy bills and carbon footprint.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <A11yProvider>
          {/* Skip-to-content: first focusable element — keyboard/AT users jump past nav */}
          <a href="#main-content" className="skip-to-content">
            Skip to main content
          </a>
          <DevModal />
          <Nav />
          <main id="main-content" className="flex-1" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </A11yProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
