import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CiudadPeritaje {
  id: number;
  name: string;
  description: string;
  picture: string;
  picture_preview: string;
  providers: number[];
  lat: string;
  lng: string;
}

export interface SedePeritaje {
  id: number;
  name: string;
  description: string;
  email: string;
  phone: string;
  picture: string | null;
  picture_preview: string | null;
  services: string[];
  is_visible: boolean;
}

export interface ServicioPeritaje {
  id: number;
  name: string;
  price: number;
  service_type: string;
  description: string;
}

export interface HorarioDisponible {
  date: string;
  slots: Array<{ time: string; available: boolean }>;
}

@Injectable({
  providedIn: 'root'
})
export class PeritajeApiService {
  private readonly IS_LOCALHOST =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // ✅ USAR LA MISMA CONFIGURACIÓN QUE RTM
  private readonly BASE_URL = this.IS_LOCALHOST ? '/rtm-api' : '/api-proxy.php?api=rtm';

  private readonly TOKEN = '2c632158202204ad6d69a9e0e2735a26268ebc3d';

  constructor(private http: HttpClient) {
    console.log('🔧 [Peritaje API Service] Inicializado');
    console.log('🔧 [Peritaje API Service] Entorno:', this.IS_LOCALHOST ? 'development' : 'production');
    console.log('🔧 [Peritaje API Service] BASE_URL:', this.BASE_URL);
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Token ${this.TOKEN}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtener ciudades disponibles
   */
  obtenerCiudades(): Observable<any> {
    const url = this.IS_LOCALHOST
      ? `${this.BASE_URL}/wh/transversal/ejecutar-accion/?accion=obtener_ciudades`
      : `${this.BASE_URL}&path=wh/transversal/ejecutar-accion/&accion=obtener_ciudades`;

    return this.http.post<any>(url, {}, { headers: this.getHeaders() });
  }

  /**
   * Obtener servicios disponibles para un vehículo (incluye consulta RUNT)
   */
  obtenerServicios(params: {
    grupo_servicio: string;
    servicios_por_placa: boolean;
    placa: string;
    cliente: string;
    tipo_identificacion?: string;
    identificacion?: string;
    tipo_combustible?: string;
    modelo?: string;
    tipo_servicio?: string;
    clase_vehiculo?: string;
  }): Observable<any> {
    const queryParams = new URLSearchParams({
      accion: 'obtener_servicios',
      grupo_servicio: params.grupo_servicio,
      servicios_por_placa: params.servicios_por_placa.toString(),
      placa: params.placa,
      cliente: params.cliente,
      ...(params.tipo_identificacion && { tipo_identificacion: params.tipo_identificacion }),
      ...(params.identificacion && { identificacion: params.identificacion }),
      ...(params.tipo_combustible && { tipo_combustible: params.tipo_combustible }),
      ...(params.modelo && { modelo: params.modelo }),
      ...(params.tipo_servicio && { tipo_servicio: params.tipo_servicio }),
      ...(params.clase_vehiculo && { clase_vehiculo: params.clase_vehiculo })
    });

    const url = this.IS_LOCALHOST
      ? `${this.BASE_URL}/wh/transversal/ejecutar-accion/?${queryParams}`
      : `${this.BASE_URL}&path=wh/transversal/ejecutar-accion/&${queryParams}`;

    return this.http.post<any>(url, {}, { headers: this.getHeaders() });
  }

  /**
   * Obtener proveedores/sedes de peritaje
   */
  obtenerProveedores(ciudad: string, serviceId?: string): Observable<any> {
    const ciudadEnc = encodeURIComponent(ciudad);
    let queryParams = `accion=obtener_proveedores&ciudad=${ciudadEnc}&from_flow=peritaje`;

    if (serviceId) {
      queryParams += `&services__contains=${encodeURIComponent(serviceId)}`;
    }

    const url = this.IS_LOCALHOST
      ? `${this.BASE_URL}/wh/transversal/ejecutar-accion/?${queryParams}`
      : `${this.BASE_URL}&path=wh/transversal/ejecutar-accion/&${queryParams}`;

    return this.http.post<any>(url, {}, { headers: this.getHeaders() });
  }

  /**
   * Obtener horarios disponibles (MÉTODO ACTUALIZADO)
   */
  obtenerHorariosDisponibles(payload: {
    sede: string;
    servicio: string;
    fecha_agenda: any;
    from_flow: string;
  }): Observable<any> {
    const url = this.IS_LOCALHOST
      ? `${this.BASE_URL}/wh/transversal/ejecutar-accion/?accion=obtener_horarios_disponibles`
      : `${this.BASE_URL}&path=wh/transversal/ejecutar-accion/&accion=obtener_horarios_disponibles`;

    return this.http.post<any>(url, payload, { headers: this.getHeaders() });
  }

  /**
   * Obtener horarios disponibles (MÉTODO LEGACY - mantener compatibilidad)
   * @deprecated Usar obtenerHorariosDisponibles() en su lugar
   */
  obtenerHorarios(sede: string, servicio: string, fecha: any): Observable<any> {
    const body = {
      sede,
      servicio,
      fecha_agenda: fecha,
      from_flow: 'peritaje'
    };

    const url = this.IS_LOCALHOST
      ? `${this.BASE_URL}/wh/transversal/ejecutar-accion/?accion=obtener_horarios_disponibles`
      : `${this.BASE_URL}&path=wh/transversal/ejecutar-accion/&accion=obtener_horarios_disponibles`;

    return this.http.post<any>(url, body, { headers: this.getHeaders() });
  }

  /**
   * Cotizar servicio de peritaje
   */
  cotizar(data: any): Observable<any> {
    const url = this.IS_LOCALHOST
      ? `${this.BASE_URL}/wh/transversal/ejecutar-accion/?accion=cotizar`
      : `${this.BASE_URL}&path=wh/transversal/ejecutar-accion/&accion=cotizar`;

    const body = {
      ...data,
      from_flow: 'peritaje'
    };

    return this.http.post<any>(url, body, { headers: this.getHeaders() });
  }

  /**
   * Agendar servicio de peritaje
   */
  agendar(data: any): Observable<any> {
    const url = this.IS_LOCALHOST
      ? `${this.BASE_URL}/wh/transversal/ejecutar-accion/?accion=agendar`
      : `${this.BASE_URL}&path=wh/transversal/ejecutar-accion/&accion=agendar`;

    const body = {
      ...data,
      from_flow: 'peritaje'
    };

    return this.http.post<any>(url, body, { headers: this.getHeaders() });
  }

  // ========================================
  // ✅ REGISTRAR PAGO (MISMO ENDPOINT QUE RTM)
  // ========================================
  registrarPago(invoiceId: number): Observable<any> {
    const url = this.IS_LOCALHOST
      ? `${this.BASE_URL}/wh/transversal/ejecutar-accion/?accion=registrar_pago`
      : `${this.BASE_URL}&path=wh/transversal/ejecutar-accion/&accion=registrar_pago`;

    const body = { invoice_id: invoiceId };

    console.log('💳 [PERITAJE API] Registrando pago...');
    console.log('💳 [PERITAJE API] Invoice ID:', invoiceId);
    console.log('💳 [PERITAJE API] URL:', url);

    return this.http.post<any>(url, body, { headers: this.getHeaders() });
  }
}