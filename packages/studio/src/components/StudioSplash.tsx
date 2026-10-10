import { useLanguage } from "../i18n/LanguageContext";
import { WissMotionLogo } from "./ui/WissMotionLogo";

export function StudioSplash({ waiting }: { waiting?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="h-full w-full bg-neutral-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 px-6 text-center" role="status">
        <WissMotionLogo />
        {waiting ? (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="w-4 h-4 rounded-full border-2 border-neutral-700 border-t-neutral-500 animate-spin motion-reduce:animate-none" />
            <p className="text-xs text-neutral-600">
              {t("splash.waitingPrefix")}{" "}
              <code className="text-neutral-500 font-mono">npm run dev</code>
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="w-4 h-4 rounded-full bg-studio-accent animate-pulse motion-reduce:animate-none" />
            <p className="text-xs text-neutral-600">{t("splash.connecting")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
