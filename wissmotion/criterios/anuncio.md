# Criterio: anuncio

Para vender o convertir: una oferta, un precio, un evento, un testimonio, un
anuncio pagado en redes. Manda **que se actúe**: se mide por el clic, no por
lo bonito. Mantiene la limpieza del promo de marca (`promo-marca.md` §1 y §3)
y cambia las prioridades.

## Estructura

1. **Gancho en el primer segundo**: el beneficio, la cifra o la pregunta.
   Nada de intro con logo antes del gancho.
2. **La oferta**: precio, descuento, fecha o prueba social, en grande y
   centrado (`counter-up`, `number-roll`, `spring-pop`).
3. **Por qué ahora**: urgencia real (fecha límite, plazas), si la hay.
4. **CTA**: verbo + destino («Descárgala gratis», «Reserva en tu.web»),
   visible al menos 2 s al final, con el logo.

## Imagen

- La marca aparece pronto (color, logo pequeño en esquina) para que se
  recuerde de quién era el anuncio aunque se salte.
- Texto grande y corto: se lee en el móvil, sin sonido, a medio scroll.
- Un único mensaje: una oferta por anuncio.
- Respetar zonas seguras de cada red (la UI de Reels/TikTok tapa abajo y a la derecha).

## Ritmo y audio

- 6-15 s (30 s máximo). Arranque rápido, frenar en la oferta, CTA quieto.
- Debe funcionar en silencio: todo lo importante está escrito.
- Música 115-123 BPM o más si la marca lo aguanta; cortes al beat.

## Formato

9:16 y 1:1 primero (redes), 16:9 después. Render por destinos con
`render-batch.mjs --dest reels,tiktok,shorts`.

## Revisión antes de renderizar

- [ ] El gancho está en el primer segundo.
- [ ] Hay un solo mensaje y una sola oferta.
- [ ] El CTA tiene verbo y destino y se ve ≥ 2 s.
- [ ] Se entiende sin sonido.
- [ ] Nada importante cae fuera de la zona segura del formato.
