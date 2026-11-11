import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Layout from "@theme/Layout";
import { RotateCcw, Settings2, Info } from "lucide-react";
import Editor, { type EditorHandle } from "./Editor";
import Results from "./Results";
import { evaluate, type EvaluationSummary } from "./engine";
import { BUILT_IN_TEMPLATES } from "./templates";
import type { LabsData, LabsSettings, LabsTemplate, Tlp } from "./types";
import styles from "./styles.module.css";

const TLP_LEVELS: { value: Tlp; label: string; hint: string }[] = [
  { value: "tlp-clear", label: "CLEAR", hint: "Public data" },
  { value: "tlp-green", label: "GREEN", hint: "Community-wide" },
  { value: "tlp-amber", label: "AMBER", hint: "Limited disclosure" },
  { value: "tlp-red", label: "RED", hint: "Named recipients only" },
];

const DEFAULT_SETTINGS: LabsSettings = {
  trustedRegions: ["eu-west-1", "eu-west-2", "us-east-1"],
  approvedStorageClasses: ["STANDARD_IA", "INTELLIGENT_TIERING", "GLACIER_IR", "GLACIER", "DEEP_ARCHIVE"],
  maxPresignedUrlSeconds: 3600,
};

const STORAGE_KEY = "ccc-labs:v1";

interface Persisted {
  templateId: string;
  drafts: Record<string, string>;
  tlps: Tlp[];
  /** Pre-multi-select versions stored a single level. */
  tlp?: Tlp;
  settings: LabsSettings;
}

const ALL_TLPS = TLP_LEVELS.map((l) => l.value);

/** Per-viewer convenience only: the page works the same when storage is unavailable. */
function loadPersisted(): Partial<Persisted> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
  } catch {
    return {};
  }
}

function savePersisted(p: Persisted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: ignore */
  }
}

const splitList = (s: string) =>
  s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

