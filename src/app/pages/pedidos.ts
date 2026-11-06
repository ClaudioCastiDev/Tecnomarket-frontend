import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Pedido, Producto } from '../core/models';
import { PedidosService } from '../core/pedidos.service';
import { ProductosService } from '../core/productos.service';
import { SCOPE_PEDIDOS_WRITE } from '../core/scopes';
import { Llamada, llamadaError, llamadaOk } from './llamada';

@Component({
  selector: 'app-pedidos',
  imports: [DatePipe, RouterLink],
  template: `
    <h1>Pedidos</h1>

    <div class="card">
      <div class="row">
        <h2>Listado</h2>
        <button class="btn ghost" (click)="cargar()" [disabled]="cargando()">Actualizar</button>
      </div>
      @if (cargando()) {
        <p class="muted">Cargando…</p>
      } @else if (pedidos().length === 0) {
        <p class="muted">No hay pedidos para mostrar.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              @for (p of pedidos(); track p.id) {
                <tr>
                  <td>{{ p.id }}</td>
                  <td>{{ p.producto }}</td>
                  <td>{{ p.cantidad }}</td>
                  <td>
                    <span class="badge">{{ p.estado }}</span>
                  </td>
                  <td>{{ p.fecha | date: 'dd-MM-yyyy HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <div class="card">
      <h2>Crear pedido</h2>
      @if (puedeCrear) {
        <p class="muted">
          Al crear un pedido, el backend lo guarda y publica el evento <code>pedido.creado</code> en
          RabbitMQ. El descuento de stock, el ticket y la notificación se procesan
          <strong>de forma asíncrona</strong>: revisa el stock en
          <a routerLink="/productos">Productos</a> unos segundos después.
        </p>
        <p class="muted">
          Si escribes un producto que no está en el catálogo, el pedido se crea igual, pero el
          servicio de productos rechaza el mensaje y este termina en la cola de errores (DLQ).
        </p>
      } @else {
        <p class="muted">
          Tu sesión no tiene el scope <code>rs-api-pedidos/pedidos-write</code>, así que el API
          Gateway responderá <strong>403</strong>. Cierra sesión y vuelve a entrar para obtener un
          token con ese permiso.
        </p>
      }
      <div class="form-row">
        <input #producto list="catalogo" placeholder="Producto" [value]="productoInicial()" />
        <datalist id="catalogo">
          @for (p of catalogo(); track p.id) {
            <option [value]="p.nombre">Stock: {{ p.stock }}</option>
          }
        </datalist>
        <input #cantidad type="number" min="1" value="1" />
        <button class="btn" (click)="crear(producto.value, +cantidad.value)" [disabled]="creando()">
          Crear pedido
        </button>
      </div>
    </div>

    @if (llamada(); as l) {
      <div class="panel" [class.ok]="l.ok" [class.fail]="!l.ok">
        <span class="method">{{ l.metodo }}</span> {{ l.ruta }} →
        <strong>{{ l.estado === 0 ? 'sin respuesta' : l.estado }}</strong> · {{ l.mensaje }}
      </div>
    }
  `,
})
export class PedidosPage {
  private readonly servicio = inject(PedidosService);
  private readonly productos = inject(ProductosService);
  protected readonly pedidos = signal<Pedido[]>([]);
  /** Catálogo para sugerir nombres exactos: productos descuenta el stock buscando por nombre. */
  protected readonly catalogo = signal<Producto[]>([]);
  protected readonly productoInicial = computed(() => this.catalogo()[0]?.nombre ?? '');
  protected readonly cargando = signal(false);
  protected readonly creando = signal(false);
  protected readonly llamada = signal<Llamada | null>(null);
  protected readonly puedeCrear = inject(AuthService).hasScope(SCOPE_PEDIDOS_WRITE);

  constructor() {
    this.cargar();
    this.cargarCatalogo();
  }

  /** Si el catálogo no carga, el formulario sigue funcionando con texto libre. */
  private cargarCatalogo(): void {
    this.productos.listar().subscribe({
      next: (data) => this.catalogo.set(data),
      error: () => this.catalogo.set([]),
    });
  }

  /** @param mostrarResultado false al recargar tras crear, para no tapar el mensaje del POST. */
  protected cargar(mostrarResultado = true): void {
    this.cargando.set(true);
    this.servicio.listar().subscribe({
      next: (data) => {
        this.pedidos.set(data);
        this.cargando.set(false);
        if (mostrarResultado) {
          this.llamada.set(
            llamadaOk('GET', this.servicio.ruta, 200, `${data.length} pedido(s) recibidos`),
          );
        }
      },
      error: (e) => {
        this.pedidos.set([]);
        this.cargando.set(false);
        this.llamada.set(llamadaError('GET', this.servicio.ruta, e));
      },
    });
  }

  protected crear(producto: string, cantidad: number): void {
    this.creando.set(true);
    this.servicio.crear(producto.trim(), cantidad).subscribe({
      next: (p) => {
        this.creando.set(false);
        this.llamada.set(
          llamadaOk(
            'POST',
            this.servicio.ruta,
            201,
            `Pedido #${p.id} creado · evento enviado a RabbitMQ`,
          ),
        );
        this.cargar(false);
      },
      error: (e) => {
        this.creando.set(false);
        this.llamada.set(llamadaError('POST', this.servicio.ruta, e));
      },
    });
  }
}
