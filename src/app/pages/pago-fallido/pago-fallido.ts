import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface DatosReserva {
  tipo?: 'rtm' | 'peritaje' | 'tramites';
  monto?: number;
  nombreServicio?: string;
  sede?: string;
  fecha?: string;
  placa?: string;
}

@Component({
  selector: 'app-pago-fallido',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-fallido.html',
  styleUrls: ['./pago-fallido.scss']
})
export class PagoFallidoComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Signals para datos reactivos
  facturaNumero = signal<string>('');
  fechaIntento = signal<Date>(new Date());
  motivoRechazo = signal<string>('Pago rechazado por la pasarela');
  nombreServicio = signal<string>('');
  sedeNombre = signal<string>('');
  fechaCita = signal<string>('');
  montoIntentado = signal<number>(0);
  segundosRestantes = signal<number>(40);

  private intervalo: any;

  ngOnInit(): void {
    console.log('❌ Página de pago fallido cargada');
    
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      console.log('📦 Query params recibidos:', params);
      
      const pagoId = params['payment_id'] || 
                     params['pago_id'] || 
                     params['external_reference'] || 
                     params['preference_id'] ||
                     params['merchant_order_id'];
      
      console.log('❌ Pago fallido - ID:', pagoId);
      console.log('📋 Status:', params['status'], params['collection_status']);
      
      // Generar número de referencia
      if (pagoId && pagoId !== 'null') {
        const idCorto = pagoId.length > 8 ? pagoId.substring(0, 8) : pagoId;
        this.facturaNumero.set(`F-${idCorto.toUpperCase()}`);
      } else {
        this.facturaNumero.set(`F-${Date.now().toString().substring(0, 8)}`);
      }

      // Detectar motivo del rechazo si viene en los parámetros
      if (params['status_detail']) {
        this.motivoRechazo.set(this.traducirMotivoRechazo(params['status_detail']));
      }
    });

    // Cargar datos de la reserva
    this.cargarDatosReserva();
    
    // Iniciar contador
    this.iniciarContador();
  }

  /**
   * Traducir códigos de rechazo de Mercado Pago
   */
  private traducirMotivoRechazo(codigo: string): string {
    const motivos: { [key: string]: string } = {
      'cc_rejected_bad_filled_card_number': 'Número de tarjeta incorrecto',
      'cc_rejected_bad_filled_date': 'Fecha de vencimiento incorrecta',
      'cc_rejected_bad_filled_other': 'Datos incorrectos',
      'cc_rejected_bad_filled_security_code': 'Código de seguridad incorrecto',
      'cc_rejected_blacklist': 'Tarjeta bloqueada',
      'cc_rejected_call_for_authorize': 'Debes autorizar el pago con tu banco',
      'cc_rejected_card_disabled': 'Tarjeta deshabilitada',
      'cc_rejected_duplicated_payment': 'Pago duplicado',
      'cc_rejected_high_risk': 'Pago rechazado por seguridad',
      'cc_rejected_insufficient_amount': 'Fondos insuficientes',
      'cc_rejected_invalid_installments': 'Cuotas no permitidas',
      'cc_rejected_max_attempts': 'Máximo de intentos alcanzado',
      'cc_rejected_other_reason': 'Tarjeta rechazada'
    };
    
    return motivos[codigo] || 'Pago rechazado por la pasarela';
  }

  /**
   * Cargar datos de la reserva desde localStorage
   */
  private cargarDatosReserva(): void {
    try {
      const reservaStr = localStorage.getItem('ultima_reserva');
      if (reservaStr) {
        const reserva: DatosReserva = JSON.parse(reservaStr);
        
        this.nombreServicio.set(reserva.nombreServicio || this.obtenerNombreServicioPorTipo(reserva.tipo));
        this.sedeNombre.set(reserva.sede || '');
        this.fechaCita.set(reserva.fecha || '');
        this.montoIntentado.set(reserva.monto || 0);

        console.log('📄 Datos de la reserva cargados:', {
          nombreServicio: this.nombreServicio(),
          monto: this.montoIntentado()
        });
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar datos de la reserva');
    }
  }

  /**
   * Obtener nombre del servicio por tipo
   */
  private obtenerNombreServicioPorTipo(tipo?: string): string {
    switch (tipo) {
      case 'peritaje':
        return 'Peritaje Vehicular';
      case 'tramites':
        return 'Trámite Vehicular';
      case 'rtm':
      default:
        return 'Revisión Técnico Mecánica';
    }
  }

  /**
   * Iniciar contador de redirección
   */
  private iniciarContador(): void {
    this.intervalo = setInterval(() => {
      const segundos = this.segundosRestantes() - 1;
      this.segundosRestantes.set(segundos);
      
      if (segundos <= 0) {
        this.volverAlSitio();
      }
    }, 1000);
  }

  /**
   * Volver al sitio web
   */
  volverAlSitio(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
    this.router.navigate(['/']);
  }

  /**
   * Intentar nuevamente el pago
   */
  intentarNuevamente(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
    // Regresar a la página principal para reintentar
    this.router.navigate(['/']);
  }

  /**
   * Contactar soporte por WhatsApp
   */
  contactarSoporte(): void {
    const mensaje = encodeURIComponent(
      `Hola, tuve un problema con mi pago.\nReferencia: ${this.facturaNumero()}\nMonto: $${this.montoIntentado()}`
    );
    window.open(`https://wa.me/573158365888?text=${mensaje}`, '_blank');
  }

  ngOnDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }
}