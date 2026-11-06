import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';
import { SCOPE_PEDIDOS_WRITE } from '../core/scopes';
import { ProductosPage } from './productos';
import { tipoDeProducto } from './producto-icono';

const URL_PEDIDOS = `${environment.apiUrl}/api/pedidos`;
const URL_PRODUCTOS = `${environment.apiUrl}/api/productos`;
const CATALOGO = [
  { id: 1, nombre: 'Mouse inalámbrico', precio: 15990, stock: 40 },
  { id: 2, nombre: 'Monitor 27 pulgadas', precio: 189990, stock: 3 },
  { id: 3, nombre: 'Audífonos gamer', precio: 29990, stock: 0 },
];

function crearPagina(scopes: string[]) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { hasScope: (s: string) => scopes.includes(s) } },
    ],
  });
  const fixture = TestBed.createComponent(ProductosPage);
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(URL_PRODUCTOS).flush(CATALOGO);
  fixture.detectChanges();
  return { fixture, http, html: fixture.nativeElement as HTMLElement };
}

describe('ProductosPage', () => {
  it('muestra precio en pesos y el stock en palabras', async () => {
    const { fixture, html } = crearPagina([SCOPE_PEDIDOS_WRITE]);
    await fixture.whenStable();

    const tarjetas = html.querySelectorAll('.producto');
    expect(tarjetas.length).toBe(3);
    expect(tarjetas[0].querySelector('.precio')?.textContent).toContain('15.990');
    expect(tarjetas[1].querySelector('.stock')?.textContent).toContain('Quedan 3 unidades');
    expect(tarjetas[2].querySelector('button')?.textContent).toContain('Agotado');
    expect(tarjetas[2].querySelector('button')?.disabled).toBe(true);
  });

  it('el buscador ignora tildes y mayúsculas', async () => {
    const { fixture, html } = crearPagina([SCOPE_PEDIDOS_WRITE]);
    const buscar = html.querySelector<HTMLInputElement>('.buscar')!;
    buscar.value = 'AUDIFONO';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(html.querySelectorAll('.producto').length).toBe(1);
  });

  it('comprar crea un pedido con el nombre exacto y confirma sin detalles técnicos', async () => {
    const { fixture, http, html } = crearPagina([SCOPE_PEDIDOS_WRITE]);
    await fixture.whenStable();

    html.querySelector<HTMLButtonElement>('.producto .comprar button')!.click();
    const post = http.expectOne((r) => r.method === 'POST' && r.url === URL_PEDIDOS);
    expect(post.request.body).toEqual({ producto: 'Mouse inalámbrico', cantidad: 1 });
    post.flush({
      id: 12,
      estado: 'PENDIENTE',
      producto: 'Mouse inalámbrico',
      cantidad: 1,
      clienteSub: 'x',
      fecha: '',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const aviso = html.querySelector('.aviso.ok')?.textContent ?? '';
    expect(aviso).toContain('pedido #12');
    expect(aviso).not.toMatch(/201|RabbitMQ|evento/);
  });

  it('sin permiso de compra los botones quedan deshabilitados', async () => {
    const { fixture, html } = crearPagina([]);
    await fixture.whenStable();

    expect(html.querySelector<HTMLButtonElement>('.comprar button')!.disabled).toBe(true);
    expect(html.textContent).toContain('no tiene compras habilitadas');
  });

  it('deduce la categoría del ícono desde el nombre', () => {
    expect(tipoDeProducto('Teclado mecánico')).toBe('teclado');
    expect(tipoDeProducto('Monitor 27 pulgadas')).toBe('monitor');
    expect(tipoDeProducto('Cable HDMI')).toBe('cable');
    expect(tipoDeProducto('Silla')).toBe('otro');
  });
});
