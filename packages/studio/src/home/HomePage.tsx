// Home estilo Jitter: header blanco con logo + "Mis archivos" + avatar,
// sidebar con buscador píldora y navegación, y contenido (Borradores/Plantillas).

import { useState } from "react";
import {
  FileText,
  FilmReel,
  MagnifyingGlass,
  Sparkle,
  SquaresFour,
  Stack,
} from "@phosphor-icons/react";
import { useLanguage } from "../i18n/LanguageContext";
import { WissMotionLogo } from "../components/ui/WissMotionLogo";
import { buildHomeHash, type HomeView } from "./homeRoutes";
import { useHomeProjects } from "./useHomeProjects";
import { DraftsView } from "./DraftsView";
import { TemplatesView, type TemplateSource } from "./TemplatesView";

interface HomePageProps {
  view: HomeView;
  onNavigate: (view: HomeView) => void;
  onOpenProject: (projectId: string, compPath?: string) => void;
}

function NavItem({
  icon: ItemIcon,
  label,
  active,
  onClick,
}: {
  icon: typeof SquaresFour;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active || undefined}
      className={
        active
          ? "flex w-full items-center gap-2.5 rounded-md bg-on px-3 py-2 text-step-13 font-medium text-text-0"
          : "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-step-13 font-medium text-text-2 hover:bg-hover hover:text-text-0"
      }
    >
      <ItemIcon size={17} weight="regular" className="shrink-0 text-accent-ink" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function HomeSidebar({
  view,
  search,
  onSearch,
  source,
  onSource,
  onNavigate,
}: {
  view: HomeView;
  search: string;
  onSearch: (value: string) => void;
  source: TemplateSource;
  onSource: (source: TemplateSource) => void;
  onNavigate: (view: HomeView) => void;
}) {
  const { t } = useLanguage();
  return (
    <aside className="w-60 shrink-0">
      <label className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5">
        <MagnifyingGlass size={15} className="shrink-0 text-text-4" />
        <span className="sr-only">{t("home.search")}</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t("home.search")}
          className="w-full bg-transparent text-step-13 text-text-0 outline-none placeholder:text-text-4"
        />
      </label>
      <p className="px-3 pb-1.5 pt-5 text-step-11 font-medium text-text-4">
        {t("home.getStarted")}
      </p>
      <nav className="flex flex-col gap-0.5" aria-label={t("home.home")}>
        <NavItem
          icon={FileText}
          label={t("home.drafts")}
          active={view === "drafts"}
          onClick={() => onNavigate("drafts")}
        />
        <NavItem
          icon={SquaresFour}
          label={t("home.templates")}
          active={view === "templates"}
          onClick={() => onNavigate("templates")}
        />
      </nav>
      {view === "templates" ? (
        <>
          <div className="mx-3 my-3 border-t border-border" aria-hidden="true" />
          <nav className="flex flex-col gap-0.5" aria-label={t("home.templates")}>
            <NavItem
              icon={Sparkle}
              label="WissMotion"
              active={source === "wissmotion"}
              onClick={() => onSource("wissmotion")}
            />
            <NavItem
              icon={Stack}
              label="HyperFrames"
              active={source === "hyperframes"}
              onClick={() => onSource("hyperframes")}
            />
            <NavItem
              icon={FilmReel}
              label={t("home.references")}
              active={source === "references"}
              onClick={() => onSource("references")}
            />
          </nav>
        </>
      ) : null}
    </aside>
  );
}

export function HomePage({ view, onNavigate, onOpenProject }: HomePageProps) {
  const { t } = useLanguage();
  const { projects, status, retry } = useHomeProjects();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<TemplateSource>("wissmotion");

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-bg-0 text-text-0">
      <header className="flex h-16 shrink-0 items-center justify-between px-8">
        <a
          href={buildHomeHash("drafts")}
          onClick={(event) => {
            event.preventDefault();
            setSearch("");
            onNavigate("drafts");
          }}
          aria-label={t("home.home")}
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-accent"
        >
          <WissMotionLogo />
        </a>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("drafts")}
            className="h-10 rounded-none bg-text-0 px-6 text-step-13 font-semibold text-bg-0 transition-transform duration-press enabled:active:scale-[0.98]"
          >
            {t("home.myFiles")}
          </button>
          <span
            className="flex size-9 items-center justify-center rounded-full bg-accent text-step-14 font-bold text-on-accent"
            aria-hidden="true"
          >
            W
          </span>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-12 px-8 pb-16">
        <HomeSidebar
          view={view}
          search={search}
          onSearch={setSearch}
          source={source}
          onSource={setSource}
          onNavigate={onNavigate}
        />
        <main className="min-w-0 flex-1 pt-1">
          {view === "drafts" ? (
            <DraftsView
              projects={projects}
              status={status}
              onRetry={retry}
              search={search}
              onOpenProject={onOpenProject}
            />
          ) : (
            <TemplatesView
              projects={projects}
              status={status}
              onRetry={retry}
              search={search}
              source={source}
              onOpenProject={onOpenProject}
            />
          )}
        </main>
      </div>
    </div>
  );
}
