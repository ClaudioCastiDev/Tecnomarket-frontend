import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { Producto } from '../core/models';
import { ProductosService } from '../core/productos.service';
import { ProductoIcono } from './producto-icono';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductoIcono],
  template: `
    @if (aviso() === 'login') {
      <div class="aviso info" role="status">Inicia sesión para entrar a esa sección.</div>
    }
    @if (aviso() === 'rol') {
      <div class="aviso info" role="status">Esa sección es solo para administradores.</div>
    }
    @if (auth.error()) {
      <div class="aviso fail" role="alert">{{ auth.error() }}</div>
    }

    <section class="portada">
      <div class="portada-texto">
        <h1>Equipa tu escritorio</h1>
        <p>
          Teclados, monitores, mouse y notebooks con el stock al día. Elige, compra y sigue tu
          pedido desde tu cuenta.
        </p>
        @if (auth.isAuthenticated()) {
          <a class="btn grande" routerLink="/productos">Ver el catálogo</a>
        } @else {
          <button class="btn grande" (click)="auth.login()">Iniciar sesión para comprar</button>
          <span class="portada-nota"
            >¿Primera vez? Crea tu cuenta en la misma pantalla de inicio de sesión.</span
          >
        }
      </div>

      <nav class="vitrina" aria-label="Categorías">
        <a routerLink="/productos" [queryParams]="{ buscar: 'monitor' }">
          <app-producto-icono nombre="monitor" />Monitores
        </a>
        <a routerLink="/productos" [queryParams]="{ buscar: 'teclado' }">
          <app-producto-icono nombre="teclado" />Teclados
        </a>
        <a routerLink="/productos" [queryParams]="{ buscar: 'mouse' }">
          <app-producto-icono nombre="mouse" />Mouse
        </a>
        <a routerLink="/productos" [queryParams]="{ buscar: 'notebook' }">
          <app-producto-icono nombre="notebook" />Notebooks
        </a>
        <a routerLink="/productos" [queryParams]="{ buscar: 'audífono' }">
          <app-producto-icono nombre="audífono" />Audio
        </a>
        <a routerLink="/productos" [queryParams]="{ buscar: 'cable' }">
          <app-producto-icono nombre="cable" />Cables
        </a>
      </nav>
    </section>

    @if (destacados().length > 0) {
      <section class="bloque">
        <div class="encabezado">
          <h2>Del catálogo</h2>
          <a routerLink="/productos">Ver todos los productos</a>
        </div>
        <ul class="catalogo">
          @for (p of destacados(); track p.id) {
            <li class="producto">
              <div class="producto-foto"><app-producto-icono [nombre]="p.nombre" /></div>
              <h2>{{ p.nombre }}</h2>
              <p class="precio">{{ clp(p.precio) }}</p>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthService);
  private readonly productos = inject(ProductosService);
  private readonly route = inject(ActivatedRoute);
  private readonly formato = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

  protected readonly aviso = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('aviso'))), {
    initialValue: null,
  });
  protected readonly destacados = signal<Producto[]>([]);

  constructor() {
    // El catálogo requiere sesión: solo se pide cuando la persona ya inició sesión.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.productos.listar().subscribe({
          next: (data) => this.destacados.set(data.filter((p) => p.stock > 0).slice(0, 3)),
          error: () => this.destacados.set([]),
        });
      }
    });
  }

  protected clp(valor: number): string {
    return this.formato.format(valor);
  }
}
