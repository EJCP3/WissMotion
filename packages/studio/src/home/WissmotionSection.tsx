// Sección WissMotion de la galería: las 12 plantillas del producto con su
// póster, instalables en el proyecto destino con la marca del panel Marca
// ya aplicada. Debajo del buscador, encima del catálogo upstream.

import { useMemo, useState } from "react";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useLanguage } from "../i18n/LanguageContext";
import { installWissmotionTemplate } from "./wissmotionInstall";
import { WISSMOTION_TEMPLATES, type WissmotionTemplate } from "./wissmotionTemplates";
import type { HomeProject } from "./homeApi";
import { HomeStateMessage, ProjectTargetSelect } from "./homeShared";
import type { HomeProjectsStatus } from "./useHomeProjects";

function WissmotionCard({
  item,
  targetId,
  onOpen,
}: {
  item: WissmotionTemplate;
  targetId: string | null;
  onOpen: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  async function handleUse() {
    if (!targetId || working) return;
    setWorking(true);
    setFailed(false);
    try {
      const compPath = await installWissmotionTemplate(targetId, item);
      onOpen(targetId, compPath);
    } catch {
      setFailed(true);
      setWorking(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleUse}
        disabled={!targetId || working}
        className="group block w-full rounded-sm text-left focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed"
      >
        <span className="relative block aspect-video w-full overflow-hidden rounded-sm bg-hover">
          {!thumbFailed ? (
            <img
              src={item.poster}
              alt=""
              loading="lazy"
              onError={() => setThumbFailed(true)}
              className="h-full w-full object-cover transition-transform duration-hover group-hover:scale-[1.02]"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-step-14 font-bold text-text-off"
              aria-hidden="true"
            >
              W
            </span>
          )}
          {working ? (
            <span className="absolute inset-0 flex items-center justify-center bg-bg-0/60">
              <SpinnerGap size={28} className="animate-spin text-text-0" aria-hidden="true" />
            </span>
          ) : null}
        </span>
        <span className="mt-3 block truncate text-step-14 font-semibold text-text-0">
          {item.name}
        </span>
        <span className="mt-0.5 block text-step-12 text-text-2">
          WissMotion{item.duration ? ` · ${item.duration}s` : ""}
        </span>
      </button>
      {failed ? (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-step-12 text-danger-ink">
          <WarningCircle size={14} aria-hidden="true" />
          {t("home.installError")}
        </p>
      ) : null}
    </div>
  );
}

export function WissmotionSection({
  projects,
  status,
  search,
  visible,
  onOpenProject,
}: {
  projects: HomeProject[];
  status: HomeProjectsStatus;
  search: string;
  visible: boolean;
  onOpenProject: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const [targetId, setTargetId] = useState<string | null>(null);
  const target = targetId ?? projects[0]?.id ?? null;
  const query = search.trim().toLowerCase();

  const items = useMemo(() => {
    if (!query) return WISSMOTION_TEMPLATES;
    return WISSMOTION_TEMPLATES.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.id.includes(query),
    );
  }, [query]);

  if (!visible || items.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="text-step-16 font-bold tracking-tight text-text-0">WissMotion</h2>
      {projects.length > 1 ? (
        <div className="mt-4">
          <ProjectTargetSelect
            projects={projects}
            value={target}
            onChange={setTargetId}
            label={t("home.inProject")}
          />
        </div>
      ) : null}
      <div className="mt-5">
        <HomeStateMessage status={status} onRetry={() => window.location.reload()}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-9" data-testid="wissmotion-grid">
            {items.map((item) => (
              <WissmotionCard key={item.id} item={item} targetId={target} onOpen={onOpenProject} />
            ))}
          </div>
        </HomeStateMessage>
      </div>
    </div>
  );
}
