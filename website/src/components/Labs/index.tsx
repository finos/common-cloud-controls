import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Layout from "@theme/Layout";
import { RotateCcw, Settings2, Info, Play } from "lucide-react";
import Editor, { type EditorHandle } from "./Editor";
import Results from "./Results";
import { evaluate, type EvaluationSummary } from "./engine";
import { SERVICE_RULES } from "./rules";
import { BUILT_IN_TEMPLATES, CLOUDS, EXAMPLES, SERVICES } from "./templates";
import type { CloudId, LabsData, LabsSettings, LabsTemplate, ServiceId, Tlp } from "./types";
import styles from "./styles.module.css";

const TLP_LEVELS: { value: Tlp; label: string; hint: string }[] = [
  { value: "tlp-clear", label: "CLEAR", hint: "Public data" },
  { value: "tlp-green", label: "GREEN", hint: "Community-wide" },
  { value: "tlp-amber", label: "AMBER", hint: "Limited disclosure" },
  { value: "tlp-red", label: "RED", hint: "Named recipients only" },
];

/** One list per setting, covering every cloud: entries for other clouds are simply never matched. */
const DEFAULT_SETTINGS: LabsSettings = {
  trustedRegions: [
    // AWS
    "eu-west-1",
    "eu-west-2",
    "us-east-1",
    // Azure
    "uksouth",
    "ukwest",
    "westeurope",
    "northeurope",
    "eastus",
    // Google Cloud
    "europe-west1",
    "europe-west2",
    "us-east1",
  ],
  approvedStorageClasses: [
    // AWS
    "STANDARD_IA",
    "INTELLIGENT_TIERING",
    "GLACIER_IR",
    "GLACIER",
    "DEEP_ARCHIVE",
    // Azure access tiers
    "COOL",
    "COLD",
    // Google Cloud
    "NEARLINE",
    "COLDLINE",
    // Azure and Google Cloud
    "ARCHIVE",
  ],
  maxPresignedUrlSeconds: 3600,
  minLogRetentionDays: 365,
  maxSecretRotationDays: 90,
};

// v3: templates became per-service, so the draft keys changed.
const STORAGE_KEY = "ccc-labs:v3";

interface Persisted {
  service: ServiceId;
  cloud: CloudId;
  example: string;
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

/** A positive whole-number organisation setting, committed when the field loses focus. */
function NumberSetting({ label, value, onChange }: { label: string; value: number; onChange(n: number): void }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        className={styles.input}
        type="number"
        min={1}
        defaultValue={value}
        key={value}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (n > 0) onChange(n);
        }}
      />
    </label>
  );
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const splitList = (s: string) =>
  s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

