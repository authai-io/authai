import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuthAI Cloud — Sign in with ChatGPT for your app",
  description:
    "One command to add Sign-in-with-ChatGPT to your app. Free, hosted, open-source. Users pay for AI through their own subscription.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
