import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth.service';

const authFalso = {
  isAuthenticated: () => false,
  claims: () => null,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: AuthService, useValue: authFalso }],
    }).compileComponents();
  });

  it('se crea correctamente', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra la marca y el enlace de inicio de sesión cuando no hay sesión', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;

    expect(html.querySelector('.brand')?.textContent).toContain('TecnoMarket');
    expect(html.querySelector('.session button')?.textContent).toContain('Iniciar sesión');
  });
});
