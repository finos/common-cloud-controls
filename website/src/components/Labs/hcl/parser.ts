/**
 * A small, dependency-free HCL2 parser for the Labs playground.
 *
 * It understands the subset of HCL that Terraform configurations use in
 * practice: attributes, labelled blocks, comments, strings (with ${}
 * interpolation kept verbatim), heredocs, numbers, booleans, null, lists,
 * objects, references (a.b.c[0]), and function calls. Anything more complex
 * (operators, conditionals, for-expressions, splats) is kept as a `raw`
 * value holding the original source text, so evaluation can still see it
 * without the parser needing a full expression evaluator.
 */

export type HclValue =
  | { t: "str"; v: string; interpolated: boolean; line: number; start: number; end: number }
  | { t: "num"; v: number; line: number; start: number; end: number }
  | { t: "bool"; v: boolean; line: number; start: number; end: number }
  | { t: "null"; line: number; start: number; end: number }
  | { t: "list"; items: HclValue[]; line: number; start: number; end: number }
  | { t: "obj"; entries: Record<string, HclValue>; line: number; start: number; end: number }
  | { t: "ref"; path: string; line: number; start: number; end: number }
  | { t: "call"; name: string; args: HclValue[]; line: number; start: number; end: number }
  | { t: "raw"; text: string; line: number; start: number; end: number };

export interface HclAttribute {
  name: string;
  value: HclValue;
  line: number;
}

export interface HclBlock {
  type: string;
  labels: string[];
  attrs: Record<string, HclAttribute>;
  blocks: HclBlock[];
  line: number;
  endLine: number;
}

export interface HclFile {
  attrs: Record<string, HclAttribute>;
  blocks: HclBlock[];
}

export class HclSyntaxError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`Line ${line}:${column}: ${message}`);
    this.name = "HclSyntaxError";
  }
}

// ── Tokenizer ─────────────────────────────────────────────────────────────────

type TokKind = "nl" | "ident" | "num" | "str" | "heredoc" | "punct" | "eof";

interface Token {
  kind: TokKind;
  text: string; // identifier/punct text, decoded string value, heredoc body
  interpolated?: boolean;
  line: number;
  col: number;
  start: number;
  end: number;
}

const PUNCT3 = ["..."];
const PUNCT2 = ["==", "!=", "<=", ">=", "&&", "||", "=>", "<<"];
const PUNCT1 = "{}[]()=,:.?!<>+-*/%";

