import { useEffect, useMemo, useState } from "react";
import { renderMarkdown } from "./markdown.js";
import introductionMd from "../../../docs/introduction.md?raw";
import installationMd from "../../../docs/installation.md?raw";
import integrationMd from "../../../docs/integration.md?raw";
import securityMd from "../../../docs/security.md?raw";

type Mode = "light" | "dark";

type DocId = "introduction" | "installation" | "integration" | "security";

const SECTIONS: { id: DocId; title: string; subtitle: string }[] = [
  { id: "introduction", title: "Introduction", subtitle: "What AuthAI is and why" },
  { id: "installation", title: "Installation", subtitle: "Self-host the relay" },
  { id: "integration", title: "Integration", subtitle: "Wire the SDKs into your app" },
  { id: "security", title: "Security", subtitle: "Cryptography & threat model" },
];

const SOURCES: Record<DocId, string> = {
  introduction: introductionMd,
  installation: installationMd,
  integration: integrationMd,
  security: securityMd,
};

function isDocId(value: string): value is DocId {
  return (
    value === "introduction" ||
    value === "installation" ||
    value === "integration" ||
    value === "security"
  );
}

export function Docs({
  current,
  mode,
  setMode,
}: {
  current: string;
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  const docId: DocId = isDocId(current) ? current : "introduction";
  const toggle = () => setMode(mode === "dark" ? "light" : "dark");
  const source = SOURCES[docId];
  const html = useMemo(() => renderMarkdown(source), [source]);

  const [tocLinks, setTocLinks] = useState<Array<{ id: string; text: string }>>([]);

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const headings = Array.from(doc.querySelectorAll("h2"));
    setTocLinks(
      headings.map((h) => ({
        id: slugify(h.textContent ?? ""),
        text: h.textContent ?? "",
      })),
    );
  }, [html]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [docId]);

  const annotatedHtml = useMemo(() => addHeadingIds(html), [html]);

  return (
    <div className="docs" data-theme={mode}>
      <header className="docs-topbar">
        <a href="#" className="docs-brand">
          <span className="landing-brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2 L22 20 L2 20 Z" />
            </svg>
          </span>
          AuthAI
          <span className="docs-brand-divider" aria-hidden="true">/</span>
          <span className="docs-brand-section">Docs</span>
        </a>
        <nav className="docs-topbar-nav">
          <a href="https://github.com/" target="_blank" rel="noreferrer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            GitHub
          </a>
          <a href="#/docs/introduction" data-active="true">Docs</a>
          <a href="#/security">Security</a>
          <button
            type="button"
            className="docs-theme-toggle"
            onClick={toggle}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {mode === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="2" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
                <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
                <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </nav>
      </header>

      <div className="docs-shell">
        <aside className="docs-sidebar">
          <nav>
            <p className="docs-sidebar-label">Documentation</p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#/docs/${s.id}`}
                data-active={s.id === docId}
                className="docs-sidebar-link"
              >
                <span className="docs-sidebar-title">{s.title}</span>
                <span className="docs-sidebar-subtitle">{s.subtitle}</span>
              </a>
            ))}
          </nav>

          {tocLinks.length > 0 && (
            <div className="docs-sidebar-toc">
              <p className="docs-sidebar-label">On this page</p>
              {tocLinks.map((t) => (
                <a key={t.id} href={`#/docs/${docId}#${t.id}`} className="docs-toc-link">
                  {t.text}
                </a>
              ))}
            </div>
          )}
        </aside>

        <main className="docs-content">
          <article
            className="prose"
            dangerouslySetInnerHTML={{ __html: annotatedHtml }}
          />
        </main>
      </div>
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function addHeadingIds(html: string): string {
  return html.replace(/<h2>(.*?)<\/h2>/g, (_match, inner) => {
    const text = (inner as string).replace(/<[^>]+>/g, "");
    return `<h2 id="${slugify(text)}">${inner}</h2>`;
  });
}
