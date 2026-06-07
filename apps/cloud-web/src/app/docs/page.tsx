import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";

// Pull docs/reference.md from the monorepo at build time. Renders as raw
// pre-formatted markdown — readable enough without a markdown lib, and we
// avoid pulling in a dependency just for one page.
async function loadReference(): Promise<string> {
  // CWD at build time is apps/cloud-web/; reference.md is at ../../docs/.
  try {
    return await readFile(join(process.cwd(), "..", "..", "docs", "reference.md"), "utf8");
  } catch {
    return "(reference.md not found — see https://github.com/riccardoio/authai/blob/main/docs/reference.md)";
  }
}

export default async function DocsPage() {
  const md = await loadReference();
  return (
    <>
      <nav className="top">
        <div>
          <strong>AuthAI Cloud</strong>
          <span className="muted"> · docs</span>
        </div>
        <div>
          <Link href="/">home</Link>
          <Link href="/dashboard">dashboard</Link>
        </div>
      </nav>
      <main>
        <p className="muted">
          The canonical version is at{" "}
          <a href="https://github.com/riccardoio/authai/blob/main/docs/reference.md">
            github.com/riccardoio/authai/blob/main/docs/reference.md
          </a>
          .
        </p>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          <code>{md}</code>
        </pre>
      </main>
    </>
  );
}