function tokenize(src: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;

  const err = (msg: string, at = i): never => {
    throw new HclSyntaxError(msg, line, at - lineStart + 1);
  };
  const push = (kind: TokKind, text: string, start: number, extra: Partial<Token> = {}) =>
    toks.push({ kind, text, line: extra.line ?? line, col: start - lineStart + 1, start, end: i, ...extra });

  // Skips a ${ ... } or %{ ... } template sequence starting at `i` (pointing at '{').
  const skipTemplateExpr = () => {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          i++;
          return;
        }
      } else if (c === '"') {
        i++;
        readQuoted(); // nested string inside interpolation
        continue;
      } else if (c === "\n") {
        line++;
        lineStart = i + 1;
      }
      i++;
    }
    err("Unterminated template interpolation");
  };

  // Reads a quoted string body; `i` points just after the opening quote.
  const readQuoted = (): { value: string; interpolated: boolean } => {
    let out = "";
    let interpolated = false;
    while (i < src.length) {
      const c = src[i];
      if (c === '"') {
        i++;
        return { value: out, interpolated };
      }
      if (c === "\n") err("Unterminated string (strings cannot span lines)");
      if (c === "\\") {
        const n = src[i + 1];
        const map: Record<string, string> = { n: "\n", t: "\t", r: "\r", '"': '"', "\\": "\\" };
        out += map[n] ?? n;
        i += 2;
        continue;
      }
      if ((c === "$" || c === "%") && src[i + 1] === "{") {
        if (src[i - 1] === c && src[i - 2] !== c) {
          // $${ escape — literal
          out = out.slice(0, -1) + c;
          i++;
          continue;
        }
        const s = i;
        i++;
        skipTemplateExpr();
        out += src.slice(s, i);
        interpolated = true;
        continue;
      }
      out += c;
      i++;
    }
    return err("Unterminated string");
  };

  while (i < src.length) {
    const c = src[i];
    const start = i;

    if (c === "\n") {
      i++;
      push("nl", "\n", start);
      line++;
      lineStart = i;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }
    if (c === "#" || (c === "/" && src[i + 1] === "/")) {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end < 0) err("Unterminated block comment");
      for (let k = i; k < end; k++) {
        if (src[k] === "\n") {
          line++;
          lineStart = k + 1;
        }
      }
      i = end + 2;
      continue;
    }
    if (c === '"') {
      const startLine = line;
      i++;
      const { value, interpolated } = readQuoted();
      push("str", value, start, { interpolated, line: startLine });
      continue;
    }
    if (c === "<" && src[i + 1] === "<" && /[-A-Za-z_]/.test(src[i + 2] ?? "")) {
      // Heredoc: <<EOF or <<-EOF
      const startLine = line;
      const m = /^<<(-?)([A-Za-z_][A-Za-z0-9_]*)[ \t]*\r?\n/.exec(src.slice(i));
      if (!m) err("Invalid heredoc marker");
      const marker = m![2];
      const indent = m![1] === "-";
      i += m![0].length;
      line++;
      lineStart = i;
      const bodyLines: string[] = [];
      let closed = false;
      while (i < src.length) {
        let nl = src.indexOf("\n", i);
        if (nl < 0) nl = src.length;
        const text = src.slice(i, nl).replace(/\r$/, "");
        if (text.trim() === marker) {
          i = nl;
          closed = true;
          break;
        }
        bodyLines.push(text);
        i = nl + 1;
        line++;
        lineStart = i;
      }
      if (!closed) err(`Heredoc is missing its closing "${marker}" marker`);
      let body = bodyLines;
      if (indent) {
        const min = Math.min(
          ...body.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length),
        );
        body = body.map((l) => l.slice(Number.isFinite(min) ? min : 0));
      }
      push("heredoc", body.join("\n"), start, { line: startLine, interpolated: /[$%]\{/.test(body.join("\n")) });
      continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/.exec(src.slice(i))!;
      i += m[0].length;
      push("num", m[0], start);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i))!;
      i += m[0].length;
      push("ident", m[0], start);
      continue;
    }
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    if (PUNCT3.includes(three)) {
      i += 3;
      push("punct", three, start);
      continue;
    }
    if (PUNCT2.includes(two)) {
      i += 2;
      push("punct", two, start);
      continue;
    }
    if (PUNCT1.includes(c)) {
      i++;
      push("punct", c, start);
      continue;
    }
    err(`Unexpected character "${c}"`);
  }
  toks.push({ kind: "eof", text: "", line, col: i - lineStart + 1, start: i, end: i });
  return toks;
}

// ── Parser ────────────────────────────────────────────────────────────────────

const BINARY_PREC: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "<": 4,
  ">": 4,
  "<=": 4,
  ">=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
};

class Parser {
  private pos = 0;
  /** Newlines are insignificant while inside (), [] or {} object/list literals. */
  private nlSkip = 0;

  constructor(private toks: Token[], private src: string) {}

  /** The current token, without skipping newlines. */
  private raw(): Token {
    return this.toks[this.pos];
  }

  private peek(): Token {
    if (this.nlSkip > 0) {
      while (this.toks[this.pos].kind === "nl") this.pos++;
    }
    return this.toks[this.pos];
  }

  private next(): Token {
    const t = this.peek();
    if (t.kind !== "eof") this.pos++;
    return t;
  }

