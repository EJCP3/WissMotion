// Sistema i18n del Studio (WissMotion): español por defecto, inglés alterno.
// Sin dependencias: diccionarios tipados (la paridad es/en la exige el
// compilador) + contexto React con persistencia en localStorage.
// Las superficies migran progresivamente: cada string visible nuevo usa t().

export type StudioLang = "es" | "en";
export const studioDefaultLang: StudioLang = "es";
export const studioLanguages: StudioLang[] = ["es", "en"];

const es = {
  "splash.connecting": "Conectando al proyecto…",
  "splash.waitingPrefix": "Esperando al servidor de vista previa… ejecuta",
  "header.capture": "Capturar",
  "header.capturing": "Capturando…",
  "header.captureTooltip": "Capturar el fotograma actual",
  "header.capturingTooltip": "Capturando fotograma…",
  "header.inspector": "Inspector",
  "header.export": "Exportar",
  "header.rendering": "Renderizando…",
  "header.exportTooltip": "Renderizar y exportar esta composición",
  "header.renderInProgress": "Ya hay un render en curso",
  "header.ffmpegMissing":
    "FFmpeg no está instalado. Abre el panel de renders con el comando de instalación.",
  "header.language": "Idioma",
} as const;

const en: Record<keyof typeof es, string> = {
  "splash.connecting": "Connecting to project…",
  "splash.waitingPrefix": "Waiting for preview server… run",
  "header.capture": "Capture",
  "header.capturing": "Capturing…",
  "header.captureTooltip": "Capture current frame",
  "header.capturingTooltip": "Capturing frame…",
  "header.inspector": "Inspector",
  "header.export": "Export",
  "header.rendering": "Rendering…",
  "header.exportTooltip": "Render and export this composition",
  "header.renderInProgress": "A render is already in progress",
  "header.ffmpegMissing":
    "FFmpeg is not installed. Opens the Renders panel with the install command.",
  "header.language": "Language",
};

export type StudioStringKey = keyof typeof es;

export const dictionaries: Record<StudioLang, Record<StudioStringKey, string>> = { es, en };
