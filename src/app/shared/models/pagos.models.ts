// ========================================
// MODELOS PARA LA API DE PAGOS
// ========================================

export interface GenerarLinkPagoRequest {
  proyecto: string;
  medio_pago: string;
  servicio_label: string;
  valor: number;
  placa_vehiculo: string;
  sede: null;
  servicio_tipovehiculo: null;
  urls: {
    success: string;
    failure: string;
    pending: string;
  };
}

export interface GenerarLinkPagoResponse {
  pago_id: string;
  preference_id: string | null;
  payment_link: string | null;
}

export interface ProyectoPagoResponse {
  id: number;
  medio_de_pago: {
    id: number;
    nombre: string;
    codigo: string;
    activo: boolean;
  };
  nombre_proyecto: string;
  codigo_proyecto: string;
  estado: boolean;
  medios_de_pago: number[];
}

export interface VerificarEstadoPagoResponse {
  id: number;
  sede: string | null;
  sede_atencion: string | null;
  atendido: boolean;
  servicio_tipovehiculo: string | null;
  placa_vehiculo: string;
  valor: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  created: string;
  modified: string;
  detalles_gateway: {
    id: string;
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
      currency_id: string;
    }>;
    payer: {
      name: string;
      email: string;
    };
    site_id: string;
    init_point: string;
    sandbox_init_point: string;
    external_reference: string;
    operation_type: string;
    auto_return: string;
    back_urls: {
      failure: string;
      pending: string;
      success: string;
    };
  };
  cotizacion: string | null;
  tag_servicio: string | null;
}