  private is(text: string): boolean {
    const t = this.peek();
    return t.kind === "punct" && t.text === text;
  }

  private expect(text: string): Token {
    const t = this.next();
    if (t.kind !== "punct" || t.text !== text) {
      throw new HclSyntaxError(`Expected "${text}" but found ${describe(t)}`, t.line, t.col);
    }
    return t;
  }

  private skipNewlines() {
    while (this.raw().kind === "nl") this.pos++;
  }

  parseFile(): HclFile {
    const { attrs, blocks } = this.parseBody(false);
    return { attrs, blocks };
  }

  private parseBody(nested: boolean): { attrs: Record<string, HclAttribute>; blocks: HclBlock[]; endLine: number } {
    const attrs: Record<string, HclAttribute> = {};
    const blocks: HclBlock[] = [];
    const saved = this.nlSkip;
    this.nlSkip = 0; // bodies are newline-sensitive
    for (;;) {
      this.skipNewlines();
      const t = this.raw();
      if (t.kind === "eof") {
        if (nested) throw new HclSyntaxError('Missing closing "}" for block', t.line, t.col);
        break;
      }
      if (t.kind === "punct" && t.text === "}") {
        if (!nested) throw new HclSyntaxError('Unexpected "}"', t.line, t.col);
        this.pos++;
        this.nlSkip = saved;
        return { attrs, blocks, endLine: t.line };
      }
      if (t.kind !== "ident") {
        throw new HclSyntaxError(`Expected an attribute or block name but found ${describe(t)}`, t.line, t.col);
      }
      this.pos++;
      const after = this.raw();
      if (after.kind === "punct" && after.text === "=") {
        this.pos++;
        const value = this.parseExpr();
        attrs[t.text] = { name: t.text, value, line: t.line };
        this.endOfItem();
        continue;
      }
      // Block: labels then "{"
      const labels: string[] = [];
      for (;;) {
        const l = this.raw();
        if (l.kind === "str" || l.kind === "ident") {
          labels.push(l.text);
          this.pos++;
          continue;
        }
        if (l.kind === "punct" && l.text === "{") {
          this.pos++;
          break;
        }
        throw new HclSyntaxError(
          `Expected "=" or a block body "{" after "${t.text}" but found ${describe(l)}`,
          l.line,
          l.col,
        );
      }
      const body = this.parseBody(true);
      blocks.push({ type: t.text, labels, attrs: body.attrs, blocks: body.blocks, line: t.line, endLine: body.endLine });
      this.endOfItem();
    }
    this.nlSkip = saved;
    return { attrs, blocks, endLine: this.raw().line };
  }

  private endOfItem() {
    const t = this.raw();
    if (t.kind === "nl" || t.kind === "eof") return;
    if (t.kind === "punct" && t.text === "}") return;
    throw new HclSyntaxError(`Expected a newline but found ${describe(t)}`, t.line, t.col);
  }

  private span(start: Token, endPos = this.pos): { start: number; end: number; line: number } {
    const last = this.toks[Math.max(endPos - 1, 0)];
    return { start: start.start, end: last.end, line: start.line };
  }

  private rawFrom(start: Token): HclValue {
    const s = this.span(start);
    return { t: "raw", text: this.src.slice(s.start, s.end), ...s };
  }

  parseExpr(): HclValue {
    const startTok = this.peek();
    const cond = this.parseBinary(0);
    if (this.is("?")) {
      this.next();
      this.parseExpr();
      this.expect(":");
      this.parseExpr();
      return this.rawFrom(startTok);
    }
    return cond;
  }

  private parseBinary(minPrec: number): HclValue {
    const startTok = this.peek();
    let left = this.parseUnary();
    let combined = false;
    for (;;) {
      const t = this.peek();
      const prec = t.kind === "punct" ? BINARY_PREC[t.text] : undefined;
      if (prec === undefined || prec <= minPrec) break;
      this.next();
      this.parseBinary(prec);
      combined = true;
    }
    if (combined) left = this.rawFrom(startTok);
    return left;
  }

