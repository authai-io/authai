import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import bash from "highlight.js/lib/languages/bash";
import jsonLang from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import xml from "highlight.js/lib/languages/xml";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("jsx", javascript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("json", jsonLang);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);

let configured = false;

export function renderMarkdown(source: string): string {
  if (!configured) {
    marked.use(
      markedHighlight({
        langPrefix: "hljs language-",
        highlight(code, lang) {
          const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
          try {
            return hljs.highlight(code, { language, ignoreIllegals: true }).value;
          } catch {
            return code;
          }
        },
      }),
    );
    marked.setOptions({ gfm: true, breaks: false });
    configured = true;
  }
  return marked.parse(source) as string;
}
