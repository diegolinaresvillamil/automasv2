import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { API_CONFIG } from '../../../config';
import {
  GenerarLinkPagoRequest,
  GenerarLinkPagoResponse,
  ProyectoPagoResponse,
  VerificarEstadoPagoResponse
} from '../../shared/models/pagos.models';

@Injectable({
  providedIn: 'root'
})
export class PagosApiService {
  
  // ========================================
  // 🔧 CONFIGURACIÓN - ✅ CORREGIDO
  // ========================================
  private readonly BASE_URL = API_CONFIG.PAGOS_URL;
  private readonly TOKEN = '6a306298eb5158f81a37663fefcd13369f99f7aa';
  
  constructor(private http: HttpClient) {
    console.log('💳 [Pagos API Service] Inicializado');
    console.log('💳 [Pagos API Service] Entorno:', {
      hostname: window.location.hostname,
      port: window.location.port,
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    });
    console.log('💳 [Pagos API Service] BASE_URL:', this.BASE_URL);
  }

  // ========================================
  // HEADERS PRIVADOS
  // ========================================
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Token ${this.TOKEN}`,
      'Content-Type': 'application/json'
    });
  }

  // ========================================
  // 1. OBTENER PROYECTO DE PAGO
  // ========================================
  obtenerProyectoPago(nombreProyecto: string): Observable<ProyectoPagoResponse> {
    const url = `${this.BASE_URL}pagos/proyecto/${nombreProyecto}/`;
    
    console.log('💰 [Pagos API] Obteniendo proyecto de pago...');
    console.log('💰 [Pagos API] URL:', url);
    console.log('💰 [Pagos API] Proyecto:', nombreProyecto);
    
    return this.http.get<ProyectoPagoResponse>(url, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(response => {
        console.log('✅ [Pagos API] Proyecto obtenido:', response);
      }),
      catchError(error => this.handleError(error, 'obtenerProyectoPago'))
    );
  }

  // ========================================
  // 2. GENERAR LINK DE PAGO - ✅ PATH CORREGIDO
  // ========================================
  generarLinkPago(request: GenerarLinkPagoRequest): Observable<GenerarLinkPagoResponse> {
    const url = `${this.BASE_URL}pagos/generar-link/`;  // ✅ SIN api-v2/
    
    console.log('💰 [Pagos API] Generando link de pago...');
    console.log('💰 [Pagos API] URL:', url);
    console.log('💰 [Pagos API] Request:', request);
    
    return this.http.post<GenerarLinkPagoResponse>(url, request, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(response => {
        console.log('✅ [Pagos API] Link generado exitosamente');
        console.log('✅ [Pagos API] Pago ID:', response.pago_id);
        console.log('✅ [Pagos API] Payment Link:', response.payment_link);
        console.log('✅ [Pagos API] Detalle completo:', response);
      }),
      catchError(error => this.handleError(error, 'generarLinkPago'))
    );
  }

  // ========================================
  // 3. VERIFICAR ESTADO DEL PAGO
  // ========================================
  verificarEstadoPago(pagoId: string): Observable<VerificarEstadoPagoResponse> {
    const url = `${this.BASE_URL}pagos/${pagoId}/estado/`;
    
    console.log('🔍 [Pagos API] Verificando estado del pago...');
    console.log('🔍 [Pagos API] URL:', url);
    console.log('🔍 [Pagos API] Pago ID:', pagoId);
    
    return this.http.get<VerificarEstadoPagoResponse>(url, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(response => {
        console.log('✅ [Pagos API] Estado verificado:', response);
      }),
      catchError(error => this.handleError(error, 'verificarEstadoPago'))
    );
  }

  // ========================================
  // MANEJO DE ERRORES
  // ========================================
  private handleError(error: HttpErrorResponse, endpoint: string) {
    console.error(`❌ [Pagos API] Error en ${endpoint}:`, error);
    
    let errorMessage = 'Ocurrió un error al procesar la solicitud de pago';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Código de error: ${error.status}\nMensaje: ${error.message}`;
      console.error(`❌ [Pagos API] Detalles del error:`, {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: error.url,
        body: error.error
      });
    }
    
    return throwError(() => new Error(errorMessage));
  }
}