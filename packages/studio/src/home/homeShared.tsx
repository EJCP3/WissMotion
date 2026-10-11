// Piezas compartidas del Home: estado de carga/error y selector de proyecto.

import type { ReactNode } from "react";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useLanguage } from "../i18n/LanguageContext";
import type { HomeProject } from "./homeApi";
import type { HomeProjectsStatus } from "./useHomeProjects";

export function HomeStateMessage({
  status,
  onRetry,
  children,
}: {
  status: HomeProjectsStatus;
  onRetry: () => void;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  if (status === "ready") return <>{children}</>;
  if (status === "error") {
    return (
      <div className="py-10">
        <p role="alert" className="flex items-center gap-1.5 text-step-13 text-danger-ink">
          <WarningCircle size={15} aria-hidden="true" />
          {t("home.loadError")}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 h-ctl rounded-md border border-border-strong px-3 text-step-12 font-medium text-text-1 hover:bg-hover"
        >
          {t("home.retry")}
        </button>
      </div>
    );
  }
  if (status === "waiting") {
    return (
      <div className="flex items-center gap-2 py-10 text-step-13 text-text-2">
        <SpinnerGap size={16} className="animate-spin" aria-hidden="true" />
        {t("home.waiting")}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-9" aria-hidden="true">
      {[0, 1, 2, 3].map((key) => (
        <div key={key}>
          <div className="aspect-video w-full animate-pulse rounded-sm bg-hover" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded-sm bg-hover" />
        </div>
      ))}
    </div>
  );
}

export function ProjectTargetSelect({
  projects,
  value,
  onChange,
  label,
}: {
  projects: HomeProject[];
  value: string | null;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-step-12 text-text-2">
      {label}
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-ctl rounded-md border border-border-strong bg-surface px-2 text-step-12 font-medium text-text-0"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title ?? project.id}
          </option>
        ))}
      </select>
    </label>
  );
}
