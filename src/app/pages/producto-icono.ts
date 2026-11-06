import { Component, computed, input } from '@angular/core';

export type TipoProducto =
  'teclado' | 'monitor' | 'mouse' | 'notebook' | 'audio' | 'cable' | 'otro';

/** Deduce la categoría desde el nombre, porque la API de productos no trae imagen ni categoría. */
export function tipoDeProducto(nombre: string): TipoProducto {
  const n = nombre.toLowerCase();
  if (n.includes('teclado')) return 'teclado';
  if (n.includes('monitor') || n.includes('pantalla')) return 'monitor';
  if (n.includes('mouse')) return 'mouse';
  if (n.includes('notebook') || n.includes('laptop')) return 'notebook';
  if (
    n.includes('audífono') ||
    n.includes('audifono') ||
    n.includes('headset') ||
    n.includes('parlante')
  )
    return 'audio';
  if (n.includes('cable') || n.includes('hdmi') || n.includes('usb') || n.includes('cargador'))
    return 'cable';
  return 'otro';
}

/** Dibujo de línea del producto, en el color del texto que lo rodea. */
@Component({
  selector: 'app-producto-icono',
  host: { style: 'display:block' },
  template: `
    <svg
      viewBox="0 0 48 48"
      width="100%"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (tipo()) {
        @case ('teclado') {
          <rect x="3" y="15" width="42" height="19" rx="3" />
          <path d="M9 21h2M15 21h2M21 21h2M27 21h2M33 21h6M9 27h4M17 27h14M35 27h4" />
        }
        @case ('monitor') {
          <rect x="5" y="7" width="38" height="25" rx="2" />
          <path d="M24 32v6M16 41h16" />
        }
        @case ('mouse') {
          <rect x="15" y="6" width="18" height="35" rx="9" />
          <path d="M24 6v11M15 17h18" />
        }
        @case ('notebook') {
          <rect x="9" y="9" width="30" height="21" rx="2" />
          <path d="M3 37h42l-3.5-7h-35z" />
        }
        @case ('audio') {
          <path d="M9 29v-5a15 15 0 0 1 30 0v5" />
          <rect x="6" y="28" width="8" height="12" rx="2" />
          <rect x="34" y="28" width="8" height="12" rx="2" />
        }
        @case ('cable') {
          <path
            d="M13 5v9M21 5v9M9 14h16v7a8 8 0 0 1-16 0zM17 29v5a7 7 0 0 0 7 7h3a7 7 0 0 0 7-7V18"
          />
        }
        @default {
          <rect x="12" y="12" width="24" height="24" rx="3" />
          <path
            d="M19 19h10v10H19zM18 5v7M24 5v7M30 5v7M18 36v7M24 36v7M30 36v7M5 18h7M5 24h7M5 30h7M36 18h7M36 24h7M36 30h7"
          />
        }
      }
    </svg>
  `,
})
export class ProductoIcono {
  readonly nombre = input('');
  protected readonly tipo = computed(() => tipoDeProducto(this.nombre()));
}
