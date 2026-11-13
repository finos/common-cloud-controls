/**
 * Line-oriented HCL syntax highlighter producing HTML for the editor's
 * backdrop layer. Class names are looked up in the CSS module passed in.
 */

const KEYWORDS = new Set(["resource", "data", "provider", "variable", "locals", "output", "module", "terraform"]);
const LITERALS = new Set(["true", "false", "null"]);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type TokenClass = "comment" | "string" | "interp" | "number" | "keyword" | "literal" | "attr" | "block" | "ref";

export function highlightHcl(src: string, cls: Record<TokenClass, string>): string {
  const span = (c: TokenClass, text: string) => `<span class="${cls[c]}">${esc(text)}</span>`;
  const out: string[] = [];
  let heredoc: string | null = null;
  let inBlockComment = false;

  for (const line of src.split("\n")) {
    if (heredoc !== null) {
      out.push(span("string", line));
      if (line.trim() === heredoc) heredoc = null;
      continue;
    }
    let html = "";
    let i = 0;
    const trimmedStart = line.length - line.trimStart().length;
    while (i < line.length) {
      const rest = line.slice(i);
      if (inBlockComment) {
        const end = rest.indexOf("*/");
        const piece = end < 0 ? rest : rest.slice(0, end + 2);
        html += span("comment", piece);
        i += piece.length;
        if (end >= 0) inBlockComment = false;
        continue;
      }
      let m: RegExpExecArray | null;
      if ((m = /^(#|\/\/).*/.exec(rest))) {
        html += span("comment", m[0]);
        i += m[0].length;
        continue;
      }
      if (rest.startsWith("/*")) {
        inBlockComment = true;
        continue;
      }
      if ((m = /^<<-?([A-Za-z_]\w*)\s*$/.exec(rest))) {
        heredoc = m[1];
        html += span("string", m[0]);
        i += m[0].length;
        continue;
      }
      if (rest[0] === '"') {
        // String with ${...} interpolations highlighted separately.
        let j = 1;
        let piece = '"';
        let buf = "";
        while (j < rest.length && rest[j] !== '"') {
          if (rest[j] === "\\") {
            buf += rest.slice(j, j + 2);
            j += 2;
            continue;
          }
          if ((rest[j] === "$" || rest[j] === "%") && rest[j + 1] === "{") {
            let depth = 0;
            let k = j + 1;
            for (; k < rest.length; k++) {
              if (rest[k] === "{") depth++;
              else if (rest[k] === "}" && --depth === 0) break;
            }
            piece += esc(buf);
            buf = "";
            piece += `</span>${span("interp", rest.slice(j, k + 1))}<span class="${cls.string}">`;
            j = k + 1;
            continue;
          }
          buf += rest[j];
          j++;
        }
        const closed = rest[j] === '"';
        html += `<span class="${cls.string}">${piece.startsWith('"') ? "&quot;" + piece.slice(1) : piece}${esc(buf)}${closed ? "&quot;" : ""}</span>`;
        i += j + (closed ? 1 : 0);
        continue;
      }
      if ((m = /^\d+(\.\d+)?/.exec(rest))) {
        html += span("number", m[0]);
        i += m[0].length;
        continue;
      }
      if ((m = /^[A-Za-z_][\w-]*(\.[\w-]+|\[\d+\])*/.exec(rest))) {
        const word = m[0];
        const after = line.slice(i + word.length);
        if (i === trimmedStart && KEYWORDS.has(word) && /^\s*("|\{|\w)/.test(after)) html += span("keyword", word);
        else if (LITERALS.has(word)) html += span("literal", word);
        else if (/^\s*=(?!=)/.test(after) || /^\s*:/.test(after)) html += span("attr", word);
        else if (i === trimmedStart && /^\s*(\{|")/.test(after)) html += span("block", word);
        else if (word.includes(".")) html += span("ref", word);
        else html += esc(word);
        i += word.length;
        continue;
      }
      html += esc(rest[0]);
      i++;
    }
    out.push(html);
  }
  return out.join("\n");
}