export default function LabsPage({ data }: { data: LabsData }): ReactNode {
  const templates: LabsTemplate[] = useMemo(() => [...BUILT_IN_TEMPLATES, ...data.templates], [data.templates]);

  const [service, setService] = useState<ServiceId>("object-storage");
  const [cloud, setCloud] = useState<CloudId>("aws");
  const [example, setExample] = useState("hardened");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [tlps, setTlps] = useState<Tlp[]>(["tlp-amber"]);
  const [settings, setSettings] = useState<LabsSettings>(DEFAULT_SETTINGS);
  /** Restricts per-resource rules to one primary resource; empty means all of them. */
  const [subject, setSubject] = useState<string>("");
  /** The code last applied (evaluated) for each template; templates without an entry use their built-in code. */
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const editorRef = useRef<EditorHandle>(null);

  // Restore the viewer's last session after hydration (localStorage isn't available during SSR).
  useEffect(() => {
    const p = loadPersisted();
    if (p.service && data.services.some((s) => s.id === p.service)) setService(p.service);
    if (p.cloud && CLOUDS.some((c) => c.id === p.cloud)) setCloud(p.cloud);
    if (p.example && templates.some((t) => t.example === p.example)) setExample(p.example);
    if (p.drafts) {
      setDrafts(p.drafts);
      // Saved drafts are evaluated on load, as if they had just been applied.
      setApplied(p.drafts);
    }
    const savedTlps = (p.tlps ?? (p.tlp ? [p.tlp] : [])).filter((t) => ALL_TLPS.includes(t));
    if (savedTlps.length) setTlps(savedTlps);
    if (p.settings) setSettings({ ...DEFAULT_SETTINGS, ...p.settings });
    setHydrated(true);
  }, [templates, data.services]);

  useEffect(() => {
    if (hydrated) savePersisted({ service, cloud, example, drafts, tlps, settings });
  }, [hydrated, service, cloud, example, drafts, tlps, settings]);

  /** Toggles one level; at least one level always stays selected. */
  const toggleTlp = (t: Tlp) =>
    setTlps((cur) => {
      const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
      return next.length ? ALL_TLPS.filter((x) => next.includes(x)) : cur;
    });

  const serviceData = data.services.find((s) => s.id === service) ?? data.services[0];
  const products = SERVICES.find((s) => s.id === serviceData.id)!.products;
  const cloudTemplates = templates.filter((t) => t.service === serviceData.id && t.cloud === cloud);
  const template = cloudTemplates.find((t) => t.example === example) ?? cloudTemplates[0] ?? templates[0];
  const templateId = template.id;
  const exampleOrder = (t: LabsTemplate) => {
    const i = EXAMPLES.findIndex((e) => e.id === t.example);
    return i < 0 ? EXAMPLES.length : i;
  };
  // Hardening levels first, then any scenarios this service has.
  const exampleGroups = (["level", "scenario"] as const)
    .map((group) => ({
      group,
      templates: cloudTemplates
        .filter((t) => (EXAMPLES.find((e) => e.id === t.example)?.group ?? "scenario") === group)
        .sort((a, b) => exampleOrder(a) - exampleOrder(b)),
    }))
    .filter((g) => g.templates.length);
  const code = drafts[template.id] ?? template.code;
  const edited = drafts[template.id] !== undefined && drafts[template.id] !== template.code;

  const setCode = useCallback((v: string) => setDrafts((d) => ({ ...d, [templateId]: v })), [templateId]);
  const without = (d: Record<string, string>) => {
    const { [templateId]: _, ...rest } = d;
    return rest;
  };
  const resetTemplate = () => {
    setDrafts(without);
    setApplied(without);
  };

  // Results reflect the applied code only; edits are re-evaluated when the user applies them.
  const appliedCode = applied[templateId] ?? template.code;
  const dirty = code !== appliedCode;
  const apply = useCallback(() => setApplied((a) => ({ ...a, [templateId]: code })), [templateId, code]);
  const outcome = useMemo(
    () => evaluate(appliedCode, serviceData.controls, SERVICE_RULES[serviceData.id], { tlps, settings, subject: subject || undefined }),
    [appliedCode, serviceData, tlps, settings, subject],
  );

  // Keep showing the last good results while the template has a syntax error.
  const lastGood = useRef<EvaluationSummary | null>(null);
  if (outcome.ok) lastGood.current = outcome.summary;
  const summary = outcome.ok ? outcome.summary : lastGood.current;
  const error = outcome.ok === false ? outcome : null;

  const subjects = summary?.subjects ?? [];
  useEffect(() => {
    if (subject && summary && !summary.subjects.includes(subject)) setSubject("");
  }, [subject, summary]);

  const reveal = useCallback((line: number) => editorRef.current?.revealLine(line), []);

  return (
    <Layout title="Labs" description="Edit Terraform for AWS, Azure or Google Cloud in your browser and see which CCC controls it satisfies.">
      <main className={styles.page}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Labs · Experimental</p>
          <h1 className={styles.title}>Controls Playground</h1>
          <p className={styles.lede}>
            Pick a CCC service and a cloud, start from a basic, intermediate or hardened Terraform template, then edit it and apply your changes
            to see which controls it satisfies. Everything runs in your browser: nothing you type leaves this page.
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
            <span className={styles.fieldLabel}>Service</span>
            <select value={serviceData.id} onChange={(e) => setService(e.target.value as ServiceId)} className={styles.select}>
              {data.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>

          <fieldset className={styles.field}>
            <legend className={styles.fieldLabel}>Cloud</legend>
            <div className={styles.segmented}>
              {CLOUDS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  title={products[c.id]}
                  aria-pressed={cloud === c.id}
                  className={`${styles.segment} ${styles.cloud} ${cloud === c.id ? styles.segmentActive : ""}`}
                  onClick={() => setCloud(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Example</span>
            <select value={template.example} onChange={(e) => setExample(e.target.value)} className={styles.select}>
              {exampleGroups.map((g) => (
                <optgroup key={g.group} label={g.group === "level" ? "Hardening level" : "Scenarios"}>
                  {g.templates.map((t) => (
                    <option key={t.id} value={t.example}>
                      {t.title}
                      {drafts[t.id] !== undefined && drafts[t.id] !== t.code ? " (edited)" : ""}
                    </option>
                  ))}
                </optgroup>
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

          {summary && subjects.length > 1 && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{capitalise(summary.noun.one)} in scope</span>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={styles.select}>
                <option value="">All ({subjects.length})</option>
                {subjects.map((b) => (
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
                main.tf <span className={styles.paneMeta}>· {products[cloud]}</span>
              </h2>
              <div className={styles.paneActions}>
                {template.sourceUrl && (
                  <a href={template.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.smallLink}>
                    View source
                  </a>
                )}
                <button type="button" className={styles.ghostButton} onClick={resetTemplate} disabled={!edited && !dirty}>
                  <RotateCcw size={14} aria-hidden="true" /> Reset
                </button>
                <button type="button" className={styles.applyButton} onClick={apply} disabled={!dirty} title="Re-evaluate the template (Ctrl+Enter)">
                  <Play size={14} aria-hidden="true" /> Apply
                </button>
              </div>
            </div>
            <p className={styles.templateDesc}>{template.description}</p>
            <Editor ref={editorRef} value={code} onChange={setCode} onApply={apply} errorLine={dirty ? undefined : error?.line} label={`Terraform for ${template.title}`} />
            <p id="labs-editor-help" className={styles.editorHelp}>
              Press Apply or Ctrl+Enter (⌘+Enter on Mac) to re-evaluate. Tab indents; press Esc then Tab to move focus out of the editor. Your
              edits are kept in this browser only.
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
                  <span className={styles.fieldLabel}>Trusted regions and locations, any cloud</span>
                  <input
                    className={styles.input}
                    defaultValue={settings.trustedRegions.join(", ")}
                    key={`regions-${settings.trustedRegions.join()}`}
                    onBlur={(e) => setSettings((s) => ({ ...s, trustedRegions: splitList(e.target.value) }))}
                  />
                </label>
                {serviceData.id === "secrets" && (
                  <NumberSetting
                    label="Max days between secret rotations (CCC.SecMgmt.CN01)"
                    value={settings.maxSecretRotationDays}
                    onChange={(n) => setSettings((s) => ({ ...s, maxSecretRotationDays: n }))}
                  />
                )}
                {serviceData.id === "logging" && (
                  <NumberSetting
                    label="Minimum log retention, days (CCC.Logging.CN02)"
                    value={settings.minLogRetentionDays}
                    onChange={(n) => setSettings((s) => ({ ...s, minLogRetentionDays: n }))}
                  />
                )}
                {serviceData.id === "object-storage" && (
                  <>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Approved storage classes and tiers, any cloud (CCC.ObjStor.CN10)</span>
                      <input
                        className={styles.input}
                        defaultValue={settings.approvedStorageClasses.join(", ")}
                        key={`classes-${settings.approvedStorageClasses.join()}`}
                        onBlur={(e) => setSettings((s) => ({ ...s, approvedStorageClasses: splitList(e.target.value).map((x) => x.toUpperCase()) }))}
                      />
                    </label>
                    <NumberSetting
                      label="Max pre-signed URL / SAS lifetime, seconds (CCC.ObjStor.CN08)"
                      value={settings.maxPresignedUrlSeconds}
                      onChange={(n) => setSettings((s) => ({ ...s, maxPresignedUrlSeconds: n }))}
                    />
                  </>
                )}
                <button type="button" className={styles.ghostButton} onClick={() => setSettings(DEFAULT_SETTINGS)}>
                  <RotateCcw size={14} aria-hidden="true" /> Restore defaults
                </button>
              </div>
            </details>
          </section>

          <section className={styles.resultsPane} aria-labelledby="labs-results-title">
            <div className={styles.paneHead}>
              <h2 id="labs-results-title" className={styles.paneTitle}>
                {serviceData.title} coverage
              </h2>
              {summary && (
                <span className={styles.paneMeta}>
                  {summary.resourceCount} resource{summary.resourceCount === 1 ? "" : "s"} ·{summary.subjects.length} {summary.subjects.length === 1 ? summary.noun.one : summary.noun.many}
                </span>
              )}
            </div>
            {summary ? (
              <>
                {dirty && (
                  <div className={styles.pendingNote} role="status">
                    <span>The template has changes that haven't been applied. These results are for the last applied version.</span>
                    <button type="button" className={styles.applyButton} onClick={apply}>
                      <Play size={14} aria-hidden="true" /> Apply
                    </button>
                  </div>
                )}
                <Results summary={summary} onReveal={reveal} stale={!!error || dirty} />
              </>
            ) : (
              <p className={styles.empty}>Fix the syntax error to see results.</p>
            )}
          </section>
        </div>
      </main>
    </Layout>
  );
}
