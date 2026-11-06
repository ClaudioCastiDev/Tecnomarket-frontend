import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';
import { SCOPE_PEDIDOS_WRITE } from '../core/scopes';
import { PedidosPage } from './pedidos';

const URL_PEDIDOS = `${environment.apiUrl}/api/pedidos`;
const URL_PRODUCTOS = `${environment.apiUrl}/api/productos`;

function crearPagina(scopes: string[]) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { hasScope: (s: string) => scopes.includes(s) } },
    ],
  });
  const fixture = TestBed.createComponent(PedidosPage);
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(URL_PEDIDOS).flush([]);
  http.expectOne(URL_PRODUCTOS).flush([{ id: 1, nombre: 'Notebook', precio: 500000, stock: 10 }]);
  fixture.detectChanges();
  return { fixture, http, html: fixture.nativeElement as HTMLElement };
}

describe('PedidosPage', () => {
  it('con scope de escritura explica el flujo asíncrono y sugiere los productos del catálogo', async () => {
    const { fixture, html } = crearPagina([SCOPE_PEDIDOS_WRITE]);
    await fixture.whenStable();

    expect(html.textContent).toContain('pedido.creado');
    expect(html.querySelector('datalist option')?.getAttribute('value')).toBe('Notebook');
  });

  it('sin scope de escritura avisa que el API Gateway responderá 403', async () => {
    const { fixture, html } = crearPagina([]);
    await fixture.whenStable();

    expect(html.textContent).toContain('403');
  });

  it('al crear un pedido muestra que el evento se envió a RabbitMQ', async () => {
    const { fixture, http, html } = crearPagina([SCOPE_PEDIDOS_WRITE]);
    await fixture.whenStable();

    html.querySelector<HTMLButtonElement>('.form-row button')!.click();
    const post = http.expectOne((r) => r.method === 'POST' && r.url === URL_PEDIDOS);
    expect(post.request.body).toEqual({ producto: 'Notebook', cantidad: 1 });
    post.flush({
      id: 7,
      estado: 'PENDIENTE',
      producto: 'Notebook',
      cantidad: 1,
      clienteSub: 'x',
      fecha: '',
    });
    http.expectOne(URL_PEDIDOS).flush([]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(html.querySelector('.panel')?.textContent).toContain('Pedido #7 creado');
  });
});
