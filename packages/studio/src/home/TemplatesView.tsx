// Vista Plantillas: rejilla estilo Jitter del catálogo (examples + blocks).
// Clic en una tarjeta → instala en el proyecto destino y abre el editor.

import { useMemo, useState } from "react";
import { SpinnerGap, SquaresFour, WarningCircle } from "@phosphor-icons/react";
import type { RegistryItem } from "@hyperframes/core/registry";
import { useLanguage } from "../i18n/LanguageContext";
import { useBlockCatalog } from "../hooks/useBlockCatalog";
import { BLOCK_CATEGORIES, type BlockCategory } from "../utils/blockCategories";
import { installTemplateBlock, type HomeProject } from "./homeApi";
import { WissmotionSection } from "./WissmotionSection";
import type { HomeProjectsStatus } from "./useHomeProjects";
import { HomeStateMessage, ProjectTargetSelect } from "./homeShared";

type CatalogEntry = RegistryItem & { category: BlockCategory };

function categoryLabel(category: BlockCategory): string {
  return BLOCK_CATEGORIES.find((meta) => meta.id === category)?.label ?? category;
}

function TemplateCard({
  item,
  targetId,
  onOpen,
}: {
  item: CatalogEntry;
  targetId: string | null;
  onOpen: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const poster = item.preview?.poster ?? null;
  const duration = "duration" in item && typeof item.duration === "number" ? item.duration : null;

  async function handleUse() {
    if (!targetId || working) return;
    setWorking(true);
    setFailed(false);
    try {
      const compPath = await installTemplateBlock(targetId, item.name);
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
          {poster && !thumbFailed ? (
            <img
              src={poster}
              alt=""
              loading="lazy"
              onError={() => setThumbFailed(true)}
              className="h-full w-full object-cover transition-transform duration-hover group-hover:scale-[1.02]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center" aria-hidden="true">
              <SquaresFour size={40} weight="light" className="text-text-off" />
            </span>
          )}
          {working ? (
            <span className="absolute inset-0 flex items-center justify-center bg-bg-0/60">
              <SpinnerGap size={28} className="animate-spin text-text-0" aria-hidden="true" />
            </span>
          ) : null}
        </span>
        <span className="mt-3 block truncate text-step-14 font-semibold text-text-0">
          {item.title}
        </span>
        <span className="mt-0.5 block text-step-12 text-text-2">
          {categoryLabel(item.category)}
          {duration !== null ? ` · ${duration}s` : ""}
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

export function TemplatesView({
  projects,
  status,
  onRetry,
  search,
  category,
  onOpenProject,
}: {
  projects: HomeProject[];
  status: HomeProjectsStatus;
  onRetry: () => void;
  search: string;
  category: BlockCategory | null;
  onOpenProject: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const catalog = useBlockCatalog();
  const [targetId, setTargetId] = useState<string | null>(null);
  const target = targetId ?? projects[0]?.id ?? null;

  const query = search.trim().toLowerCase();
  const items: CatalogEntry[] = useMemo(() => {
    return catalog.blocks.filter((item) => {
      if (category && item.category !== category) return false;
      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [catalog.blocks, category, query]);

  return (
    <div>
      <h1 className="text-5xl font-bold tracking-tight text-text-0">{t("home.templates")}</h1>
      <div className="mt-8">
        <WissmotionSection
          projects={projects}
          status={status}
          search={search}
          visible={category === null}
          onOpenProject={onOpenProject}
        />
      </div>
      {projects.length > 1 ? (
        <div className="mt-7">
          <ProjectTargetSelect
            projects={projects}
            value={target}
            onChange={setTargetId}
            label={t("home.inProject")}
          />
        </div>
      ) : null}
      <div className="mt-8">
        <HomeStateMessage
          status={catalog.loading ? "loading" : catalog.error ? "error" : status}
          onRetry={catalog.error ? () => window.location.reload() : onRetry}
        >
          {items.length === 0 ? (
            <div className="py-10">
              <p className="text-step-15 font-semibold text-text-0">
                {query ? t("home.noResults") : t("home.noTemplates")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-9">
              {items.map((item) => (
                <TemplateCard
                  key={item.name}
                  item={item}
                  targetId={target}
                  onOpen={onOpenProject}
                />
              ))}
            </div>
          )}
        </HomeStateMessage>
      </div>
    </div>
  );
}
