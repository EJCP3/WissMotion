// Vista Borradores: título grande, acción "Crear archivo nuevo" violeta
// cuadrada y rejilla de proyectos con miniatura del servidor.

import { useEffect, useState } from "react";
import { FilmStrip, Plus, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  createBlankComposition,
  getHomeProjectDetails,
  projectThumbnailUrl,
  type HomeProject,
  type HomeProjectDetails,
} from "./homeApi";
import type { HomeProjectsStatus } from "./useHomeProjects";
import { HomeStateMessage, ProjectTargetSelect } from "./homeShared";

function ProjectCard({
  project,
  onOpen,
}: {
  project: HomeProject;
  onOpen: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const [details, setDetails] = useState<HomeProjectDetails | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    void getHomeProjectDetails(project.id).then((result) => {
      if (cancelled) return;
      setDetails(result);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const compositions = details?.compositions ?? [];
  const title = details?.title ?? project.title ?? project.id;
  const cover = compositions[0] ?? null;
  const countLabel =
    compositions.length === 1
      ? `1 ${t("home.composition")}`
      : `${compositions.length} ${t("home.compositions")}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(project.id, cover ?? undefined)}
      className="group block w-full rounded-sm text-left focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="block aspect-video w-full overflow-hidden rounded-sm bg-hover">
        {cover && !thumbFailed ? (
          <img
            src={projectThumbnailUrl(project.id, cover)}
            alt=""
            loading="lazy"
            onError={() => setThumbFailed(true)}
            className="h-full w-full object-cover transition-transform duration-hover group-hover:scale-[1.02]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center" aria-hidden="true">
            {loaded ? (
              <FilmStrip size={40} weight="light" className="text-text-off" />
            ) : (
              <span className="size-10 animate-pulse rounded-full bg-press" />
            )}
          </span>
        )}
      </span>
      <span className="mt-3 block truncate text-step-14 font-semibold text-text-0">{title}</span>
      <span className="mt-0.5 block text-step-12 text-text-2">
        {loaded ? countLabel : t("home.loading")}
      </span>
    </button>
  );
}

export function DraftsView({
  projects,
  status,
  onRetry,
  search,
  onOpenProject,
}: {
  projects: HomeProject[];
  status: HomeProjectsStatus;
  onRetry: () => void;
  search: string;
  onOpenProject: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);

  const query = search.trim().toLowerCase();
  const visible = query
    ? projects.filter(
        (project) =>
          project.id.toLowerCase().includes(query) || project.title?.toLowerCase().includes(query),
      )
    : projects;
  const target = targetId ?? projects[0]?.id ?? null;

  async function handleCreate() {
    if (!target || creating) return;
    setCreating(true);
    setCreateError(false);
    try {
      const path = await createBlankComposition(target);
      onOpenProject(target, path);
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="text-5xl font-bold tracking-tight text-text-0">{t("home.drafts")}</h1>
      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!target || creating}
          className="flex h-ctl-lg items-center gap-2 rounded-none bg-accent px-5 text-step-13 font-semibold text-on-accent transition-transform duration-press enabled:active:scale-[0.98] disabled:opacity-40"
        >
          {creating ? (
            <SpinnerGap size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus size={16} weight="bold" aria-hidden="true" />
          )}
          {creating ? t("home.creating") : t("home.createNew")}
        </button>
        {projects.length > 1 ? (
          <ProjectTargetSelect
            projects={projects}
            value={target}
            onChange={setTargetId}
            label={t("home.inProject")}
          />
        ) : null}
      </div>
      {createError ? (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-step-12 text-danger-ink">
          <WarningCircle size={14} aria-hidden="true" />
          {t("home.createError")}
        </p>
      ) : null}
      <div className="mt-8">
        <HomeStateMessage status={status} onRetry={onRetry}>
          {visible.length === 0 ? (
            <div className="py-10">
              <p className="text-step-15 font-semibold text-text-0">
                {query ? t("home.noResults") : t("home.noFiles")}
              </p>
              {query ? null : (
                <p className="mt-1 text-step-13 text-text-2">{t("home.noFilesHint")}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-9">
              {visible.map((project) => (
                <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
              ))}
            </div>
          )}
        </HomeStateMessage>
      </div>
    </div>
  );
}
