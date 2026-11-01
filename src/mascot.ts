/** Original Nok artwork; only static, trusted markup enters the SVG. */
export const nok = `
<svg class="nok" viewBox="0 0 100 108" fill="none" aria-hidden="true">
  <defs>
    <radialGradient id="nok-body" cx=".29" cy=".16" r=".92"><stop stop-color="#575754"/><stop offset=".47" stop-color="#393A38"/><stop offset="1" stop-color="#242624"/></radialGradient>
    <linearGradient id="nok-rim" x1="19" y1="10" x2="83" y2="92" gradientUnits="userSpaceOnUse"><stop stop-color="#FFFFFF" stop-opacity=".24"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
    <filter id="nok-shadow" x="-30%" y="-150%" width="160%" height="400%"><feGaussianBlur stdDeviation="3.4"/></filter>
    <filter id="nok-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".78" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="soft-light"/></filter>
  </defs>
  <ellipse class="nok-shadow" cx="49" cy="98" rx="28" ry="3.1" fill="#252722" opacity=".18" filter="url(#nok-shadow)"/>
  <g class="nok-body">
    <path d="M49 8C25 7 9 23 8 46C6 70 19 85 43 87C52 88 60 85 65 87L83 96C87 98 91 96 89 90L83 70C89 61 92 52 89 39C85 20 69 9 49 8Z" fill="url(#nok-body)"/>
    <path d="M49 8C25 7 9 23 8 46C6 70 19 85 43 87C52 88 60 85 65 87L83 96C87 98 91 96 89 90L83 70C89 61 92 52 89 39C85 20 69 9 49 8Z" fill="url(#nok-body)" filter="url(#nok-grain)" opacity=".16"/>
    <path d="M49 8C25 7 9 23 8 46C6 70 19 85 43 87C52 88 60 85 65 87L83 96C87 98 91 96 89 90L83 70C89 61 92 52 89 39C85 20 69 9 49 8Z" stroke="url(#nok-rim)" stroke-width="1.1"/>
    <g class="nok-gaze">
      <g class="nok-blink"><ellipse class="eye eye-left" cx="34" cy="46" rx="4.5" ry="9" fill="#FFF8E9"/><ellipse class="eye eye-right" cx="57" cy="43" rx="4.5" ry="9" fill="#FFF8E9"/></g>
      <g class="nok-happy" stroke="#FFF8E9" stroke-width="4.5" stroke-linecap="round"><path d="M29 47Q34 37 39 47"/><path d="M52 44Q57 34 62 44"/></g>
    </g>
    <rect class="nok-cheek" x="69" y="50" width="12" height="5.8" rx="2.9" transform="rotate(-29 69 50)" fill="#FF977C"/>
  </g>
</svg>`;

const paths = {
  select: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/>',
  notes: '<path d="M5 3h14a2 2 0 0 1 2 2v12l-5 4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 8h10M7 12h8m-8 4h4m5 5v-4h5"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',
  edit: '<path d="m14 4 6 6M4 20l5-1L20 8a2 2 0 0 0-6-6L3 13l-1 7Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
};

export function icon(name: keyof typeof paths): SVGElement {
  const container = document.createElement('span');
  container.innerHTML = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  return container.firstElementChild as SVGElement;
}
