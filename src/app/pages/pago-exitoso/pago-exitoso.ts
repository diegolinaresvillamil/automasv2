import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

interface DatosReserva {
  tipo?: 'rtm' | 'peritaje' | 'tramites';
  invoiceId?: number;
  codeBooking?: string;
  monto?: number;
  nombreServicio?: string;
  sede?: string;
  fecha?: string;
  placa?: string;
}

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-exitoso.html',
  styleUrls: ['./pago-exitoso.scss']
})
export class PagoExitosoComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  // URL del proxy
  private readonly API_PROXY = '/api-proxy.php';

  // Signals para datos reactivos
  codigoReserva = signal<string>('');
  nombreServicio = signal<string>('');
  sedeNombre = signal<string>('');
  fechaCita = signal<string>('');
  precioServicio = signal<number>(0);
  cantidadTotal = signal<number>(0);
  cantidad = signal<number>(1);
  segundosRestantes = signal<number>(40);

  private intervalo: any;
  private tipoServicio: 'rtm' | 'peritaje' | 'tramites' = 'rtm';

  ngOnInit(): void {
    console.log('🎉 Página de pago exitoso cargada');
    
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      console.log('📦 Query params recibidos:', params);
      
      const pagoId = params['payment_id'] || 
                     params['pago_id'] || 
                     params['external_reference'] || 
                     params['collection_id'];
      
      if (pagoId && pagoId !== 'null') {
        this.procesarPagoExitoso(pagoId);
      } else {
        console.warn('⚠️ No se recibió payment_id');
        this.cargarDatosReserva();
      }
    });

    this.iniciarContador();
  }

  /**
   * Procesar el pago exitoso y registrar en backend
   */
  private procesarPagoExitoso(pagoId: string): void {
    try {
      const reservaStr = localStorage.getItem('ultima_reserva');
      
      if (!reservaStr) {
        console.warn('⚠️ No hay datos de reserva en localStorage');
        this.valoresPorDefecto(pagoId);
        return;
      }

      const reserva: DatosReserva = JSON.parse(reservaStr);
      console.log('📄 Datos de la reserva:', reserva);

      // Detectar tipo de servicio
      this.tipoServicio = reserva.tipo || 'rtm';
      
      // Cargar datos comunes
      this.precioServicio.set(reserva.monto || 0);
      this.cantidadTotal.set(reserva.monto || 0);
      this.cantidad.set(1);
      this.codigoReserva.set(reserva.codeBooking || pagoId.substring(0, 10).toUpperCase());
      this.sedeNombre.set(reserva.sede || '');
      this.fechaCita.set(reserva.fecha || '');

      // Nombre del servicio según tipo
      this.nombreServicio.set(this.obtenerNombreServicio(reserva));

      console.log('✅ Tipo de servicio:', this.tipoServicio);
      console.log('✅ Datos cargados:', {
        nombreServicio: this.nombreServicio(),
        precio: this.precioServicio(),
        codigoReserva: this.codigoReserva()
      });

      // Registrar pago en backend
      const invoiceId = reserva.invoiceId;
      if (invoiceId) {
        this.registrarPagoEnBackend(invoiceId);
      } else {
        console.warn('⚠️ No se encontró invoice_id para registrar el pago');
      }

    } catch (error) {
      console.error('❌ Error al procesar pago:', error);
      this.valoresPorDefecto(pagoId);
    }
  }

  /**
   * Obtener nombre del servicio según tipo
   */
  private obtenerNombreServicio(reserva: DatosReserva): string {
    if (reserva.nombreServicio) {
      return reserva.nombreServicio;
    }

    switch (this.tipoServicio) {
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
   * Registrar el pago en el backend
   */
  private registrarPagoEnBackend(invoiceId: number): void {
    console.log('💳 Registrando pago para invoice_id:', invoiceId);

    const body = { invoice_id: invoiceId };
    const url = `${this.API_PROXY}?api=rtm&path=wh/transversal/ejecutar-accion/&accion=registrar_pago`;

    this.http.post(url, body).subscribe({
      next: (response) => {
        console.log('✅ Pago registrado exitosamente:', response);
      },
      error: (err) => {
        console.error('❌ Error al registrar pago:', err);
        // No bloqueamos el flujo, el pago ya se procesó
      }
    });
  }

  /**
   * Valores por defecto si no hay datos en localStorage
   */
  private valoresPorDefecto(pagoId: string): void {
    this.precioServicio.set(0);
    this.cantidadTotal.set(0);
    this.cantidad.set(1);
    this.codigoReserva.set(pagoId.substring(0, 10).toUpperCase());
    this.nombreServicio.set('Servicio');
  }

  /**
   * Cargar datos de la reserva desde localStorage
   */
  private cargarDatosReserva(): void {
    try {
      const reservaStr = localStorage.getItem('ultima_reserva');
      if (reservaStr) {
        const reserva: DatosReserva = JSON.parse(reservaStr);
        this.sedeNombre.set(reserva.sede || '');
        this.fechaCita.set(reserva.fecha || '');
        this.codigoReserva.set(reserva.codeBooking || '');
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar datos de la reserva');
    }
  }

  /**
   * Iniciar contador de redirección automática
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
   * Imprimir factura
   */
  imprimirFactura(): void {
    window.print();
  }

  /**
   * Realizar otro agendamiento
   */
  reservarOtraCita(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }
}