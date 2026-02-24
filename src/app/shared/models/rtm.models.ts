// ========================================
// RESPUESTA GENÉRICA DE LA API
// ========================================
export interface ApiResponse<T> {
  data: T;
  metadata?: {
    items_count: number;
    pages_count: number;
    page: number;
    on_page: number;
  };
}

// ========================================
// CIUDAD
// ========================================
export interface Ciudad {
  id: number;
  name: string;
  description: string;
  picture: string;
  picture_preview: string;
  providers: number[];
  address1: string;
  address2: string;
  phone: string;
  city: string;
  zip: string;
  country_id: string;
  is_visible: boolean;
  lat: string;
  lng: string;
  full_address: string;
}

// ========================================
// PROVEEDOR
// ========================================
export interface Proveedor {
  id: number;
  name: string;
  qty: number;
  email: string;
  description: string;
  phone: string;
  picture: string | null;
  picture_preview: string | null;
  color: string | null;
  is_active: boolean;
  is_visible: boolean;
  services: string[];
  lat?: string;  // ✅ AGREGADO - Opcional
  lng?: string;  // ✅ AGREGADO - Opcional
}

// ========================================
// HORARIOS DISPONIBLES
// ========================================
export interface HorarioDisponibleRequest {
  sede: string;
  fecha_agenda: {
    day: number;
    month: number;
    year: number;
  };
  from_flow: string;
  servicio?: string;
}

export interface HorarioDisponibleResponse {
  [key: string]: boolean | string[] | any;
}

// ========================================
// COTIZAR
// ========================================
export interface CotizarRequest {
  cliente: string;
  placa: string;
  fecha_agenda: {
    day: number;
    month: number;
    year: number;
  };
  franja: string;
  ciudad: string;
  sede: string;
  celular: string;
  correo: string;
  nombres: string;
  from_flow: string;
  tipo_identificacion?: string;
  identificacion?: string;
  clase_vehiculo?: string;
  tipo_servicio?: string;
  tipo_combustible?: string;
  modelo?: string;
  fecha_vencimiento_rtm?: string;
}

export interface CotizarResponse {
  cliente: string;
  placa: string;
  fecha_agenda: {
    year: number;
    month: number;
    day: number;
  };
  franja: string;
  ciudad: string;
  sede: string;
  tipo_identificacion?: string;
  identificacion?: string;
  celular: string;
  correo: string;
  nombres: string;
  from_flow: string;
  fecha_vencimiento_rtm?: string;
  es_borrador: boolean;
  servicios_por_placa: boolean;
  grupo_servicio: string;
  clase_vehiculo: string;
  tipo_servicio: string;
  tipo_combustible: string;
  modelo: string;
  tipo_vehiculo: string;
  search: string;
  direccion: string;
  telefono: string;
  maps: string;
  price: number;
}

// ========================================
// AGENDAR
// ========================================
export interface AgendarRequest extends CotizarRequest {}

export interface AgendarResponse extends CotizarResponse {
  proveedor_sbm_id: number;
  categoria_sbm_id: number;
  servicio_sbm_id: number;
  locacion_sbm_id: number;
  producto_sbm_id: number;
  invoice_id: number;
  codeBooking: string;
}

// ========================================
// REGISTRAR PAGO
// ========================================
export interface RegistrarPagoRequest {
  invoice_id: number;
}

export interface RegistrarPagoResponse {
  success: boolean;
  message?: string;
}

// ========================================
// RUNT
// ========================================
export interface RuntResponse {
  placa: string;
  marca: string;
  linea: string;
  modelo: string;
  clase: string;
  servicio: string;
  combustible: string;
  fecha_vencimiento_rtm: string;
}

// ========================================
// HORARIOS DISPONIBLES
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

export interface ObtenerHorariosResponse {
  horarios: string[]; // Ejemplo: ["07:00 AM", "08:00 AM", "09:00 AM"]
}