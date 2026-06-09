import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://authai.io";
// Title kept to ~55-60 chars (SERP sweet spot); description ~120 chars so it
// survives both Google's ~160-char SERP cut and social previews' ~125-char cut
// without truncating the punchline.
const SITE_TITLE = "AuthAI — sign in with ChatGPT, Grok, or Copilot subscription";
const SITE_DESCRIPTION =
  "Build AI products without the AI bill. Users sign in with their ChatGPT, Grok, or Copilot subscription.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
    types: { "text/markdown": "/llms.txt" },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "AuthAI",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Geist + Geist Mono via Google Fonts. The example-react demo loads
          these the same way; preconnect saves one round-trip on first paint.
          next/font/google would self-host the woff2s, but for parity with
          the existing demo and zero build-cost we keep the CDN link.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