  private parseUnary(): HclValue {
    const t = this.peek();
    if (t.kind === "punct" && (t.text === "-" || t.text === "!")) {
      this.next();
      const operand = this.parseUnary();
      if (t.text === "-" && operand.t === "num") {
        return { ...operand, v: -operand.v, start: t.start, line: t.line };
      }
      return this.rawFrom(t);
    }
    return this.parsePostfix();
  }

  private parsePostfix(): HclValue {
    const startTok = this.peek();
    let value = this.parsePrimary();
    let path = value.t === "ref" ? value.path : null;
    let degraded = false;
    for (;;) {
      // Traversals must be on the same logical line unless we're in brackets.
      const t = this.nlSkip > 0 ? this.peek() : this.raw();
      if (t.kind === "punct" && t.text === ".") {
        this.next();
        const n = this.next();
        if (n.kind === "ident" || n.kind === "num") {
          if (path !== null) path += "." + n.text;
          else degraded = true;
          continue;
        }
        if (n.kind === "punct" && n.text === "*") {
          degraded = true;
          continue;
        }
        throw new HclSyntaxError(`Expected an attribute name after "." but found ${describe(n)}`, n.line, n.col);
      }
      if (t.kind === "punct" && t.text === "[") {
        this.next();
        this.nlSkip++;
        if (this.is("*")) {
          this.next();
          degraded = true;
        } else {
          const idx = this.parseExpr();
          if (path !== null && (idx.t === "num" || idx.t === "str")) path += `[${idx.t === "str" ? JSON.stringify(idx.v) : idx.v}]`;
          else degraded = true;
        }
        this.expect("]");
        this.nlSkip--;
        continue;
      }
      break;
    }
    if (path !== null && !degraded) {
      const s = this.span(startTok);
      return { t: "ref", path, ...s };
    }
    if (degraded) return this.rawFrom(startTok);
    return value;
  }

  private parsePrimary(): HclValue {
    const t = this.next();
    const base = { line: t.line, start: t.start, end: t.end };
    switch (t.kind) {
      case "num":
        return { t: "num", v: Number(t.text), ...base };
      case "str":
        return { t: "str", v: t.text, interpolated: !!t.interpolated, ...base };
      case "heredoc":
        return { t: "str", v: t.text, interpolated: !!t.interpolated, ...base };
      case "ident": {
        if (t.text === "true" || t.text === "false") return { t: "bool", v: t.text === "true", ...base };
        if (t.text === "null") return { t: "null", ...base };
        if (this.raw().kind === "punct" && this.raw().text === "(") {
          return this.parseCall(t);
        }
        // provider::ns::fn() style functions are rare; plain refs here
        return { t: "ref", path: t.text, ...base };
      }
      case "punct":
        if (t.text === "(") {
          this.nlSkip++;
          const inner = this.parseExpr();
          this.expect(")");
          this.nlSkip--;
          return { ...inner, start: t.start, end: this.toks[this.pos - 1].end };
        }
        if (t.text === "[") return this.parseList(t);
        if (t.text === "{") return this.parseObject(t);
        break;
    }
    throw new HclSyntaxError(`Expected a value but found ${describe(t)}`, t.line, t.col);
  }

  private parseCall(nameTok: Token): HclValue {
    this.expect("(");
    this.nlSkip++;
    const args: HclValue[] = [];
    while (!this.is(")")) {
      args.push(this.parseExpr());
      if (this.is("...")) this.next();
      if (this.is(",")) {
        this.next();
        continue;
      }
      if (!this.is(")")) {
        const t = this.peek();
        throw new HclSyntaxError(`Expected "," or ")" in call to ${nameTok.text}() but found ${describe(t)}`, t.line, t.col);
      }
    }
    this.expect(")");
    this.nlSkip--;
    const s = this.span(nameTok);
    return { t: "call", name: nameTok.text, args, ...s };
  }

