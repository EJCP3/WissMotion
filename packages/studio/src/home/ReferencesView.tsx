// Pestaña Referencias: videos de estilo ya analizados (wissmotion/references)
// con su hoja de fotogramas, técnicas, con qué se recrean y un brief para
// copiar, para no tener que reenviar el video ni explicarlo otra vez.

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useLanguage } from "../i18n/LanguageContext";
import type { HomeProject } from "./homeApi";
import { ProjectTargetSelect } from "./homeShared";
import { installWissmotionTemplate } from "./wissmotionInstall";
import { WISSMOTION_TEMPLATES } from "./wissmotionTemplates";
import {
  WISSMOTION_REFERENCES,
  buildReferenceBrief,
  type ReferenceStatus,
  type WissmotionReference,
} from "./wissmotionReferences";

const STATUS_TONE: Record<ReferenceStatus, string> = {
  lista: "text-accent-ink",
  parcial: "text-warning-ink",
  falta: "text-danger-ink",
};

function StatusBadge({ status }: { status: ReferenceStatus }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-step-12 font-medium ${STATUS_TONE[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(`home.refStatus.${status}`)}
    </span>
  );
}

function Chip({ children, mono }: { children: string; mono?: boolean }) {
  return (
    <span
      className={`rounded-full border border-border px-2.5 py-1 text-step-12 text-text-1 ${mono ? "font-mono" : ""}`}
    >
      {children}
    </span>
  );
}

function ReferenceCard({ item, onOpen }: { item: WissmotionReference; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full rounded-sm text-left focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="block aspect-video w-full overflow-hidden rounded-sm bg-hover">
        <img
          src={item.sheet}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-hover group-hover:scale-[1.02]"
        />
      </span>
      <span className="mt-3 block truncate text-step-14 font-semibold text-text-0">
        {item.title}
      </span>
      <span className="mt-0.5 flex items-center gap-2 text-step-12 text-text-2">
        {item.aspect.join(" / ")} · {item.duration}s ·
        <StatusBadge status={item.status} />
      </span>
    </button>
  );
}

