import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { API_CONFIG } from '../../../config';

// ========================================
// ✅ INTERFACES LOCALES PARA HORARIOS
// ========================================
export interface ObtenerHorariosRequestTramites {
  sede: string;
  servicio: string;
  fecha_agenda: {
    day: number;
    month: number;
    year: number;
  };
  from_flow: 'trámites' | 'tramites';
}

@Injectable({ providedIn: 'root' })
export class TramitesApiService {
  // ========================================
  // 🔧 CONFIGURACIÓN (misma base que RTM)
  // ========================================
  private readonly BASE_URL = API_CONFIG.BASE_URL;

  /**
   * ✅ IMPORTANTE:
   * El 401 que tienes es porque NO llega Authorization.
   * RTM ya funciona porque usa este token hardcodeado:
   */
  private readonly TOKEN = '2c632158202204ad6d69a9e0e2735a26268ebc3d';

  constructor(private http: HttpClient) {
    console.log('🧾 [Trámites API] BASE_URL:', this.BASE_URL);
  }

  // ========================================
  // HEADERS PRIVADOS (IGUAL QUE RTM)
  // ========================================
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Token ${this.TOKEN}`,
      'Content-Type': 'application/json'
    });
  }

  // ========================================
  // MANEJO DE ERRORES (similar a RTM)
  // ========================================
  private handleError(error: HttpErrorResponse, endpoint: string) {
    console.error(`❌ [TRÁMITES API] Error en ${endpoint}:`, error);

    let errorMessage = 'Ocurrió un error al procesar la solicitud';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Código de error: ${error.status}\nMensaje: ${error.message}`;
      console.error(`❌ [TRÁMITES API] Error del servidor:`, {
        status: error.status,
        message: error.message,
        body: error.error
      });
    }

    return throwError(() => new Error(errorMessage));
  }

  private isoToFechaAgenda(fechaISO: string) {
    const [y, m, d] = (fechaISO || '').split('-').map((n) => Number(n));
    return { day: d, month: m, year: y };
  }

  // ========================================
  // 1) OBTENER CIUDADES (POST, igual RTM)
  // ========================================
  obtenerCiudades(): Observable<any> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=obtener_ciudades`;

    console.log('📍 [TRÁMITES API] Obteniendo ciudades...');
    console.log('📍 [TRÁMITES API] URL:', url);

    return this.http.post<any>(url, {}, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap((response) => {
        console.log('✅ [TRÁMITES API] Ciudades obtenidas:', response?.data?.length || 0);
      }),
      catchError(err => this.handleError(err, 'obtenerCiudades'))
    );
  }

  // ========================================
  // 2) OBTENER PROVEEDORES (POST, igual RTM)
  // ========================================
  obtenerProveedores(ciudad: string, servicesContains?: number | string): Observable<any> {
    const ciudadEnc = encodeURIComponent(ciudad);
    const services = (servicesContains !== undefined && servicesContains !== null && `${servicesContains}` !== '')
      ? `&services__contains=${encodeURIComponent(String(servicesContains))}`
      : '';

    // OJO: en tu log viene from_flow=trámites y services__contains=85
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=obtener_proveedores&ciudad=${ciudadEnc}&from_flow=trámites${services}`;

    console.log('🏢 [TRÁMITES API] Obteniendo proveedores...');
    console.log('🏢 [TRÁMITES API] Ciudad:', ciudad);
    console.log('🏢 [TRÁMITES API] URL:', url);

    return this.http.post<any>(url, {}, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap((response) => {
        console.log('✅ [TRÁMITES API] Proveedores obtenidos:', response?.data?.length || 0);
      }),
      catchError(err => this.handleError(err, 'obtenerProveedores'))
    );
  }

  // ========================================
  // 3) OBTENER HORARIOS DISPONIBLES (POST)
  // ========================================
  obtenerHorariosDisponibles(payload: {
    sede: string;
    servicio: string;
    fechaISO?: string;
    fecha_agenda?: { day: number; month: number; year: number; };
  }): Observable<any> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=obtener_horarios_disponibles`;

    const fecha_agenda = payload.fecha_agenda || this.isoToFechaAgenda(payload.fechaISO || '');

    const body: ObtenerHorariosRequestTramites = {
      sede: payload.sede,
      servicio: payload.servicio,
      fecha_agenda,
      from_flow: 'trámites'
    };

    console.log('⏰ [TRÁMITES API] Obteniendo horarios...');
    console.log('⏰ [TRÁMITES API] Body:', body);
    console.log('⏰ [TRÁMITES API] URL:', url);

    return this.http.post<any>(url, body, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap((response) => {
        console.log('✅ [TRÁMITES API] Horarios obtenidos');
      }),
      catchError(err => this.handleError(err, 'obtenerHorariosDisponibles'))
    );
  }

  // ========================================
  // 4) COTIZAR (POST)
  // ========================================
  cotizar(body: any): Observable<any> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=cotizar`;

    console.log('💰 [TRÁMITES API] Cotizando...');
    console.log('💰 [TRÁMITES API] URL:', url);
    console.log('💰 [TRÁMITES API] Body:', body);

    return this.http.post<any>(url, body, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(() => console.log('✅ [TRÁMITES API] Cotización OK')),
      catchError(err => this.handleError(err, 'cotizar'))
    );
  }

  // ========================================
  // 5) AGENDAR (POST)
  // ========================================
  agendar(body: any): Observable<any> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=agendar`;

    console.log('📅 [TRÁMITES API] Agendando...');
    console.log('📅 [TRÁMITES API] URL:', url);
    console.log('📅 [TRÁMITES API] Body:', body);

    return this.http.post<any>(url, body, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(() => console.log('✅ [TRÁMITES API] Agendamiento OK')),
      catchError(err => this.handleError(err, 'agendar'))
    );
  }

  // ========================================
// 6) REGISTRAR PAGO (MISMO ENDPOINT QUE RTM)
// ========================================
registrarPago(invoiceId: number): Observable<any> {
  const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=registrar_pago`;

  const body = { invoice_id: invoiceId };

  console.log('💳 [TRÁMITES API] Registrando pago...');
  console.log('💳 [TRÁMITES API] Invoice ID:', invoiceId);
  console.log('💳 [TRÁMITES API] URL:', url);

  return this.http.post<any>(url, body, {
    headers: this.getHeaders(),
    withCredentials: true
  }).pipe(
    tap((response) => {
      console.log('✅ [TRÁMITES API] Pago registrado exitosamente');
      console.log('✅ [TRÁMITES API] Detalle:', response);
    }),
    catchError(err => this.handleError(err, 'registrarPago'))
  );
}

}