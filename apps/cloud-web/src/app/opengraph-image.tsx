import { ImageResponse } from "next/og";

export const alt =
  "AuthAI: Build AI products without the AI bill. Sign in with ChatGPT, Grok, or Copilot. Run: npx authai-cloud init.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dark-mode tokens. Background sits in the "lifted gunmetal" range, well
// above pure-black, with a slight cool tint so the brand-blue accent reads
// harmoniously. Aurora and a center glow give the canvas depth instead of
// a flat void. Terminal card is lifted further (about +8 lightness) so it
// floats off the background.
const BG = "#181b22";
const WASH_RGB = "24, 27, 34";
const FG = "#ededed";
const SUBTLE = "#a3a3a3";
const TERMINAL_BG = "#22262f";
const TERMINAL_BORDER = "#323845";
const RADIUS = 10;
const MARK_RADIUS = 4;

/**
 * Fetches a Geist TTF binary that Satori can parse. Satori uses
 * opentype.js, which supports TTF/OTF/WOFF but NOT WOFF2 — Google Fonts
 * now serves only WOFF2 even with a downgraded UA, so we pull from
 * jsdelivr's mirror of Vercel's `geist` npm package, which ships raw
 * .ttf files alongside the woff2.
 */
async function loadGeist(
  pkg: "geist-sans" | "geist-mono",
  file: string,
): Promise<ArrayBuffer> {
  const url = `https://cdn.jsdelivr.net/npm/geist@latest/dist/fonts/${pkg}/${file}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[opengraph-image] failed to fetch ${file}: ${res.status}`);
  }
  return res.arrayBuffer();
}

/**
 * OG image. 1200x630, ~50-130 KB rendered. Must read at 200px thumbnail
 * (iMessage / Twitter inline preview), so the headline carries the
 * composition.
 *
 * Design tenets:
 *   - Dark canvas with brand-blue aurora upper-left and cyan upper-right.
 *     Stands out in a feed full of white dev-tool OGs (Vercel, Linear,
 *     Resend, Cursor, Bolt — all light).
 *   - Headline matches the landing-page H1 verbatim so click-through
 *     reinforces (tweet -> preview -> landing all say the same thing).
 *   - Real `npx authai-cloud init` terminal card answers "how do I try
 *     this" before the click. White text on a lifted dark surface.
 *   - Subtitle in one line so the layout breathes; the "your users pay
 *     for inference" idea is fully carried by the headline.
 *   - Brand mark from landing-client.tsx for visual consistency.
 *   - No grid backdrop, no corner decoration strip (banned per
 *     design-taste-frontend §9.F).
 *   - Em-dash banned in user-visible strings per §9.G.
 */
export default async function OpengraphImage() {
  const [geist400, geist600, geistMono500] = await Promise.all([
    loadGeist("geist-sans", "Geist-Regular.ttf"),
    loadGeist("geist-sans", "Geist-SemiBold.ttf"),
    loadGeist("geist-mono", "GeistMono-Medium.ttf"),
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
          color: FG,
          overflow: "hidden",
        }}
      >
        {/* Aurora: brand-blue blob upper-left. Higher alpha than the
            light variants because dark canvas absorbs colored gradient. */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: -260,
            width: 820,
            height: 820,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at center, rgba(56, 119, 255, 0.42), rgba(56, 119, 255, 0) 62%)",
          }}
        />
        {/* Aurora: cyan blob upper-right. Pairs with brand blue for depth. */}
        <div
          style={{
            position: "absolute",
            top: -220,
            right: -260,
            width: 780,
            height: 780,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at center, rgba(0, 200, 255, 0.30), rgba(0, 200, 255, 0) 65%)",
          }}
        />
        {/* Center radial brand-blue glow. Adds an air-pocket of light
            through the middle so the canvas doesn't read as a flat panel. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "radial-gradient(ellipse at 50% 35%, rgba(29, 77, 255, 0.16), rgba(29, 77, 255, 0) 55%)",
          }}
        />
        {/* Bottom wash: fades aurora out so the terminal card and footer
            URL land on a clean tone. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: `linear-gradient(to bottom, rgba(${WASH_RGB}, 0) 0%, rgba(${WASH_RGB}, 0.40) 42%, rgba(${WASH_RGB}, 0.88) 78%, rgba(${WASH_RGB}, 1) 100%)`,
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
            padding: "64px 80px",
          }}
        >
          {/* Brand mark + wordmark (mirrors landing-client.tsx SVG). */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative", display: "flex", width: 56, height: 56 }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 24,
                  height: 24,
                  background: FG,
                  borderRadius: MARK_RADIUS,
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 32,
                  top: 32,
                  width: 24,
                  height: 24,
                  background: FG,
                  borderRadius: MARK_RADIUS,
                  display: "flex",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  top: 16,
                  width: 24,
                  height: 24,
                  border: `4px solid ${FG}`,
                  borderRadius: MARK_RADIUS,
                  boxSizing: "border-box",
                  display: "flex",
                }}
              />
            </div>
            <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: -0.8, color: FG }}>
              AuthAI
            </span>
          </div>

          {/* Headline + subtitle. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              marginTop: 48,
            }}
          >
            <span
              style={{
                fontSize: 96,
                fontWeight: 600,
                letterSpacing: -3.2,
                lineHeight: 1.02,
                maxWidth: 1040,
                color: FG,
                display: "flex",
              }}
            >
              Build AI products without the AI bill.
            </span>
            <span
              style={{
                fontSize: 32,
                color: SUBTLE,
                lineHeight: 1.3,
                maxWidth: 1040,
                display: "flex",
              }}
            >
              Sign in with ChatGPT, Grok, or Copilot.
            </span>
          </div>

          {/* Bottom row: terminal anchored left, URL anchored right.
              `alignItems: center` puts the URL on the terminal card's
              midline so the two share a horizontal axis. */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "auto",
              paddingTop: 48,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                background: TERMINAL_BG,
                borderRadius: RADIUS,
                padding: "22px 28px",
                fontFamily: "Geist Mono",
                border: `1px solid ${TERMINAL_BORDER}`,
                boxShadow: "0 14px 40px rgba(0, 0, 0, 0.4)",
              }}
            >
              <span style={{ color: SUBTLE, fontSize: 28, fontWeight: 500 }}>$</span>
              <span style={{ color: FG, fontSize: 28, fontWeight: 500 }}>
                npx authai-cloud init
              </span>
            </div>
            <span style={{ fontSize: 26, color: SUBTLE, display: "flex" }}>
              authai.io
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
        { name: "Geist Mono", data: geistMono500, weight: 500, style: "normal" },
      ],
    },
  );
}
