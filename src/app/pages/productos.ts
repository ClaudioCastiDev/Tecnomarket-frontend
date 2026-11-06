import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { mensajeDeError } from '../core/mensajes';
import { Producto } from '../core/models';
import { PedidosService } from '../core/pedidos.service';
import { ProductosService } from '../core/productos.service';
import { SCOPE_PEDIDOS_WRITE } from '../core/scopes';
import { ProductoIcono } from './producto-icono';

/** El stock se descuenta de forma asíncrona (RabbitMQ): se vuelve a consultar en estos momentos tras comprar. */
const REVISIONES_MS = [1500, 4000];
const STOCK_BAJO = 5;

interface Aviso {
  ok: boolean;
  texto: string;
}

/** Sin tildes ni mayúsculas, para que "audifono" encuentre "Audífonos". */
const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

@Component({
  selector: 'app-productos',
  imports: [ProductoIcono],
  template: `
    <div class="encabezado">
      <div>
        <h1>Catálogo</h1>
        <p>{{ productos().length }} productos en el catálogo.</p>
      </div>
      <input
        class="buscar"
        type="search"
        placeholder="Buscar productos"
        aria-label="Buscar productos"
        [value]="filtro()"
        (input)="filtro.set($any($event.target).value)"
      />
    </div>

    @if (aviso(); as a) {
      <div class="aviso" [class.ok]="a.ok" [class.fail]="!a.ok" role="status">{{ a.texto }}</div>
    }
    @if (!puedeComprar) {
      <div class="aviso info">
        Tu cuenta no tiene compras habilitadas. Puedes revisar el catálogo y los precios.
      </div>
    }

    @if (cargando() && productos().length === 0) {
      <p class="muted">Cargando el catálogo…</p>
    } @else if (visibles().length === 0) {
      <div class="bloque">
        @if (filtro()) {
          <p>
            No encontramos productos que coincidan con «{{ filtro() }}». Prueba con otra palabra.
          </p>
        } @else {
          <p>El catálogo está vacío por ahora. Vuelve más tarde.</p>
        }
      </div>
    } @else {
      <ul class="catalogo">
        @for (p of visibles(); track p.id) {
          <li class="producto">
            <div class="producto-foto"><app-producto-icono [nombre]="p.nombre" /></div>
            <h2>{{ p.nombre }}</h2>
            <p class="precio">{{ clp(p.precio) }}</p>
            <p class="stock" [attr.data-nivel]="nivel(p.stock)">
              {{ textoStock(p.stock) }}
              @if (bajas()[p.id]; as d) {
                <span class="baja" aria-label="se descontaron {{ d }} unidades">−{{ d }}</span>
              }
            </p>
            <div class="comprar">
              <input
                #cant
                type="number"
                min="1"
                [max]="p.stock"
                value="1"
                aria-label="Cantidad de {{ p.nombre }}"
              />
              <button
                class="btn"
                [disabled]="!puedeComprar || p.stock === 0 || comprando() === p.id"
                (click)="comprar(p, +cant.value)"
              >
                {{ comprando() === p.id ? 'Comprando…' : p.stock === 0 ? 'Agotado' : 'Comprar' }}
              </button>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class ProductosPage {
  private readonly servicio = inject(ProductosService);
  private readonly pedidos = inject(PedidosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formato = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
  private readonly temporizadores: ReturnType<typeof setTimeout>[] = [];

  protected readonly puedeComprar = inject(AuthService).hasScope(SCOPE_PEDIDOS_WRITE);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly filtro = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get('buscar') ?? '',
  );
  protected readonly cargando = signal(false);
  protected readonly comprando = signal<number | null>(null);
  protected readonly aviso = signal<Aviso | null>(null);
  /** Unidades descontadas desde la última compra, por id de producto (el "−2" que se ilumina). */
  protected readonly bajas = signal<Record<number, number>>({});

  protected readonly visibles = computed(() => {
    const f = normalizar(this.filtro().trim());
    return f ? this.productos().filter((p) => normalizar(p.nombre).includes(f)) : this.productos();
  });

  constructor() {
    this.cargar();
    this.destroyRef.onDestroy(() => this.temporizadores.forEach(clearTimeout));
  }

  protected clp(valor: number): string {
    return this.formato.format(valor);
  }

  protected nivel(stock: number): string {
    return stock === 0 ? 'agotado' : stock <= STOCK_BAJO ? 'bajo' : 'disponible';
  }

  protected textoStock(stock: number): string {
    if (stock === 0) return 'Agotado';
    if (stock === 1) return 'Queda 1 unidad';
    return stock <= STOCK_BAJO ? `Quedan ${stock} unidades` : `${stock} unidades disponibles`;
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.servicio.listar().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.aviso.set({ ok: false, texto: mensajeDeError(e, 'cargar el catálogo') });
      },
    });
  }

  protected comprar(producto: Producto, cantidad: number): void {
    if (!cantidad || cantidad < 1) {
      this.aviso.set({ ok: false, texto: 'Elige al menos 1 unidad.' });
      return;
    }
    this.comprando.set(producto.id);
    this.pedidos.crear(producto.nombre, cantidad).subscribe({
      next: (pedido) => {
        this.comprando.set(null);
        this.aviso.set({
          ok: true,
          texto: `Listo, tu pedido #${pedido.id} quedó registrado. Puedes seguirlo en Mis pedidos.`,
        });
        this.seguirStock();
      },
      error: (e) => {
        this.comprando.set(null);
        this.aviso.set({ ok: false, texto: mensajeDeError(e, 'comprar') });
      },
    });
  }

  /** Vuelve a consultar el catálogo unos segundos después y marca cuánto bajó cada producto. */
  private seguirStock(): void {
    const antes = new Map(this.productos().map((p) => [p.id, p.stock]));
    for (const ms of REVISIONES_MS) {
      this.temporizadores.push(
        setTimeout(() => {
          this.servicio.listar().subscribe({
            next: (data) => {
              const bajas: Record<number, number> = {};
              for (const p of data) {
                const diferencia = (antes.get(p.id) ?? p.stock) - p.stock;
                if (diferencia > 0) bajas[p.id] = diferencia;
              }
              this.productos.set(data);
              this.bajas.set(bajas);
            },
          });
        }, ms),
      );
    }
  }
}
