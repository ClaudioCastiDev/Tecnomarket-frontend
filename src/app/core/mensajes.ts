import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduce un error de la API a un mensaje que un cliente entiende.
 * Los códigos HTTP y los detalles técnicos se quedan en la consola del navegador.
 *
 * @param accion lo que la persona intentaba hacer, en infinitivo ("comprar", "ver el catálogo")
 */
export function mensajeDeError(e: unknown, accion: string): string {
  const estado = e instanceof HttpErrorResponse ? e.status : 0;
  switch (estado) {
    case 0:
      return 'No pudimos conectarnos con la tienda. Revisa tu conexión e intenta de nuevo.';
    case 400:
      return 'Revisa los datos: la cantidad debe ser al menos 1.';
    case 401:
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403:
      return `Tu cuenta no tiene permiso para ${accion}.`;
    default:
      return `No pudimos ${accion}. Intenta de nuevo en unos minutos.`;
  }
}
