import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import introductionMd from "../../../docs/introduction.md?raw";
import installationMd from "../../../docs/installation.md?raw";
import integrationMd from "../../../docs/integration.md?raw";
import securityMd from "../../../docs/security.md?raw";

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

export function Docs({ current }: { current: string }) {
  const docId: DocId = isDocId(current) ? current : "introduction";
  const source = SOURCES[docId];
  const html = useMemo(() => {
    marked.setOptions({ gfm: true, breaks: false });
    return marked.parse(source) as string;
  }, [source]);

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
    <div className="docs">
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
          <a href="#">Home</a>
          <a href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a>
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
