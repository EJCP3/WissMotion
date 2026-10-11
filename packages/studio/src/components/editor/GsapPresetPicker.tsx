import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { loadMotionPresets } from "../../motion/wissmotionPresets";
import { SelectField } from "./propertyPanelPrimitives";

/**
 * Aplica un preset de movimiento WissMotion al elemento seleccionado:
 * inserta el tween completo (método + vars + easing + duración) en una sola
 * mutación, por el mismo camino que el alta manual.
 */
export function GsapPresetPicker({ onApplyPreset }: { onApplyPreset: (presetId: string) => void }) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const presets = loadMotionPresets();
  return (
    <SelectField
      label={t("motion.presetLabel")}
      value={value}
      options={presets.map((p) => p.id)}
      onChange={(next) => {
        if (!next) return;
        setValue(next);
        onApplyPreset(next);
      }}
    />
  );
}
