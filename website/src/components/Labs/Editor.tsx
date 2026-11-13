import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { highlightHcl } from "./hcl/highlight";
import styles from "./styles.module.css";

export interface EditorHandle {
  /** Moves the caret to a 1-based line, scrolls it into view, and briefly highlights it. */
  revealLine(line: number): void;
}

interface EditorProps {
  value: string;
  onChange(value: string): void;
  /** Called on Ctrl+Enter / Cmd+Enter. */
  onApply?(): void;
  errorLine?: number;
  label: string;
}

const LINE_HEIGHT_EM = 1.55;

const HL_CLASSES = {
  comment: styles.tkComment,
  string: styles.tkString,
  interp: styles.tkInterp,
  number: styles.tkNumber,
  keyword: styles.tkKeyword,
  literal: styles.tkLiteral,
  attr: styles.tkAttr,
  block: styles.tkBlock,
  ref: styles.tkRef,
};

/**
 * A lightweight code editor: a transparent <textarea> layered over a
 * syntax-highlighted <pre>, so it needs no third-party editor dependency and
 * keeps native undo, selection, IME and accessibility behaviour.
 */
const Editor = forwardRef<EditorHandle, EditorProps>(function Editor({ value, onChange, onApply, errorLine, label }, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [flashLine, setFlashLine] = useState<number | null>(null);
  const escapePressed = useRef(false);

  const lines = useMemo(() => value.split("\n").length, [value]);
  const html = useMemo(() => highlightHcl(value, HL_CLASSES) + "\n", [value]);

  useImperativeHandle(
    ref,
    () => ({
      revealLine(line: number) {
        const ta = textareaRef.current;
        const scroller = scrollerRef.current;
        if (!ta || !scroller) return;
        // Use the textarea's own value: browsers normalise CRLF to LF there.
        const textLines = ta.value.split("\n");
        const start = textLines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
        const end = start + (textLines[line - 1]?.length ?? 0);
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(start, end);
        const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
        const top = (line - 1) * lh;
        // Bring the editor into the page viewport first (instantly), then scroll within it,
        // so the two scrolls don't cancel each other out.
        const rect = scroller.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) scroller.scrollIntoView({ block: "nearest" });
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        scroller.scrollTo({ top: Math.max(0, top - scroller.clientHeight / 3), behavior: reduceMotion ? "auto" : "smooth" });
        setFlashLine(line);
        window.setTimeout(() => setFlashLine((l) => (l === line ? null : l)), 1600);
      },
    }),
    [value],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onApply?.();
        return;
      }
      // Tab indents; Esc then Tab moves focus out of the editor as usual.
      if (e.key === "Escape") {
        escapePressed.current = true;
        return;
      }
      if (e.key === "Tab" && !escapePressed.current && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const ta = e.currentTarget;
        const { selectionStart: s, selectionEnd: end } = ta;
        if (e.shiftKey) {
          // Outdent the current line by up to two spaces.
          const lineStart = value.lastIndexOf("\n", s - 1) + 1;
          const strip = value.startsWith("  ", lineStart) ? 2 : value.startsWith(" ", lineStart) ? 1 : 0;
          if (!strip) return;
          ta.setSelectionRange(lineStart, lineStart + strip);
          if (!document.execCommand("delete")) onChange(value.slice(0, lineStart) + value.slice(lineStart + strip));
          ta.setSelectionRange(Math.max(lineStart, s - strip), Math.max(lineStart, end - strip));
          return;
        }
        // execCommand keeps the browser's undo stack intact; fall back if unsupported.
        if (!document.execCommand("insertText", false, "  ")) {
          onChange(value.slice(0, s) + "  " + value.slice(end));
          requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
        }
        return;
      }
      escapePressed.current = false;
    },
    [onApply, onChange, value],
  );

  return (
    <div className={styles.editorScroller} ref={scrollerRef}>
      <div className={styles.editorGrid} style={{ lineHeight: `${LINE_HEIGHT_EM}em` }}>
        <div className={styles.gutter} aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className={i + 1 === errorLine ? styles.gutterError : i + 1 === flashLine ? styles.gutterFlash : undefined}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className={styles.codeArea}>
          {errorLine && <div className={styles.lineBandError} style={{ top: `${(errorLine - 1) * LINE_HEIGHT_EM}em` }} />}
          {flashLine && <div className={styles.lineBandFlash} style={{ top: `${(flashLine - 1) * LINE_HEIGHT_EM}em` }} />}
          <pre className={styles.highlight} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            aria-label={label}
            aria-describedby="labs-editor-help"
          />
        </div>
      </div>
    </div>
  );
});

export default Editor;