  /** Skips to the bracket matching the one just consumed; used for for-expressions. */
  private skipBalanced(open: string, close: string, startTok: Token): HclValue {
    let depth = 1;
    for (;;) {
      const t = this.next();
      if (t.kind === "eof") throw new HclSyntaxError(`Missing closing "${close}"`, startTok.line, startTok.col);
      if (t.kind === "punct" && t.text === open) depth++;
      if (t.kind === "punct" && t.text === close && --depth === 0) break;
    }
    return this.rawFrom(startTok);
  }

  private parseList(open: Token): HclValue {
    this.nlSkip++;
    try {
      const first = this.peek();
      if (first.kind === "ident" && first.text === "for") return this.skipBalanced("[", "]", open);
      const items: HclValue[] = [];
      while (!this.is("]")) {
        items.push(this.parseExpr());
        if (this.is(",")) {
          this.next();
          continue;
        }
        if (!this.is("]")) {
          const t = this.peek();
          throw new HclSyntaxError(`Expected "," or "]" in list but found ${describe(t)}`, t.line, t.col);
        }
      }
      this.expect("]");
      return { t: "list", items, ...this.span(open) };
    } finally {
      this.nlSkip--;
    }
  }

  private parseObject(open: Token): HclValue {
    this.nlSkip++;
    try {
      const first = this.peek();
      if (first.kind === "ident" && first.text === "for") return this.skipBalanced("{", "}", open);
      const entries: Record<string, HclValue> = {};
      while (!this.is("}")) {
        const k = this.peek();
        let key: string;
        if (k.kind === "ident" || k.kind === "str") {
          this.next();
          key = k.text;
          // Keys like `a.b` aren't valid, but keys like `"aws:SecureTransport"` are fine.
        } else if (k.kind === "punct" && k.text === "(") {
          this.next();
          const e = this.parseExpr();
          this.expect(")");
          key = e.t === "str" ? e.v : this.src.slice(e.start, e.end);
        } else {
          throw new HclSyntaxError(`Expected an object key but found ${describe(k)}`, k.line, k.col);
        }
        const sep = this.next();
        if (!(sep.kind === "punct" && (sep.text === "=" || sep.text === ":"))) {
          throw new HclSyntaxError(`Expected "=" or ":" after object key "${key}" but found ${describe(sep)}`, sep.line, sep.col);
        }
        entries[key] = this.parseExpr();
        if (this.is(",")) this.next();
      }
      this.expect("}");
      return { t: "obj", entries, ...this.span(open) };
    } finally {
      this.nlSkip--;
    }
  }
}

function describe(t: Token): string {
  switch (t.kind) {
    case "eof":
      return "end of file";
    case "nl":
      return "end of line";
    case "str":
      return "a string";
    case "heredoc":
      return "a heredoc";
    case "num":
      return `number ${t.text}`;
    default:
      return `"${t.text}"`;
  }
}

export function parseHcl(src: string): HclFile {
  const toks = tokenize(src);
  return new Parser(toks, src).parseFile();
}

// ── Helpers for consumers ─────────────────────────────────────────────────────

/** Converts a parsed value to plain JS where possible (refs/raw become their source text). */
export function toJs(v: HclValue | undefined): unknown {
  if (!v) return undefined;
  switch (v.t) {
    case "str":
    case "num":
    case "bool":
      return v.v;
    case "null":
      return null;
    case "list":
      return v.items.map(toJs);
    case "obj":
      return Object.fromEntries(Object.entries(v.entries).map(([k, e]) => [k, toJs(e)]));
    case "ref":
      return `\${${v.path}}`;
    case "call":
      return `\${${v.name}(...)}`;
    case "raw":
      return `\${${v.text}}`;
  }
}