function ReferenceDetail({
  item,
  projects,
  onBack,
  onOpenProject,
}: {
  item: WissmotionReference;
  projects: HomeProject[];
  onBack: () => void;
  onOpenProject: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const briefBox = useRef<HTMLDetailsElement>(null);
  const brief = buildReferenceBrief(item);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const target = targetId ?? projects[0]?.id ?? null;
  const templates = WISSMOTION_TEMPLATES.filter((tpl) => item.recreate.templates.includes(tpl.id));

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
    } catch {
      // Portapapeles bloqueado: abre el brief seleccionado para Ctrl+C.
      setCopied(false);
      const box = briefBox.current;
      if (!box) return;
      box.open = true;
      box.querySelector("textarea")?.select();
    }
  }

  async function installTemplate(id: string) {
    const template = templates.find((tpl) => tpl.id === id);
    if (!template || !target || working) return;
    setWorking(id);
    setFailed(false);
    try {
      onOpenProject(target, await installWissmotionTemplate(target, template));
    } catch {
      setFailed(true);
      setWorking(null);
    }
  }

  return (
    <div data-testid="reference-detail">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-step-13 font-medium text-text-2 hover:text-text-0"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        {t("home.references")}
      </button>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-step-16 font-bold tracking-tight text-text-0">{item.title}</h2>
        <button
          type="button"
          onClick={copyBrief}
          className="flex h-9 items-center gap-2 bg-text-0 px-4 text-step-13 font-semibold text-bg-0 transition-transform duration-press active:scale-[0.98]"
        >
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? t("home.refCopied") : t("home.refCopyBrief")}
        </button>
      </div>
      <p className="mt-1 flex items-center gap-2 text-step-12 text-text-2">
        {item.aspect.join(" / ")} · {item.duration}s · {item.origin} ·
        <StatusBadge status={item.status} />
      </p>
      <img
        src={item.sheet}
        alt={item.title}
        className="mt-5 w-full rounded-sm bg-hover object-contain"
      />
      <p className="mt-5 max-w-prose text-step-14 text-text-1">{item.description}</p>
      <details ref={briefBox} className="mt-4">
        <summary className="cursor-pointer text-step-13 font-medium text-text-2 hover:text-text-0">
          {t("home.refShowBrief")}
        </summary>
        <textarea
          readOnly
          value={brief}
          rows={6}
          aria-label={t("home.refShowBrief")}
          className="mt-2 w-full resize-y rounded-sm border border-border bg-surface p-3 font-mono text-step-12 text-text-1"
        />
      </details>

      <h3 className="mt-6 text-step-13 font-semibold text-text-0">{t("home.refTechniques")}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {item.techniques.map((tech) => (
          <Chip key={tech}>{tech}</Chip>
        ))}
      </div>

      <h3 className="mt-6 text-step-13 font-semibold text-text-0">{t("home.refRecreate")}</h3>
      <div className="mt-2 flex flex-col gap-3">
        {templates.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => installTemplate(tpl.id)}
                disabled={!target || working !== null}
                className="flex h-8 items-center gap-1.5 rounded-full bg-on px-3 text-step-12 font-medium text-text-0 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {working === tpl.id ? (
                  <SpinnerGap size={13} className="animate-spin" aria-hidden="true" />
                ) : null}
                {t("home.refUseTemplate")} · {tpl.name}
              </button>
            ))}
            {projects.length > 1 ? (
              <ProjectTargetSelect
                projects={projects}
                value={target}
                onChange={setTargetId}
                label={t("home.inProject")}
              />
            ) : null}
          </div>
        ) : null}
        {item.recreate.presets.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-step-12 text-text-2">{t("home.refPresets")}</span>
            {item.recreate.presets.map((id) => (
              <Chip key={id} mono>
                {id}
              </Chip>
            ))}
          </div>
        ) : null}
        {item.recreate.transitions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-step-12 text-text-2">{t("home.refTransitions")}</span>
            {item.recreate.transitions.map((id) => (
              <Chip key={id} mono>
                {id}
              </Chip>
            ))}
          </div>
        ) : null}
        {item.recreate.mockups.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-step-12 text-text-2">{t("home.refMockups")}</span>
            {item.recreate.mockups.map((id) => (
              <Chip key={id} mono>
                {id}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
      {failed ? (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-step-12 text-danger-ink">
          <WarningCircle size={14} aria-hidden="true" />
          {t("home.installError")}
        </p>
      ) : null}

      {item.missing.length > 0 ? (
        <>
          <h3 className="mt-6 text-step-13 font-semibold text-text-0">{t("home.refMissing")}</h3>
          <ul className="mt-2 list-disc pl-5 text-step-13 text-text-1">
            {item.missing.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function ReferencesView({
  projects,
  search,
  onOpenProject,
}: {
  projects: HomeProject[];
  search: string;
  onOpenProject: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ReferenceStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = search.trim().toLowerCase();

  const items = useMemo(
    () =>
      WISSMOTION_REFERENCES.filter((ref) => {
        if (status && ref.status !== status) return false;
        if (!query) return true;
        return [ref.title, ref.description, ...ref.techniques].some((text) =>
          text.toLowerCase().includes(query),
        );
      }),
    [query, status],
  );

  const selected = WISSMOTION_REFERENCES.find((ref) => ref.id === selectedId);
  if (selected) {
    return (
      <ReferenceDetail
        item={selected}
        projects={projects}
        onBack={() => setSelectedId(null)}
        onOpenProject={onOpenProject}
      />
    );
  }

  const filters: Array<[ReferenceStatus | null, string]> = [
    [null, t("home.refAll")],
    ["lista", t("home.refStatus.lista")],
    ["parcial", t("home.refStatus.parcial")],
    ["falta", t("home.refStatus.falta")],
  ];

  return (
    <div>
      <h2 className="text-step-16 font-bold tracking-tight text-text-0">{t("home.references")}</h2>
      <p className="mt-1 max-w-prose text-step-13 text-text-2">{t("home.referencesHint")}</p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("home.references")}>
        {filters.map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setStatus(value)}
            aria-pressed={status === value}
            className={
              status === value
                ? "h-8 rounded-full border border-transparent bg-on px-3 text-step-12 font-medium text-text-0"
                : "h-8 rounded-full border border-border px-3 text-step-12 font-medium text-text-2 hover:bg-hover hover:text-text-0"
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {items.length === 0 ? (
          <p className="py-10 text-step-15 font-semibold text-text-0">{t("home.noResults")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-9" data-testid="references-grid">
            {items.map((item) => (
              <ReferenceCard key={item.id} item={item} onOpen={() => setSelectedId(item.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
