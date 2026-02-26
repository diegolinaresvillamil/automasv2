import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { RtmApiService } from '../../core/services/rtm-api.service';
import { PeritajeApiService } from '../../core/services/peritaje-api.service';

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

const LS_TRAMITES_RESUMEN = 'tramites_resumen';

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

  private rtmApi = inject(RtmApiService);
  private peritajeApi = inject(PeritajeApiService);

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

    this.route.queryParams.subscribe((params) => {
      console.log('📦 Query params recibidos:', params);

      const pagoId =
        params['payment_id'] ||
        params['pago_id'] ||
        params['external_reference'] ||
        params['collection_id'];

      if (pagoId && pagoId !== 'null') {
        this.procesarPagoExitoso(String(pagoId));
      } else {
        console.warn('⚠️ No se recibió payment_id');
        this.cargarDatosReserva(); // fallback
      }
    });

    this.iniciarContador();
  }

  /**
   * 🔎 Intenta recuperar la reserva:
   * 1) ultima_reserva (como hoy)
   * 2) tramites_resumen (nuevo fallback)
   */
  private getReservaFromStorage(pagoId: string): DatosReserva | null {
    // 1) ultima_reserva (prioridad, no rompemos RTM/Peritaje)
    try {
      const reservaStr = localStorage.getItem('ultima_reserva');
      if (reservaStr) {
        const reserva = JSON.parse(reservaStr) as DatosReserva;
        if (reserva && typeof reserva === 'object') return reserva;
      }
    } catch (e) {
      console.warn('⚠️ ultima_reserva corrupta, se ignora', e);
    }

    // 2) fallback trámites
    try {
      const raw = localStorage.getItem(LS_TRAMITES_RESUMEN);
      if (!raw) return null;

      const data = JSON.parse(raw);
      const invoiceIdRaw = data?.invoice_id ?? null;
      const invoiceId = invoiceIdRaw !== null ? Number(invoiceIdRaw) : undefined;

      const precioRaw = data?.precio ?? data?.valor ?? data?.total ?? null;
      const monto = precioRaw !== null ? Number(precioRaw) : 0;

      const fecha = (data?.fecha || '').toString().trim();
      const franja = (data?.franja || '').toString().trim();
      const fechaFormateada = fecha && franja ? `${fecha} - ${franja}` : (fecha || '');

      const reservaTramites: DatosReserva = {
        tipo: 'tramites',
        invoiceId: Number.isFinite(invoiceId as number) ? (invoiceId as number) : undefined,
        codeBooking: (data?.codeBooking || data?.agendamiento_id || '').toString(),
        monto: Number.isFinite(monto) ? monto : 0,
        nombreServicio: (data?.servicio_api || data?.tramite_ui || 'Trámite Vehicular').toString(),
        sede: (data?.sede || '').toString(),
        fecha: fechaFormateada,
        placa: (data?.placa || '').toString(),
      };

      return reservaTramites;
    } catch (e) {
      console.warn('⚠️ tramites_resumen corrupto, se ignora', e);
    }

    return null;
  }

  /**
   * Procesar el pago exitoso y registrar en backend
   */
  private procesarPagoExitoso(pagoId: string): void {
    try {
      const reserva = this.getReservaFromStorage(pagoId);

      if (!reserva) {
        console.warn('⚠️ No hay datos de reserva en localStorage (ultima_reserva / tramites_resumen)');
        this.valoresPorDefecto(pagoId);
        return;
      }

      console.log('📄 Datos de la reserva:', reserva);

      // Detectar tipo de servicio
      this.tipoServicio = reserva.tipo || 'rtm';

      // Montos
      const monto = Number(reserva.monto || 0);

      // Cargar datos UI
      this.precioServicio.set(monto);
      this.cantidadTotal.set(monto);
      this.cantidad.set(1);

      // Código
      this.codigoReserva.set(reserva.codeBooking || pagoId.substring(0, 10).toUpperCase());

      // Extras
      this.sedeNombre.set(reserva.sede || '');
      this.fechaCita.set(reserva.fecha || '');

      // Nombre real del servicio (si viene desde el flow)
      this.nombreServicio.set(this.obtenerNombreServicio(reserva));

      console.log('✅ Tipo de servicio:', this.tipoServicio);
      console.log('✅ Datos cargados:', {
        nombreServicio: this.nombreServicio(),
        precio: this.precioServicio(),
        codigoReserva: this.codigoReserva()
      });

      // Registrar pago en backend (según tipo)
      const invoiceId = reserva.invoiceId;
      if (invoiceId) {
        this.registrarPagoEnBackend(invoiceId);
      } else {
        console.warn('⚠️ No se encontró invoiceId para registrar el pago');
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
    if (reserva.nombreServicio && reserva.nombreServicio.trim()) {
      return reserva.nombreServicio.trim();
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
   * Registrar el pago en el backend (elige API según tipo)
   * ✅ Peritaje usa PeritajeApi
   * ✅ RTM y Trámites usan RTM (transversal registrar_pago)
   */
  private registrarPagoEnBackend(invoiceId: number): void {
    console.log('💳 Registrando pago para invoiceId:', invoiceId, 'tipo:', this.tipoServicio);

    const obs =
      this.tipoServicio === 'peritaje'
        ? this.peritajeApi.registrarPago(invoiceId)
        : this.rtmApi.registrarPago(invoiceId);

    obs.subscribe({
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
    this.sedeNombre.set('');
    this.fechaCita.set('');
  }

  /**
   * Cargar datos de la reserva desde localStorage (fallback)
   */
  private cargarDatosReserva(): void {
    try {
      const reserva = this.getReservaFromStorage('');
      if (!reserva) return;

      this.tipoServicio = reserva.tipo || 'rtm';

      const monto = Number(reserva.monto || 0);
      this.precioServicio.set(monto);
      this.cantidadTotal.set(monto);

      this.sedeNombre.set(reserva.sede || '');
      this.fechaCita.set(reserva.fecha || '');
      this.codigoReserva.set(reserva.codeBooking || '');
      this.nombreServicio.set(this.obtenerNombreServicio(reserva));
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

  volverAlSitio(): void {
    if (this.intervalo) clearInterval(this.intervalo);
    this.router.navigate(['/']);
  }

  imprimirFactura(): void {
    window.print();
  }

  reservarOtraCita(): void {
    if (this.intervalo) clearInterval(this.intervalo);
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    if (this.intervalo) clearInterval(this.intervalo);
  }
}