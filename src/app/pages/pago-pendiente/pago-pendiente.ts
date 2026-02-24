import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

interface DatosReserva {
  tipo?: 'rtm' | 'peritaje' | 'tramites';
  monto?: number;
  nombreServicio?: string;
  sede?: string;
  fecha?: string;
  placa?: string;
}

@Component({
  selector: 'app-pago-pendiente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-pendiente.html',
  styleUrls: ['./pago-pendiente.scss']
})
export class PagoPendienteComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Signals para datos reactivos
  pagoUuid = signal<string>('');
  facturaNumero = signal<string>('');
  fechaIntento = signal<Date>(new Date());
  nombreServicio = signal<string>('');
  sedeNombre = signal<string>('');
  fechaCita = signal<string>('');
  montoPendiente = signal<number>(0);
  
  // Estado de verificación
  verificando = signal<boolean>(false);
  intentosVerificacion = signal<number>(0);
  maxIntentos = signal<number>(10);
  
  // Progreso
  progreso = signal<number>(0);
  mensajeEstado = signal<string>('Conectando con la pasarela de pago...');
  
  // Control de verificación automática
  private verificacionSub?: Subscription;

  ngOnInit(): void {
    console.log('⏳ Página de pago pendiente cargada');
    
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      console.log('📦 Query params recibidos:', params);
      
      const pagoId = params['payment_id'] || 
                     params['pago_id'] || 
                     params['external_reference'] || 
                     params['preference_id'];
      
      this.pagoUuid.set(pagoId || '');
      
      console.log('⏱️ Pago pendiente - ID:', pagoId);
      
      // Generar número de referencia
      if (pagoId && pagoId !== 'null') {
        const idCorto = pagoId.length > 8 ? pagoId.substring(0, 8) : pagoId;
        this.facturaNumero.set(`P-${idCorto.toUpperCase()}`);
      } else {
        this.facturaNumero.set(`P-${Date.now().toString().substring(0, 8)}`);
      }
    });

    // Cargar datos de la reserva
    this.cargarDatosReserva();
    
    // Simular progreso visual
    this.simularProgreso();
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
        this.montoPendiente.set(reserva.monto || 0);

        console.log('📄 Datos de la reserva cargados:', {
          nombreServicio: this.nombreServicio(),
          monto: this.montoPendiente()
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
   * Simular progreso visual mientras se espera confirmación
   */
  private simularProgreso(): void {
    interval(500).pipe(
      takeWhile(() => this.progreso() < 90)
    ).subscribe(() => {
      const nuevoProgreso = this.progreso() + Math.random() * 5;
      this.progreso.set(Math.min(nuevoProgreso, 90));
      
      // Actualizar mensaje según progreso
      if (this.progreso() < 30) {
        this.mensajeEstado.set('Conectando con la pasarela de pago...');
      } else if (this.progreso() < 60) {
        this.mensajeEstado.set('Verificando transacción con el banco...');
      } else {
        this.mensajeEstado.set('Esperando confirmación final...');
      }
    });
  }

  /**
   * Verificar estado del pago manualmente
   */
  verificarEstado(): void {
    if (!this.pagoUuid() || this.verificando()) return;

    this.verificando.set(true);
    this.intentosVerificacion.set(this.intentosVerificacion() + 1);

    console.log(`🔍 Verificando estado del pago (intento ${this.intentosVerificacion()}/${this.maxIntentos()})`);

    // TODO: Aquí iría la llamada real al backend para verificar el estado
    // Por ahora, simulamos una verificación que mantiene el estado pendiente
    setTimeout(() => {
      this.verificando.set(false);
      this.progreso.set(Math.min(this.progreso() + 5, 90));
      
      console.log('⏱️ Pago aún pendiente, seguir esperando');
      
      // Si se alcanza el máximo de intentos, sugerir al usuario que contacte soporte
      if (this.intentosVerificacion() >= this.maxIntentos()) {
        this.mensajeEstado.set('Por favor contacta a soporte para verificar tu pago');
      }
    }, 2000);

    /* 
    // 🔧 CÓDIGO FUTURO: Implementar cuando tengas endpoint de verificación
    const url = `${this.API_PROXY}?api=pagos&path=pagos/verificar-estado/&pago_id=${this.pagoUuid()}`;
    
    this.http.get(url).subscribe({
      next: (response: any) => {
        const estado = response?.estado?.toLowerCase();

        if (estado === 'aprobado' || estado === 'approved') {
          this.progreso.set(100);
          this.mensajeEstado.set('¡Pago confirmado!');
          
          setTimeout(() => {
            this.router.navigate(['/pago-exitoso'], {
              queryParams: { payment_id: this.pagoUuid() }
            });
          }, 1000);
        } else if (estado === 'rechazado' || estado === 'rejected') {
          this.router.navigate(['/pago-fallido'], {
            queryParams: { payment_id: this.pagoUuid() }
          });
        } else {
          this.verificando.set(false);
          this.progreso.set(Math.min(this.progreso() + 5, 90));
        }
      },
      error: (err) => {
        console.error('❌ Error al verificar:', err);
        this.verificando.set(false);
      }
    });
    */
  }

  /**
   * Volver al sitio web
   */
  volverAlSitio(): void {
    if (this.verificacionSub) {
      this.verificacionSub.unsubscribe();
    }
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    if (this.verificacionSub) {
      this.verificacionSub.unsubscribe();
    }
  }
}