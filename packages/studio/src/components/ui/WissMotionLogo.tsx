export function WissMotionLogo() {
  // Marca WissMotion: baldosa redondeada con degradado violeta→cian y
  // triángulo play, más wordmark como texto (hereda el color del tema,
  // así lee en claro y oscuro). Dibujo original del producto.
  return (
    <span className="flex items-center gap-2 text-text-0" role="img" aria-label="WissMotion">
      <svg width={26} height={26} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient
            id="wm-logo-g"
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#7c3aed" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#wm-logo-g)" />
        <path d="M13 10.5v11l9-5.5-9-5.5Z" fill="#ffffff" />
      </svg>
      <span className="text-step-18 font-bold tracking-tight">WissMotion</span>
    </span>
  );
}