export default function LabsPage({ data }: { data: LabsData }): ReactNode {
  const templates: LabsTemplate[] = useMemo(() => [...BUILT_IN_TEMPLATES, ...data.templates], [data.templates]);

  const [templateId, setTemplateId] = useState(templates[0].id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [tlps, setTlps] = useState<Tlp[]>(["tlp-amber"]);
  const [settings, setSettings] = useState<LabsSettings>(DEFAULT_SETTINGS);
  const [bucket, setBucket] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const editorRef = useRef<EditorHandle>(null);

  // Restore the viewer's last session after hydration (localStorage isn't available during SSR).
  useEffect(() => {
    const p = loadPersisted();
    if (p.templateId && templates.some((t) => t.id === p.templateId)) setTemplateId(p.templateId);
    if (p.drafts) setDrafts(p.drafts);
    const savedTlps = (p.tlps ?? (p.tlp ? [p.tlp] : [])).filter((t) => ALL_TLPS.includes(t));
    if (savedTlps.length) setTlps(savedTlps);
    if (p.settings) setSettings({ ...DEFAULT_SETTINGS, ...p.settings });
    setHydrated(true);
  }, [templates]);

  useEffect(() => {
    if (hydrated) savePersisted({ templateId, drafts, tlps, settings });
  }, [hydrated, templateId, drafts, tlps, settings]);

  /** Toggles one level; at least one level always stays selected. */
  const toggleTlp = (t: Tlp) =>
    setTlps((cur) => {
      const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
      return next.length ? ALL_TLPS.filter((x) => next.includes(x)) : cur;
    });

  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const code = drafts[template.id] ?? template.code;
  const edited = drafts[template.id] !== undefined && drafts[template.id] !== template.code;

  const setCode = useCallback((v: string) => setDrafts((d) => ({ ...d, [templateId]: v })), [templateId]);
  const resetTemplate = () =>
    setDrafts((d) => {
      const { [templateId]: _, ...rest } = d;
      return rest;
    });

  // Evaluation is cheap, but deferring keeps typing smooth on large templates.
  const deferredCode = useDeferredValue(code);
  const outcome = useMemo(
    () => evaluate(deferredCode, data.controls, { tlps, settings, bucket: bucket || undefined }),
    [deferredCode, data.controls, tlps, settings, bucket],
  );

  // Keep showing the last good results while the template has a syntax error.
  const lastGood = useRef<EvaluationSummary | null>(null);
  if (outcome.ok) lastGood.current = outcome.summary;
  const summary = outcome.ok ? outcome.summary : lastGood.current;
  const error = outcome.ok === false ? outcome : null;

  const buckets = summary?.bucketAddresses ?? [];
  useEffect(() => {
    if (bucket && summary && !summary.bucketAddresses.includes(bucket)) setBucket("");
  }, [bucket, summary]);

  const reveal = useCallback((line: number) => editorRef.current?.revealLine(line), []);

  return (
    <Layout title="Labs" description="Edit Terraform in your browser and see which CCC Object Storage controls it satisfies.">
      <main className={styles.page}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Labs · Experimental</p>
          <h1 className={styles.title}>Controls Playground</h1>
          <p className={styles.lede}>
            Edit an AWS S3 Terraform template and see, live, which <strong>{data.service.title}</strong> controls it satisfies. Everything runs in
            your browser: nothing you type leaves this page.
          </p>
        </header>

        <aside className={styles.disclaimer}>
          <Info size={18} aria-hidden="true" />
          <p>
            This is an <strong>illustrative static check</strong>, not a compliance assessment. It reads only what the template declares, and the
            mappings from Terraform to requirements haven't been ratified by the CCC project. Many requirements depend on runtime behaviour and can
            only be verified by the{" "}
            <a href="/validators">behavioural validators</a> against a live deployment; those are marked <em>Live test only</em>.
          </p>
        </aside>

        <div className={styles.toolbar}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Starter template</span>
            <select value={template.id} onChange={(e) => setTemplateId(e.target.value)} className={styles.select}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                  {drafts[t.id] !== undefined && drafts[t.id] !== t.code ? " (edited)" : ""}
                </option>
              ))}
            </select>
          </label>

          <fieldset className={styles.field}>
            <legend className={styles.fieldLabel}>Data classification</legend>
            <div className={styles.segmented}>
              {TLP_LEVELS.map((l) => (
                <button
                  type="button"
                  key={l.value}
                  title={`${l.hint}. Click to add or remove.`}
                  aria-pressed={tlps.includes(l.value)}
                  className={`${styles.segment} ${styles[l.value.replace("tlp-", "tlp")]} ${tlps.includes(l.value) ? styles.segmentActive : ""}`}
                  onClick={() => toggleTlp(l.value)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>

          {buckets.length > 1 && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Bucket in scope</span>
              <select value={bucket} onChange={(e) => setBucket(e.target.value)} className={styles.select}>
                <option value="">All buckets ({buckets.length})</option>
                {buckets.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className={styles.workspace}>
          <section className={styles.editorPane} aria-labelledby="labs-editor-title">
            <div className={styles.paneHead}>
              <h2 id="labs-editor-title" className={styles.paneTitle}>
                main.tf
              </h2>
              <div className={styles.paneActions}>
                {template.sourceUrl && (
                  <a href={template.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.smallLink}>
                    View source
                  </a>
                )}
                <button type="button" className={styles.ghostButton} onClick={resetTemplate} disabled={!edited}>
                  <RotateCcw size={14} aria-hidden="true" /> Reset
                </button>
              </div>
            </div>
            <p className={styles.templateDesc}>{template.description}</p>
            <Editor ref={editorRef} value={code} onChange={setCode} errorLine={error?.line} label={`Terraform for ${template.title}`} />
            <p id="labs-editor-help" className={styles.editorHelp}>
              Tab indents. Press Esc then Tab to move focus out of the editor. Your edits are kept in this browser only.
            </p>
            {error && (
              <div className={styles.errorBox} role="alert">
                <strong>Syntax error.</strong> {error.error}
                {summary && <span className={styles.errorNote}> Showing results from the last valid version.</span>}
              </div>
            )}

            <details className={styles.settings}>
              <summary>
                <Settings2 size={15} aria-hidden="true" /> Organisation settings
              </summary>
              <div className={styles.settingsBody}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Trusted regions (CCC.Core.CN06, CN10)</span>
                  <input
                    className={styles.input}
                    defaultValue={settings.trustedRegions.join(", ")}
                    key={`regions-${settings.trustedRegions.join()}`}
                    onBlur={(e) => setSettings((s) => ({ ...s, trustedRegions: splitList(e.target.value) }))}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Approved storage classes (CCC.ObjStor.CN10)</span>
                  <input
                    className={styles.input}
                    defaultValue={settings.approvedStorageClasses.join(", ")}
                    key={`classes-${settings.approvedStorageClasses.join()}`}
                    onBlur={(e) => setSettings((s) => ({ ...s, approvedStorageClasses: splitList(e.target.value).map((x) => x.toUpperCase()) }))}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Max pre-signed URL lifetime, seconds (CCC.ObjStor.CN08)</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    defaultValue={settings.maxPresignedUrlSeconds}
                    key={`presign-${settings.maxPresignedUrlSeconds}`}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (n > 0) setSettings((s) => ({ ...s, maxPresignedUrlSeconds: n }));
                    }}
                  />
                </label>
                <button type="button" className={styles.ghostButton} onClick={() => setSettings(DEFAULT_SETTINGS)}>
                  <RotateCcw size={14} aria-hidden="true" /> Restore defaults
                </button>
              </div>
            </details>
          </section>

          <section className={styles.resultsPane} aria-labelledby="labs-results-title">
            <div className={styles.paneHead}>
              <h2 id="labs-results-title" className={styles.paneTitle}>
                Control coverage
              </h2>
              {summary && (
                <span className={styles.paneMeta}>
                  {summary.resourceCount} resources · {summary.bucketAddresses.length} bucket{summary.bucketAddresses.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {summary ? (
              <Results summary={summary} onReveal={reveal} stale={!!error || deferredCode !== code} />
            ) : (
              <p className={styles.empty}>Fix the syntax error to see results.</p>
            )}
          </section>
        </div>
      </main>
    </Layout>
  );
}
