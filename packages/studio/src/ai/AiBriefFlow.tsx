import { useState } from "react";
import { Button, Input, Select } from "../ui";
import { useLanguage } from "../i18n/LanguageContext";
import { draftStoryboard, type StoryboardScene } from "./localDraft";
import { WISSMOTION_TEMPLATES } from "../home/wissmotionTemplates";
import { installWissmotionTemplate } from "../home/wissmotionInstall";

interface EditableScene extends StoryboardScene {
  beatText: string;
}

/**
 * Flujo brief → guion → storyboard → composición (Fase 7 sin tokens):
 * el borrador local propone, el usuario aprueba/editando cada paso y crea
 * una composición por escena en el proyecto actual. La generación con
 * proveedor enchufa aquí cuando haya clave (usa el mismo storyboard).
 */
export function AiBriefFlow({
  projectId,
  onOpenProject,
}: {
  projectId: string;
  onOpenProject: (projectId: string, compPath?: string) => void;
}) {
  const { t } = useLanguage();
  const [producto, setProducto] = useState("");
  const [publico, setPublico] = useState("");
  const [plan, setPlan] = useState<EditableScene[] | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string[] | null>(null);

  const generate = () => {
    const { beats, scenes } = draftStoryboard({ producto: producto || "Mi producto", publico });
    setPlan(scenes.map((s, i) => ({ ...s, beatText: beats[i]?.texto ?? "" })));
    setCreated(null);
    setError(null);
  };

  const setSceneTemplate = (index: number, template: string) => {
    setPlan((prev) =>
      (prev ?? []).map((s, i) => (i === index ? { ...s, plantilla: template } : s)),
    );
  };

  const setBeatText = (index: number, text: string) => {
    setPlan((prev) => (prev ?? []).map((s, i) => (i === index ? { ...s, beatText: text } : s)));
  };

  async function handleCreate() {
    if (!plan || working) return;
    setWorking(true);
    setError(null);
    try {
      const paths: string[] = [];
      for (const [i, scene] of plan.entries()) {
        const template = WISSMOTION_TEMPLATES.find((item) => item.id === scene.plantilla);
        if (!template) throw new Error(`${t("brief.unknownTemplate")}: ${scene.plantilla}`);
        paths.push(
          await installWissmotionTemplate(projectId, template, {
            fileName: `escena-${i + 1}-${template.id}.html`,
          }),
        );
      }
      setCreated(paths);
      onOpenProject(projectId, paths[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-3 px-3 py-3" data-testid="brief-flow">
      <div className="grid gap-2">
        <label className="grid gap-1 text-step-12 text-text-1">
          <span>{t("brief.product")}</span>
          <Input value={producto} placeholder="Mi App" onCommit={setProducto} />
        </label>
        <label className="grid gap-1 text-step-12 text-text-1">
          <span>{t("brief.audience")}</span>
          <Input value={publico} placeholder="equipos de marketing" onCommit={setPublico} />
        </label>
        <div>
          <Button variant="primary" disabled={!producto.trim() || working} onClick={generate}>
            {t("brief.generate")}
          </Button>
        </div>
      </div>
      {plan ? (
        <div className="grid gap-2">
          {plan.map((scene, i) => (
            <div key={i} className="grid gap-1.5 rounded-md border border-border-strong p-2">
              <span className="text-step-11 font-semibold text-text-3">
                {t("brief.scene")} {scene.escena} · {scene.motion}
              </span>
              <Input
                aria-label={`${t("brief.beat")} ${scene.escena}`}
                value={scene.beatText}
                onCommit={(next) => setBeatText(i, next)}
              />
              <Select
                label={`${t("brief.template")} ${scene.escena}`}
                value={scene.plantilla}
                options={WISSMOTION_TEMPLATES.map((item) => ({ label: item.name, value: item.id }))}
                onCommit={(next) => setSceneTemplate(i, next)}
              />
            </div>
          ))}
          <div>
            <Button variant="primary" disabled={working} onClick={() => void handleCreate()}>
              {working ? t("brief.creating") : t("brief.create")}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-step-12 text-danger-ink">
          {error}
        </p>
      ) : null}
      {created ? (
        <div className="grid gap-1.5">
          <p role="status" className="text-step-12 text-text-2">
            {t("brief.created")}: {created.length}
          </p>
          <div>
            <Button variant="ghost" onClick={() => onOpenProject(projectId, created[0])}>
              {t("brief.openFirst")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
