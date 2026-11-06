import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { mensajeDeError } from '../core/mensajes';
import { Pedido, Producto } from '../core/models';
import { PedidosService } from '../core/pedidos.service';
import { ProductosService } from '../core/productos.service';
import { SCOPE_PEDIDOS_WRITE } from '../core/scopes';

const ESTADOS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PREPARACION: 'En preparación',
  ENTREGADO: 'Entregado',
};

interface Aviso {
  ok: boolean;
  texto: string;
}

@Component({
  selector: 'app-pedidos',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="encabezado">
      <div>
        <h1>Mis pedidos</h1>
        <p>El estado de cada pedido se actualiza a medida que lo preparamos.</p>
      </div>
      <button class="btn ghost" (click)="cargar()" [disabled]="cargando()">Actualizar</button>
    </div>

    @if (aviso(); as a) {
      <div class="aviso" [class.ok]="a.ok" [class.fail]="!a.ok" role="status">{{ a.texto }}</div>
    }

    <section class="bloque">
      @if (cargando() && pedidos().length === 0) {
        <p class="muted">Cargando tus pedidos…</p>
      } @else if (misPedidos().length === 0) {
        <p>
          Aún no tienes pedidos. <a routerLink="/productos">Revisa el catálogo</a> y elige tu primer
          producto.
        </p>
      } @else {
        <ul class="lista-pedidos">
          @for (p of misPedidos(); track p.id) {
            <li>
              <span class="pedido-numero">#{{ p.id }}</span>
              <span class="pedido-detalle">
                <strong>{{ p.producto }}</strong>
                <span>{{ p.cantidad }} {{ p.cantidad === 1 ? 'unidad' : 'unidades' }}</span>
              </span>
              <span class="pedido-fecha">{{ p.fecha | date: 'd MMM y, HH:mm' }}</span>
              <span class="estado" [attr.data-estado]="p.estado">{{ estado(p.estado) }}</span>
            </li>
          }
        </ul>
      }
    </section>

    <section class="bloque">
      <h2>¿No encuentras un producto?</h2>
      @if (puedeComprar) {
        <p class="muted">
          Escribe su nombre y la cantidad; lo revisamos y te confirmamos el pedido.
        </p>
        <div class="form-row">
          <input
            #producto
            list="catalogo"
            placeholder="Nombre del producto"
            aria-label="Nombre del producto"
            [value]="productoInicial()"
          />
          <datalist id="catalogo">
            @for (p of catalogo(); track p.id) {
              <option [value]="p.nombre"></option>
            }
          </datalist>
          <input #cantidad type="number" min="1" value="1" aria-label="Cantidad" />
          <button
            class="btn"
            (click)="crear(producto.value, +cantidad.value)"
            [disabled]="creando()"
          >
            {{ creando() ? 'Enviando…' : 'Enviar pedido' }}
          </button>
        </div>
      } @else {
        <p class="muted">
          Tu cuenta no tiene compras habilitadas, así que todavía no puedes hacer pedidos.
        </p>
      }
    </section>
  `,
})
export class PedidosPage {
  private readonly servicio = inject(PedidosService);
  private readonly productos = inject(ProductosService);
  private readonly auth = inject(AuthService);

  protected readonly pedidos = signal<Pedido[]>([]);
  /** La API devuelve todos los pedidos: aquí se muestran solo los de la persona, del más nuevo al más antiguo. */
  protected readonly misPedidos = computed(() => {
    const sub = this.auth.claims()?.sub;
    return this.pedidos()
      .filter((p) => p.clienteSub === sub)
      .sort((a, b) => b.id - a.id);
  });
  /** Sugerencias de nombres exactos: productos descuenta el stock buscando por nombre. */
  protected readonly catalogo = signal<Producto[]>([]);
  protected readonly productoInicial = computed(() => this.catalogo()[0]?.nombre ?? '');
  protected readonly cargando = signal(false);
  protected readonly creando = signal(false);
  protected readonly aviso = signal<Aviso | null>(null);
  protected readonly puedeComprar = this.auth.hasScope(SCOPE_PEDIDOS_WRITE);

  constructor() {
    this.cargar();
    this.productos.listar().subscribe({
      next: (data) => this.catalogo.set(data),
      error: () => this.catalogo.set([]),
    });
  }

  protected estado(codigo: string): string {
    return ESTADOS[codigo] ?? codigo;
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.servicio.listar().subscribe({
      next: (data) => {
        this.pedidos.set(data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.aviso.set({ ok: false, texto: mensajeDeError(e, 'cargar tus pedidos') });
      },
    });
  }

  protected crear(producto: string, cantidad: number): void {
    if (!producto.trim()) {
      this.aviso.set({ ok: false, texto: 'Escribe el nombre del producto.' });
      return;
    }
    this.creando.set(true);
    this.servicio.crear(producto.trim(), cantidad).subscribe({
      next: (p) => {
        this.creando.set(false);
        this.aviso.set({
          ok: true,
          texto: `Recibimos tu pedido #${p.id}. Lo verás en la lista con su estado.`,
        });
        this.cargar();
      },
      error: (e) => {
        this.creando.set(false);
        this.aviso.set({ ok: false, texto: mensajeDeError(e, 'hacer pedidos') });
      },
    });
  }
}
