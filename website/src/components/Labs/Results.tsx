import React, { useMemo, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, FlaskConical, MinusCircle, ExternalLink, ChevronRight } from "lucide-react";
import type { ControlResult, RequirementResult, Status } from "./types";
import type { EvaluationSummary } from "./engine";
import styles from "./styles.module.css";

export const STATUS_META: Record<Status, { label: string; short: string; Icon: typeof CheckCircle2; className: string }> = {
  pass: { label: "Satisfied", short: "Satisfied", Icon: CheckCircle2, className: styles.sPass },
  fail: { label: "Not satisfied", short: "Failing", Icon: XCircle, className: styles.sFail },
  warn: { label: "Partial, verify", short: "Partial", Icon: AlertTriangle, className: styles.sWarn },
  manual: { label: "Live test only", short: "Live test", Icon: FlaskConical, className: styles.sManual },
  na: { label: "Not applicable", short: "N/A", Icon: MinusCircle, className: styles.sNa },
};

const FILTERS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fail", label: "Failing" },
  { key: "warn", label: "Partial" },
  { key: "pass", label: "Satisfied" },
  { key: "manual", label: "Live test only" },
];

function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  const { Icon, className, label } = STATUS_META[status];
  return <Icon size={size} className={className} aria-label={label} role="img" />;
}

function StatusPill({ status }: { status: Status }) {
  const { label, className } = STATUS_META[status];
  return (
    <span className={`${styles.pill} ${className}`}>
      <StatusIcon status={status} size={14} />
      {label}
    </span>
  );
}

function RequirementRow({ r, onReveal }: { r: RequirementResult; onReveal(line: number): void }) {
  const multi = r.evidence.length > 1;
  return (
    <li className={styles.requirement}>
      <div className={styles.reqHead}>
        <StatusIcon status={r.status} />
        <code className={styles.reqId}>{r.requirement.id}</code>
        {r.requirement.featureUrl && (
          <a className={styles.featureLink} href={r.requirement.featureUrl} target="_blank" rel="noopener noreferrer">
            Behavioural test <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
      <p className={styles.reqText}>{r.requirement.text}</p>
      <ul className={styles.evidenceList}>
        {r.evidence.map((e, i) => (
          <li key={i} className={styles.evidence}>
            {multi && <StatusIcon status={e.status} size={13} />}
            <span>
              {e.subject && multi && <code className={styles.subject}>{e.subject}</code>} {e.message}
            </span>
            {e.line && (
              <button type="button" className={styles.lineButton} onClick={() => onReveal(e.line!)} aria-label={`Show line ${e.line} in the editor`} title="Show in editor">
                L{e.line}
              </button>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}

function ControlCard({ result, filter, onReveal, defaultOpen }: { result: ControlResult; filter: "all" | Status; onReveal(line: number): void; defaultOpen: boolean }) {
  const { control } = result;
  const reqs = filter === "all" ? result.requirements : result.requirements.filter((r) => r.status === filter);
  const hidden = result.requirements.filter((r) => !reqs.includes(r));
  const tally = (s: Status) => result.requirements.filter((r) => r.status === s).length;
  const manual = tally("manual");
  return (
    <details className={styles.control} open={defaultOpen}>
      <summary className={styles.controlSummary}>
        <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
        <div className={styles.controlTitleWrap}>
          <span className={styles.controlId}>{control.id}</span>
          <span className={styles.controlTitle}>{control.title}</span>
        </div>
        <div className={styles.controlMeta}>
          {result.status !== "manual" && manual > 0 && <span className={styles.manualCount}>+{manual} live</span>}
          <StatusPill status={result.status} />
        </div>
      </summary>
      <div className={styles.controlBody}>
        <p className={styles.objective}>
          {control.objective}{" "}
          <a href={control.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
            {control.catalog} source <ExternalLink size={11} aria-hidden="true" />
          </a>
        </p>
        {hidden.length > 0 && (
          <p className={styles.hiddenNote}>
            Showing {reqs.length} of {result.requirements.length} requirements ·{" "}
            {(["fail", "warn", "pass", "manual", "na"] as Status[])
              .filter((s) => hidden.some((r) => r.status === s))
              .map((s) => (
                <span key={s} className={STATUS_META[s].className}>
                  {hidden.filter((r) => r.status === s).length} {STATUS_META[s].short.toLowerCase()}
                </span>
              ))
              .reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ", ", el] : [el]), [])}{" "}
            hidden by the “{FILTERS.find((f) => f.key === filter)?.label}” filter.
          </p>
        )}
        <ul className={styles.requirementList}>
          {reqs.map((r) => (
            <RequirementRow key={r.requirement.id} r={r} onReveal={onReveal} />
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function Results({ summary, onReveal, stale }: { summary: EvaluationSummary; onReveal(line: number): void; stale: boolean }) {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const { counts, results } = summary;
  const total = counts.pass + counts.fail + counts.warn + counts.manual + counts.na;

  const groups = useMemo(() => {
    const visible = filter === "all" ? results : results.filter((r) => r.requirements.some((x) => x.status === filter));
    const byGroup = new Map<string, ControlResult[]>();
    for (const r of visible) {
      const g = byGroup.get(r.control.group) ?? [];
      g.push(r);
      byGroup.set(r.control.group, g);
    }
    return [...byGroup.entries()];
  }, [results, filter]);

  return (
    <div className={`${styles.results} ${stale ? styles.stale : ""}`} aria-live="polite" aria-busy={stale}>
      <div className={styles.scoreboard}>
        {(["pass", "fail", "warn", "manual"] as Status[]).map((s) => (
          <button
            type="button"
            key={s}
            className={`${styles.score} ${STATUS_META[s].className} ${filter === s ? styles.scoreActive : ""}`}
            onClick={() => setFilter(filter === s ? "all" : s)}
            aria-pressed={filter === s}
          >
            <span className={styles.scoreNum}>{counts[s]}</span>
            <span className={styles.scoreLabel}>{STATUS_META[s].short}</span>
          </button>
        ))}
      </div>
      <div className={styles.bar} role="img" aria-label={`${counts.pass} satisfied, ${counts.fail} failing, ${counts.warn} partial, ${counts.manual} live-test only, ${counts.na} not applicable`}>
        {(["pass", "warn", "fail", "manual", "na"] as Status[]).map((s) =>
          counts[s] ? <span key={s} className={STATUS_META[s].className} style={{ flexGrow: counts[s] }} /> : null,
        )}
      </div>
      <p className={styles.barCaption}>
        {total} assessment requirements across {results.length} controls apply at the selected data classification.
      </p>

      <div className={styles.filters} role="group" aria-label="Filter requirements">
        {FILTERS.map((f) => (
          <button type="button" key={f.key} className={`${styles.chip} ${filter === f.key ? styles.chipActive : ""}`} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}>
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && <p className={styles.empty}>No requirements match this filter.</p>}
      {groups.map(([group, items]) => (
        <section key={group} className={styles.group}>
          <h3 className={styles.groupTitle}>{group}</h3>
          {items.map((r) => (
            <ControlCard key={r.control.id + filter} result={r} filter={filter} onReveal={onReveal} defaultOpen={filter !== "all"} />
          ))}
        </section>
      ))}
    </div>
  );
}
