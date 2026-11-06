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
const MIO = 'sub-ana';

const pedido = (id: number, clienteSub: string, estado = 'PENDIENTE') => ({
  id,
  estado,
  producto: 'Notebook',
  cantidad: 1,
  clienteSub,
  fecha: '2026-11-05T10:00:00',
});

function crearPagina(
  scopes: string[],
  pedidos = [pedido(1, MIO), pedido(2, 'otro-cliente'), pedido(3, MIO, 'ENTREGADO')],
) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: AuthService,
        useValue: { hasScope: (s: string) => scopes.includes(s), claims: () => ({ sub: MIO }) },
      },
    ],
  });
  const fixture = TestBed.createComponent(PedidosPage);
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(URL_PEDIDOS).flush(pedidos);
  http.expectOne(URL_PRODUCTOS).flush([{ id: 1, nombre: 'Notebook', precio: 500000, stock: 10 }]);
  fixture.detectChanges();
  return { fixture, http, html: fixture.nativeElement as HTMLElement };
}

describe('PedidosPage', () => {
  it('muestra solo los pedidos de la persona, del más nuevo al más antiguo, con estados legibles', async () => {
    const { fixture, html } = crearPagina([SCOPE_PEDIDOS_WRITE]);
    await fixture.whenStable();

    const numeros = [...html.querySelectorAll('.pedido-numero')].map((e) => e.textContent?.trim());
    expect(numeros).toEqual(['#3', '#1']);
    expect(html.textContent).toContain('Entregado');
    expect(html.textContent).not.toContain('ENTREGADO');
  });

  it('no muestra detalles técnicos al cliente', async () => {
    const { fixture, html } = crearPagina([SCOPE_PEDIDOS_WRITE]);
    await fixture.whenStable();

    for (const tecnico of ['403', 'scope', 'pedido.creado', 'API Gateway', 'RabbitMQ']) {
      expect(html.textContent).not.toContain(tecnico);
    }
  });

  it('sin permiso de compra lo explica sin códigos y no muestra el formulario', async () => {
    const { fixture, html } = crearPagina([]);
    await fixture.whenStable();

    expect(html.textContent).toContain('no tiene compras habilitadas');
    expect(html.querySelector('.form-row')).toBeNull();
  });

  it('al enviar un pedido por nombre lo confirma y recarga la lista', async () => {
    const { fixture, http, html } = crearPagina([SCOPE_PEDIDOS_WRITE]);
    await fixture.whenStable();

    html.querySelector<HTMLButtonElement>('.form-row button')!.click();
    const post = http.expectOne((r) => r.method === 'POST' && r.url === URL_PEDIDOS);
    expect(post.request.body).toEqual({ producto: 'Notebook', cantidad: 1 });
    post.flush(pedido(7, MIO));
    http.expectOne(URL_PEDIDOS).flush([pedido(7, MIO)]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(html.querySelector('.aviso.ok')?.textContent).toContain('Recibimos tu pedido #7');
    expect(html.querySelector('.pedido-numero')?.textContent).toContain('#7');
  });

  it('un error 401 se muestra como sesión expirada', async () => {
    const { fixture, http, html } = crearPagina([SCOPE_PEDIDOS_WRITE]);
    await fixture.whenStable();

    html.querySelector<HTMLButtonElement>('.form-row button')!.click();
    http
      .expectOne((r) => r.method === 'POST')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(html.querySelector('.aviso.fail')?.textContent).toContain('Tu sesión expiró');
  });
});
