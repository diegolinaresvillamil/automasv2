import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { API_CONFIG } from '../../../config';
import {
  ApiResponse,
  Ciudad,
  Proveedor,
  CotizarRequest,
  CotizarResponse,
  AgendarRequest,
  AgendarResponse,
  RegistrarPagoRequest,
  RegistrarPagoResponse
} from '../../shared/models/rtm.models';

// ========================================
// ✅ INTERFACES LOCALES PARA HORARIOS
// ========================================
export interface ObtenerHorariosRequest {
  sede: string;
  fecha_agenda: {
    day: number;
    month: number;
    year: number;
  };
  from_flow: 'rtm';
}

@Injectable({
  providedIn: 'root'
})
export class RtmApiService {

  // ========================================
  // 🔧 CONFIGURACIÓN CON URLs CORRECTAS
  // ========================================
  private readonly BASE_URL = API_CONFIG.BASE_URL;
  private readonly RUNT_URL = API_CONFIG.RUNT_URL;
  private readonly TOKEN = '2c632158202204ad6d69a9e0e2735a26268ebc3d';
  private readonly CLIENTE = 'pagina_web';
  private readonly RUNT_TOKEN = '0a74c9adbcc2f1dbbb60d9016b26aa9d47993557';

  constructor(private http: HttpClient) {
    console.log('🚗 [RTM API Service] Inicializado');
    console.log('🚗 [RTM API Service] Entorno:', API_CONFIG.environment);
    console.log('🚗 [RTM API Service] BASE_URL:', this.BASE_URL);
    console.log('🚗 [RTM API Service] RUNT_URL:', this.RUNT_URL);
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

  private getRuntHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Token ${this.RUNT_TOKEN}`,
      'Content-Type': 'application/json'
    });
  }

  // ========================================
  // MANEJO DE ERRORES
  // ========================================
  private handleError(error: HttpErrorResponse, endpoint: string) {
    console.error(`❌ [RTM API] Error en ${endpoint}:`, error);

    let errorMessage = 'Ocurrió un error al procesar la solicitud';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
      console.error(`❌ [RTM API] Error del cliente:`, error.error.message);
    } else {
      errorMessage = `Código de error: ${error.status}\nMensaje: ${error.message}`;
      console.error(`❌ [RTM API] Error del servidor:`, {
        status: error.status,
        message: error.message,
        body: error.error
      });
    }

    return throwError(() => new Error(errorMessage));
  }

  // ========================================
  // 0. CONSULTAR RUNT
  // ========================================
  consultarRunt(placa: string, tipoIdentificacion: string, identificacion: string): Observable<any> {
    const url = `${this.RUNT_URL}runt-operations/get_full_runt_information/`;

    console.log('🔍 [RTM API] Consultando RUNT...');
    console.log('🔍 [RTM API] URL:', url);
    console.log('🔍 [RTM API] Placa:', placa);
    console.log('🔍 [RTM API] Tipo ID:', tipoIdentificacion);
    console.log('🔍 [RTM API] Identificación:', identificacion);

    const body = {
      placa: placa,
      cliente: this.CLIENTE,
      tipo_identificacion: tipoIdentificacion,
      identificacion: identificacion
    };

    console.log('🔍 [RTM API] Body:', body);

    return this.http.post<any>(url, body, {
      headers: this.getRuntHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ [RTM API] Datos RUNT obtenidos exitosamente');
        console.log('✅ [RTM API] Detalle:', response);
      }),
      catchError(error => this.handleError(error, 'consultarRunt'))
    );
  }

  // ========================================
  // 1. OBTENER CIUDADES
  // ========================================
  obtenerCiudades(): Observable<ApiResponse<Ciudad[]>> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=obtener_ciudades`;

    console.log('📍 [RTM API] Obteniendo ciudades...');
    console.log('📍 [RTM API] URL:', url);

    return this.http.post<ApiResponse<Ciudad[]>>(url, {}, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ [RTM API] Ciudades obtenidas:', response.data?.length || 0);
        console.log('✅ [RTM API] Detalle:', response);
      }),
      catchError(error => this.handleError(error, 'obtenerCiudades'))
    );
  }

  // ========================================
  // 2. OBTENER PROVEEDORES (SEDES) - CON FILTRO INTELIGENTE
  // ========================================
  obtenerProveedores(ciudad: string): Observable<ApiResponse<Proveedor[]>> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=obtener_proveedores&ciudad=${encodeURIComponent(ciudad)}&from_flow=rtm`;

    console.log('🏢 [RTM API] Obteniendo proveedores...');
    console.log('🏢 [RTM API] Ciudad:', ciudad);
    console.log('🏢 [RTM API] URL:', url);

    return this.http.post<ApiResponse<Proveedor[]>>(url, {}, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ [RTM API] Proveedores BRUTOS obtenidos:', response.data?.length || 0);
        console.log('✅ [RTM API] Detalle completo:', response);

        // ⚠️ LOG DE DIAGNÓSTICO
        if (response.data) {
          console.log('🔍 [RTM API] NOMBRES DE TODAS LAS SEDES (ANTES DE FILTRAR):', response.data.map(s => s.name));

          // ✅ FILTRO INTELIGENTE: SOLO SEDES DE RTM
          const sedesRTM = response.data.filter(sede => {
            const nombre = sede.name.toLowerCase();

            // Debe contener al menos una de estas palabras clave Y NO ser Peritaje o Courier
            const esRTM = (
              nombre.includes('cda') ||
              nombre.includes('revisión técnico') ||
              nombre.includes('revision tecnico') ||
              nombre.includes('técnico mecánica') ||
              nombre.includes('tecnico mecanica') ||
              nombre.includes('rtm')
            );

            const noEsPeritaje = !nombre.includes('peritaje');
            const noEsCourier = !nombre.includes('courier') && !nombre.includes('furgon');

            return esRTM && noEsPeritaje && noEsCourier;
          });

          console.log('🔍 [RTM API] Sedes filtradas (SOLO RTM):', sedesRTM.length);
          console.log('🔍 [RTM API] Sedes RTM:', sedesRTM.map(s => s.name));

          // Reemplazar data con sedes filtradas
          response.data = sedesRTM;

          // ⚠️ ADVERTENCIA si no hay sedes
          if (sedesRTM.length === 0) {
            console.warn('⚠️ [RTM API] NO SE ENCONTRARON SEDES DE RTM PARA ESTA CIUDAD');
            console.warn('⚠️ [RTM API] El backend está devolviendo solo sedes de Peritaje/Courier');
            console.warn('⚠️ [RTM API] Es necesario reportar este problema al equipo de backend');
          }
        }
      }),
      catchError(error => this.handleError(error, 'obtenerProveedores'))
    );
  }

  // ========================================
  // 2.1 ✅ OBTENER SERVICIOS (por ID) - PARA MAPEAR "services" de sede
  // ========================================
  /**
   * Llama al endpoint:
   *   .../ejecutar-accion/?page=1&accion=obtener_servicios&id=217
   *
   * Se usa para saber a qué corresponde cada service ID dentro de una sede.
   */
  obtenerServicios(id: number, page: number = 1): Observable<any> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?page=${page}&accion=obtener_servicios&id=${encodeURIComponent(
      String(id)
    )}`;

    console.log('🧩 [RTM API] Obteniendo servicio por ID...');
    console.log('🧩 [RTM API] ID:', id);
    console.log('🧩 [RTM API] URL:', url);

    // En Postman lo probaste como GET, pero el resto de acciones acá están con POST.
    // Para NO dañar nada, lo hacemos con POST {} igual que las demás acciones.
    return this.http.post<any>(url, {}, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ [RTM API] Servicio obtenido');
        console.log('✅ [RTM API] Detalle:', response);
      }),
      catchError(error => this.handleError(error, 'obtenerServicios'))
    );
  }

  // ========================================
  // 3. ✅ OBTENER HORARIOS DISPONIBLES
  // ========================================
  obtenerHorariosDisponibles(request: ObtenerHorariosRequest): Observable<any> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=obtener_horarios_disponibles`;

    console.log('⏰ [RTM API] Obteniendo horarios disponibles...');
    console.log('⏰ [RTM API] Request:', request);
    console.log('⏰ [RTM API] URL:', url);

    return this.http.post<any>(url, request, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ [RTM API] Horarios obtenidos');
        console.log('✅ [RTM API] Detalle:', response);
      }),
      catchError(error => this.handleError(error, 'obtenerHorariosDisponibles'))
    );
  }

  // ========================================
  // 4. COTIZAR
  // ========================================
  cotizar(request: CotizarRequest): Observable<CotizarResponse> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=cotizar`;

    const body = {
      ...request,
      cliente: this.CLIENTE
    };

    console.log('💰 [RTM API] Cotizando...');
    console.log('💰 [RTM API] Request:', body);
    console.log('💰 [RTM API] URL:', url);

    return this.http.post<CotizarResponse>(url, body, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ [RTM API] Cotización exitosa');
        console.log('✅ [RTM API] Precio:', response.price);
        console.log('✅ [RTM API] Detalle completo:', response);
      }),
      catchError(error => this.handleError(error, 'cotizar'))
    );
  }

  // ========================================
  // 5. AGENDAR
  // ========================================
  agendar(request: AgendarRequest): Observable<AgendarResponse> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=agendar`;

    const body = {
      ...request,
      cliente: this.CLIENTE
    };

    console.log('📅 [RTM API] Agendando cita...');
    console.log('📅 [RTM API] Request:', body);
    console.log('📅 [RTM API] URL:', url);

    return this.http.post<AgendarResponse>(url, body, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ [RTM API] Cita agendada exitosamente');
        console.log('✅ [RTM API] Invoice ID:', response.invoice_id);
        console.log('✅ [RTM API] Código de reserva:', response.codeBooking);
        console.log('✅ [RTM API] Detalle completo:', response);
      }),
      catchError(error => this.handleError(error, 'agendar'))
    );
  }

  // ========================================
  // 6. REGISTRAR PAGO
  // ========================================
  registrarPago(invoiceId: number): Observable<any> {
    const url = `${this.BASE_URL}wh/transversal/ejecutar-accion/?accion=registrar_pago`;

    const body: RegistrarPagoRequest = {
      invoice_id: invoiceId
    };

    console.log('💳 [RTM API] Registrando pago...');
    console.log('💳 [RTM API] Invoice ID:', invoiceId);
    console.log('💳 [RTM API] URL:', url);

    return this.http.post<any>(url, body, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ [RTM API] Pago registrado exitosamente');
        console.log('✅ [RTM API] Detalle:', response);
      }),
      catchError(error => this.handleError(error, 'registrarPago'))
    );
  }
}