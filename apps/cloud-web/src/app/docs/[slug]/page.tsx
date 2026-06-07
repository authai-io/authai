import Link from "next/link";
import { notFound } from "next/navigation";
import { DOCS } from "@/lib/generated/reference-md";
import { renderMarkdown, addHeadingIds, extractToc } from "@/lib/markdown";
import { DocsShell } from "../shell";

/**
 * Each docs page lives at /docs/<slug>. Slugs are the keys of the
 * baked DOCS map (see scripts/bake-docs.mjs): introduction,
 * installation, integration, security, reference.
 *
 * The page is a Server Component — markdown rendering happens during
 * the render itself, no client JS needed.
 *
 * Theme toggle + sidebar nav highlight are handled inside DocsShell,
 * which is a client component (state for the toggle + active-link).
 */

const SECTIONS = [
  { id: "introduction", title: "Introduction", subtitle: "What AuthAI is and why" },
  { id: "installation", title: "Installation", subtitle: "Self-host the relay" },
  { id: "integration",  title: "Integration",  subtitle: "Wire the SDKs into your app" },
  { id: "security",     title: "Security",     subtitle: "Cryptography & threat model" },
  { id: "reference",    title: "Reference",    subtitle: "How it works under the hood" },
] as const;

export function generateStaticParams() {
  return SECTIONS.map((s) => ({ slug: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = SECTIONS.find((s) => s.id === slug);
  if (!section) return {};
  return {
    title: `AuthAI · ${section.title}`,
    description: section.subtitle,
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const source = DOCS[slug];
  if (!source) notFound();

  const rawHtml = renderMarkdown(source);
  const html = addHeadingIds(rawHtml);
  const toc = extractToc(html);

  return (
    <DocsShell sections={SECTIONS} currentSlug={slug} toc={toc}>
      <article
        className="prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </DocsShell>
  );
}
