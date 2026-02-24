import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, switchMap } from 'rxjs/operators';
import { API_CONFIG } from '../../../config';

@Injectable({ providedIn: 'root' })
export class RtmModalService {
  private _open$ = new BehaviorSubject<boolean>(false);
  open$ = this._open$.asObservable();

  open() { this._open$.next(true); }
  close() { this._open$.next(false); }

  private _datosIniciales:
    | {
        placa: string;
        nombre: string;
        telefono: string;
        docTipo: string;
        documento: string;
        correo?: string;
      }
    | null = null;

  setDatosIniciales(datos: {
    placa: string;
    nombre: string;
    telefono: string;
    docTipo: string;
    documento: string;
    correo?: string;
  }) {
    this._datosIniciales = datos;
  }

  getDatosIniciales() {
    return this._datosIniciales;
  }

  // ========================================
  // 🔧 CONFIGURACIÓN MULTI-ENTORNO
  // ========================================
  private readonly BASE_URL = API_CONFIG.BASE_URL;
  private readonly RUNT_BASE = API_CONFIG.RUNT_URL;
  private readonly token = 'c3237a07dd144d951a0d213330550818101cb81c';
  private readonly cliente = 'pagina_web';
  private readonly runtToken = '0a74c9adbcc2f1dbbb60d9016b26aa9d47993557';

  constructor(private http: HttpClient) {
    console.log('🚗 [RTM Modal Service] Inicializado');
    console.log('🚗 [RTM Modal Service] Entorno:', API_CONFIG.environment);
    console.log('🚗 [RTM Modal Service] BASE_URL:', this.BASE_URL);
  }

  private getHeaders() {
    return new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json'
    });
  }

  private getRuntHeaders() {
    return new HttpHeaders({
      Authorization: `Token ${this.runtToken}`,
      'Content-Type': 'application/json'
    });
  }

  private buildUrl(tipo: 'transversal' | 'pagos'): string {
    if (tipo === 'transversal') {
      return `${this.BASE_URL}wh/transversal/ejecutar-accion/`;
    } else {
      return `${this.BASE_URL}proyecto-pagos/`;
    }
  }

  // ========================================
  // 📍 OBTENER CIUDADES
  // ========================================
  obtenerCiudades(): Observable<any> {
    const params = new HttpParams().set('accion', 'obtener_ciudades');
    const url = this.buildUrl('transversal');
    
    console.log('🌐 URL obtenerCiudades:', url);
    
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders(),
      params: params
    }).pipe(
      catchError(err => {
        console.error('❌ Error al obtener ciudades:', err);
        return of({ data: [] });
      })
    );
  }

  // ========================================
  // 🏢 OBTENER PROVEEDORES
  // ========================================
  obtenerProveedores(ciudadNombre: string): Observable<any> {
    const params = new HttpParams()
      .set('accion', 'obtener_proveedores')
      .set('ciudad', ciudadNombre.trim())
      .set('from_flow', 'rtm');
    
    const url = this.buildUrl('transversal');
    
    console.log('🏢 Obteniendo proveedores desde:', url);
    
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders(),
      params: params
    }).pipe(
      catchError(err => {
        console.error('❌ Error al obtener proveedores:', err);
        return of({ data: [] });
      })
    );
  }

  // ========================================
  // 🔍 CONSULTAR VEHÍCULO EN RUNT
  // ========================================
