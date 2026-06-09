import { ImageResponse } from "next/og";

export const alt = "AuthAI — auth for AI builders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#171717";
const SUBTLE = "#737373";
const ACCENT = "#1d4dff";
const BG = "#ffffff";

/**
 * Fetches a Geist TTF binary that Satori can parse. Satori uses
 * opentype.js, which supports TTF/OTF/WOFF but NOT WOFF2 — Google
 * Fonts now serves only WOFF2 even with a downgraded User-Agent,
 * so we go to jsdelivr's mirror of Vercel's `geist` npm package,
 * which ships the raw .ttf files alongside the woff2.
 */
async function loadGeist(file: "Geist-Regular.ttf" | "Geist-SemiBold.ttf"): Promise<ArrayBuffer> {
  const url = `https://cdn.jsdelivr.net/npm/geist@latest/dist/fonts/geist-sans/${file}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[opengraph-image] failed to fetch ${file}: ${res.status}`);
  }
  return res.arrayBuffer();
}

/**
 * Aurora + grid backdrop mirroring the landing page hero
 * (.landing::before + .landing::after in globals.css). Satori has
 * no filter:blur, so softness comes from generous radial falloff
 * + low alpha. The bottom white wash starts at 30% so the headline
 * lands on near-white for legibility.
 */
export default async function OpengraphImage() {
  const [geist400, geist600] = await Promise.all([
    loadGeist("Geist-Regular.ttf"),
    loadGeist("Geist-SemiBold.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          display: "flex",
          position: "relative",
          fontFamily: "Geist",
          color: INK,
          overflow: "hidden",
        }}
      >
        {/* Aurora — soft lime blob upper-left, restrained alpha */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: -260,
            width: 820,
            height: 820,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at center, rgba(57, 255, 20, 0.22), rgba(57, 255, 20, 0) 65%)",
          }}
        />
        {/* Aurora — soft green blob upper-right */}
        <div
          style={{
            position: "absolute",
            top: -220,
            right: -260,
            width: 780,
            height: 780,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at center, rgba(0, 255, 136, 0.18), rgba(0, 255, 136, 0) 68%)",
          }}
        />
        {/* Grid overlay — vertical lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, rgba(0, 0, 0, 0) 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        {/* Grid overlay — horizontal lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, rgba(0, 0, 0, 0) 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        {/* Bottom wash — fades the upper half's color out so the headline
            lands on near-white. Earlier ramp (30%) than the landing's mask. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.55) 38%, rgba(255, 255, 255, 0.96) 75%, rgba(255, 255, 255, 1) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "72px 88px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ position: "relative", display: "flex", width: 96, height: 96 }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 40,
                  height: 40,
                  background: INK,
                  borderRadius: 8,
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 56,
                  top: 56,
                  width: 40,
                  height: 40,
                  background: INK,
                  borderRadius: 8,
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 28,
                  top: 28,
                  width: 40,
                  height: 40,
                  border: `6px solid ${INK}`,
                  borderRadius: 8,
                  boxSizing: "border-box",
                  display: "flex",
                }}
              />
            </div>
            <span style={{ fontSize: 56, fontWeight: 600, letterSpacing: -1 }}>AuthAI</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <span
              style={{
                fontSize: 104,
                fontWeight: 600,
                letterSpacing: -3,
                lineHeight: 1.02,
                maxWidth: 980,
                display: "flex",
              }}
            >
              Auth for AI builders.
            </span>
            <span
              style={{
                fontSize: 36,
                color: SUBTLE,
                lineHeight: 1.3,
                maxWidth: 980,
                display: "flex",
              }}
            >
              Your users sign in once with their AI subscription. Every model call lands on their plan.
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <span style={{ fontSize: 30, color: SUBTLE, display: "flex" }}>authai.io</span>
            <span style={{ fontSize: 26, color: ACCENT, fontWeight: 500, display: "flex" }}>
              Open source · Self-hostable
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: geist400, weight: 400, style: "normal" },
        { name: "Geist", data: geist600, weight: 600, style: "normal" },
      ],
    },
  );
}
