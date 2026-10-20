// Duraciones variables (Fase 3): re-escala una composición a otra duración sin
// tocar el código de la plantilla. Los tiempos de los clips (data-start /
// data-duration) se multiplican por el factor y la timeline raíz se envuelve
// en una exterior pausada con timeScale: el seek del runtime sobre la exterior
// llega escalado a la original, así que sigue siendo seek-safe y determinista.

const TIME_ATTR = /(\sdata-(?:start|duration)=")([\d.]+)(")/g;

function round(n) {
  return Number(n.toFixed(3));
}

export function retimeHtml(html, { from, to }) {
  if (!(from > 0) || !(to > 0)) throw new Error("duración inválida");
  if (from === to) return html;
  const factor = to / from;
  const id = /data-composition-id="([^"]+)"/.exec(html)?.[1];
  if (!id) throw new Error("composición sin data-composition-id");
  const scaled = html.replace(TIME_ATTR, (_m, pre, value, post) => {
    return `${pre}${round(Number(value) * factor)}${post}`;
  });
  // Tras el <script> que registra la timeline raíz.
  const reg = scaled.indexOf(`__timelines["${id}"]`);
  if (reg === -1) throw new Error(`no encuentro window.__timelines["${id}"]`);
  const end = scaled.indexOf("</script>", reg);
  if (end === -1) throw new Error("script de la timeline sin cerrar");
  const at = end + "</script>".length;
  const wrapper = `
      <script data-wm-retime="${round(factor)}">
        (() => {
          const inner = window.__timelines[${JSON.stringify(id)}];
          const outer = gsap.timeline({ paused: true });
          inner.paused(false);
          inner.timeScale(${round(1 / factor)});
          outer.add(inner, 0);
          window.__timelines[${JSON.stringify(id)}] = outer;
        })();
      </script>`;
  return scaled.slice(0, at) + wrapper + scaled.slice(at);
}
