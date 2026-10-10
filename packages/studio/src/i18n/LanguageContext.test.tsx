// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider, STUDIO_LANG_KEY, parseStoredLang, useLanguage } from "./LanguageContext";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mounted: { root: Root; host: HTMLElement } | null = null;
afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("lang");
  if (!mounted) return;
  const { root, host } = mounted;
  mounted = null;
  act(() => root.unmount());
  host.remove();
});

function Probe() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div>
      <span data-testid="text">{t("header.capture")}</span>
      <span data-testid="lang">{lang}</span>
      <button type="button" data-testid="to-en" onClick={() => setLang("en")} />
    </div>
  );
}

async function mount(node: React.ReactNode): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mounted = { root, host };
  await act(async () => root.render(node));
  return host;
}

const text = (host: HTMLElement, id: string) =>
  host.querySelector(`[data-testid="${id}"]`)?.textContent;

describe("LanguageContext", () => {
  it("sin provider traduce en español por defecto", async () => {
    const host = await mount(<Probe />);
    expect(text(host, "text")).toBe("Capturar");
    expect(text(host, "lang")).toBe("es");
  });

  it("el provider respeta el idioma guardado y sincroniza <html lang>", async () => {
    localStorage.setItem(STUDIO_LANG_KEY, "en");
    const host = await mount(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(text(host, "text")).toBe("Capture");
    expect(document.documentElement.lang).toBe("en");
  });

  it("un valor guardado inválido cae a español", async () => {
    expect(parseStoredLang("fr")).toBe("es");
    expect(parseStoredLang(null)).toBe("es");
    localStorage.setItem(STUDIO_LANG_KEY, "fr");
    const host = await mount(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(text(host, "text")).toBe("Capturar");
  });

  it("cambiar idioma re-renderiza y persiste", async () => {
    const host = await mount(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(text(host, "text")).toBe("Capturar");
    await act(async () => {
      host
        .querySelector('[data-testid="to-en"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(text(host, "text")).toBe("Capture");
    expect(localStorage.getItem(STUDIO_LANG_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });
});