consultarVehiculo(params: {
  placa: string;
  tipo_identificacion: string;
  identificacion: string;
  nombres: string;
  celular: string;
}): Observable<any> {
  const body = {
    placa: params.placa,
    cliente: this.cliente,
    tipo_identificacion: params.tipo_identificacion,
    identificacion: params.identificacion
  };
  
  const url = `${this.RUNT_BASE}runt-operations/get_full_runt_information/`;
  
  console.log('🔍 Consultando vehículo en RUNT...');
  console.log('🔍 URL:', url);
  
  return this.http.post<any>(url, body, { 
    headers: this.getRuntHeaders() 
  }).pipe(
    switchMap(resp => {
      console.log('📦 Respuesta RUNT completa:', resp);
      
      const vehiculoData = resp?.data;
      
      if (resp && resp.error === false && vehiculoData) {
        console.log('✅ Consulta RUNT exitosa');
        
        // ✅ EXTRAER FECHA DE VENCIMIENTO
        const fechaVencimiento = vehiculoData.revisionRTMActual?.fecha_vencimiento || null;
        console.log('📅 Fecha de vencimiento extraída:', fechaVencimiento);
        
        return of({
          success: true,
          fromRunt: true,
          data: {
            ...vehiculoData,
            // ✅ Asegurar que fecha_vencimiento_rtm esté disponible
            fecha_vencimiento_rtm: fechaVencimiento,
            clase_vehiculo: vehiculoData.claseVehiculo,
            tipo_servicio: vehiculoData.tipoServicio,
            tipo_combustible: vehiculoData.tipoCombustible,
            modelo: vehiculoData.modelo
          }
        });
      } else {
        console.warn('⚠️ RUNT sin datos, usando fallback');
        return this.consultarSinRunt(params);
      }
    }),
    catchError(err => {
      console.error('❌ Error en RUNT:', err);
      console.warn('⚠️ Usando fallback SIN RUNT');
      return this.consultarSinRunt(params);
    })
  );
}

  // ========================================
  // 🔄 FALLBACK: CONSULTAR SIN RUNT
  // ========================================
  private consultarSinRunt(params: {
    placa: string;
    nombres: string;
    celular: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const httpParams = new HttpParams().set('accion', 'cotizar');
    
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 3);
    
    const bodySinRunt = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: {
        day: fecha.getDate(),
        month: fecha.getMonth() + 1,
        year: fecha.getFullYear()
      },
      franja: '10:30 AM',
      ciudad: 'Bogotá',
      sede: 'CDA AutoMás Revisión Técnico Mecánica Cll 13',
      celular: params.celular,
      correo: 'consulta@automas.com.co',
      nombres: params.nombres,
      clase_vehiculo: 'CAMIONETA',
      tipo_servicio: 'Particular',
      tipo_combustible: 'GASOLINA',
      modelo: '2020',
      fecha_vencimiento_rtm: '2024-09-16T00:00:00',
      from_flow: 'rtm'
    };
    
    return this.http.post<any>(baseUrl, bodySinRunt, { 
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      switchMap(resp => {
        if (resp && (resp.price || resp.modelo || resp.search)) {
          return of({
            success: true,
            fromRunt: false,
            data: {
              ...resp,
              modelo: resp.modelo || 'Vehículo (datos estimados)',
              fecha_vencimiento_rtm: resp.fecha_vencimiento_rtm || null
            }
          });
        } else {
          return of({
            success: false,
            fromRunt: false,
            data: null,
            message: 'No se pudo consultar el vehículo'
          });
        }
      }),
      catchError(err => {
        console.error('❌ Consulta SIN RUNT falló:', err);
        return of({
          success: false,
          fromRunt: false,
          data: null,
          message: 'No se pudo consultar el vehículo'
        });
      })
    );
  }

  private buildFechaAgenda(fecha: Date) {
    return {
      day: fecha.getDate(),
      month: fecha.getMonth() + 1,
      year: fecha.getFullYear()
    };
  }

  // ========================================
  // ⏰ OBTENER HORARIOS DISPONIBLES
  // ========================================
  obtenerHorariosDisponibles(params: {
    sede: string;
    fecha: Date;
    ciudad: string;
    from_flow?: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=obtener_horarios_disponibles`;
    
    const fecha_agenda = {
      day: params.fecha.getDate(),
      month: params.fecha.getMonth() + 1,
      year: params.fecha.getFullYear()
    };
    
    const body = {
      sede: params.sede.trim(),
      fecha_agenda: fecha_agenda,
      from_flow: params.from_flow ?? 'rtm',
      ciudad: params.ciudad.trim()
    };
    
    return this.http.post<any>(url, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(err => {
        console.warn('⚠️ Error al obtener horarios:', err);
        return of({ 
          data: [],
          message: 'Continuar sin horarios'
        });
      })
    );
  }

  // ========================================
  // 💰 COTIZAR CON RUNT
  // ========================================
  cotizarConRunt(params: {
    placa: string;
    fecha: Date;
    franja: string;
    ciudad: string;
    sede: string;
    celular: string;
    correo: string;
    nombres: string;
    tipo_identificacion: string;
    identificacion: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=cotizar`;
    
    const body = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: this.buildFechaAgenda(params.fecha),
      franja: params.franja,
      ciudad: params.ciudad,
      sede: params.sede,
      celular: params.celular,
      correo: params.correo,
      nombres: params.nombres,
      tipo_identificacion: params.tipo_identificacion,
      identificacion: params.identificacion,
      from_flow: 'rtm'
    };
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al cotizar:', err);
        return of({ 
          price: 290000,
          message: 'Precio estimado'
        });
      })
    );
  }

  // ========================================
  // 💰 COTIZAR SIN RUNT
  // ========================================
  cotizarSinRunt(params: {
    placa: string;
    fecha: Date;
    franja: string;
    ciudad: string;
    sede: string;
    celular: string;
    correo: string;
    nombres: string;
    clase_vehiculo: string;
    tipo_servicio: string;
    tipo_combustible: string;
    modelo: string;
    fecha_vencimiento_rtm: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=cotizar`;
    
    const body = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: this.buildFechaAgenda(params.fecha),
      franja: params.franja,
      ciudad: params.ciudad,
      sede: params.sede,
      celular: params.celular,
      correo: params.correo,
      nombres: params.nombres,
      clase_vehiculo: params.clase_vehiculo,
      tipo_servicio: params.tipo_servicio,
      tipo_combustible: params.tipo_combustible,
      modelo: params.modelo,
      fecha_vencimiento_rtm: params.fecha_vencimiento_rtm,
      from_flow: 'rtm'
    };
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al cotizar:', err);
        return of({ 
          price: 290000,
          message: 'Precio estimado'
        });
      })
    );
  }

  // ========================================
  // 📅 AGENDAR CON RUNT
  // ========================================
  agendarConRunt(params: {
    placa: string;
    fecha: Date;
    franja: string;
    ciudad: string;
    sede: string;
    celular: string;
    correo: string;
    nombres: string;
    tipo_identificacion: string;
    identificacion: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=agendar`;
    
    const body = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: this.buildFechaAgenda(params.fecha),
      franja: params.franja,
      ciudad: params.ciudad,
      sede: params.sede,
      celular: params.celular,
      correo: params.correo,
      nombres: params.nombres,
      tipo_identificacion: params.tipo_identificacion,
      identificacion: params.identificacion,
      from_flow: 'rtm'
    };
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al agendar:', err);
        return of({ 
          invoice_id: 999999,
          message: 'Agendamiento simulado'
        });
      })
    );
  }

  // ========================================
  // 📅 AGENDAR SIN RUNT
  // ========================================
  agendarSinRunt(params: {
    placa: string;
    fecha: Date;
    franja: string;
    ciudad: string;
    sede: string;
    celular: string;
    correo: string;
    nombres: string;
    clase_vehiculo: string;
    tipo_servicio: string;
    tipo_combustible: string;
    modelo: string;
    fecha_vencimiento_rtm: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=agendar`;
    
    const body = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: this.buildFechaAgenda(params.fecha),
      franja: params.franja,
      ciudad: params.ciudad,
      sede: params.sede,
      celular: params.celular,
      correo: params.correo,
      nombres: params.nombres,
      clase_vehiculo: params.clase_vehiculo,
      tipo_servicio: params.tipo_servicio,
      tipo_combustible: params.tipo_combustible,
      modelo: params.modelo,
      fecha_vencimiento_rtm: params.fecha_vencimiento_rtm,
      from_flow: 'rtm'
    };
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al agendar:', err);
        return of({ 
          invoice_id: 999999,
          message: 'Agendamiento simulado'
        });
      })
    );
  }

  // ========================================
  // 💳 REGISTRAR PAGO
  // ========================================
  registrarPago(invoiceId: number): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=registrar_pago`;
    
    const body = {
      invoice_id: invoiceId
    };
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al registrar pago:', err);
        return of({ 
          success: false,
          message: 'Error al registrar el pago'
        });
      })
    );
  }

  // ========================================
  // 🗄️ CACHE DE CIUDADES
  // ========================================
  private ciudadesCache: any[] = [];

  setCiudades(ciudades: any[]) {
    this.ciudadesCache = ciudades;
  }

  ciudades(): any[] {
    return this.ciudadesCache;
  }
}