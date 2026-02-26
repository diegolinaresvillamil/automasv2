import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  DestroyRef,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
  catchError,
  finalize,
} from 'rxjs/operators';

import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { PagosApiService } from '../../../core/services/pagos-api.service';
import { GenerarLinkPagoRequest } from '../../../shared/models/pagos.models';

type DocType = 'CC' | 'CE' | 'NIT' | 'PAS';

interface Tramite {
  id: string;
  nombre: string;
  iconSrc: string;
}

const LS_TRAMITES_AGENDAMIENTO_ID = 'tramites_agendamiento_id';
const LS_TRAMITES_RESUMEN = 'tramites_resumen';

// ✅ CLAVE QUE YA USA pago-exitoso.ts
const LS_ULTIMA_RESERVA = 'ultima_reserva';

@Component({
  selector: 'app-agendar-tramites',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './agendar-tramites.html',
  styleUrls: ['./agendar-tramites.scss'],
})
export class AgendarTramitesComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  private destroyRef = inject(DestroyRef);

  // ===== UI State =====
  currentStep = 1;
  step2SubStep = 1;
  step3SubStep = 1;
  step4SubStep = 1;

  isLoading = false;
  selectedTramite = '';
  codigoPromocional = '';
  aceptaCondiciones = false;

  // ✅ NUEVO: nombre del servicio EXACTO para API (para mostrarlo tal cual en resumen/pago)
  servicioApiNombre = '';

  // ===== API State =====
  horariosDisponibles: string[] = [];
  ciudadesDisponibles: string[] = [];
  serviciosDisponibles: any[] = [];
  proveedoresDisponibles: any[] = [];

  ciudadOperativa = 'Bogotá';
  sedeOperativa = '';
  servicioOperativo = '';
  servicesContainsId: number | null = 85;

  // precio real desde cotizar (si aplica)
  precioApi = 0;

  // ✅ Proyecto fijo (igual RTM/Peritaje)
  private readonly NOMBRE_PROYECTO_PAGOS = 'pagina_web';

  docTypes = [
    { value: 'CC', label: 'Cédula de ciudadanía' },
    { value: 'CE', label: 'Cédula de extranjería' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PAS', label: 'Pasaporte' },
  ];

  tramites: Tramite[] = [
    { id: 'matricula', nombre: 'Matrícula/Registro', iconSrc: 'assets/matricula.svg' },
    { id: 'traspaso', nombre: 'Traspaso', iconSrc: 'assets/traspaso.svg' },
    { id: 'traslado', nombre: 'Traslado Matrícula', iconSrc: 'assets/traslado.svg' },
    { id: 'radicado', nombre: 'Radicado y Matrícula', iconSrc: 'assets/radicado.svg' },
    { id: 'cambio-color', nombre: 'Cambio de color', iconSrc: 'assets/color.svg' },
    { id: 'regrabar-chasis', nombre: 'Regrabar Chasis', iconSrc: 'assets/chasis.svg' },
    { id: 'regrabacion-motor', nombre: 'Regrabación de Motor', iconSrc: 'assets/motor.svg' },
    { id: 'cambio-servicio', nombre: 'Cambio de servicio', iconSrc: 'assets/servicio.svg' },
    { id: 'transformacion', nombre: 'Transformación', iconSrc: 'assets/transformacion.svg' },
    { id: 'duplicado', nombre: 'Duplicado', iconSrc: 'assets/duplicado.svg' },
    { id: 'levantamiento-prenda', nombre: 'Levantamiento Prenda', iconSrc: 'assets/prenda.svg' },
    { id: 'cancelacion', nombre: 'Cancelación de Matrícula', iconSrc: 'assets/cancelacion.svg' },
  ];

  precios: Record<string, number> = {
    matricula: 80000,
    traspaso: 80000,
    traslado: 80000,
    radicado: 80000,
    'cambio-color': 80000,
    'regrabar-chasis': 80000,
    'regrabacion-motor': 80000,
    'cambio-servicio': 80000,
    transformacion: 80000,
    duplicado: 80000,
    'levantamiento-prenda': 80000,
    cancelacion: 80000,
  };

  // ===== Forms =====
  form: FormGroup;
  step2Form: FormGroup;
  step3Form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private tramitesApi: TramitesApiService,
    private pagosApi: PagosApiService
  ) {
    this.form = this.fb.group({
      placa: ['', [Validators.required, this.placaValidator.bind(this)]],
      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      tipoDocumento: ['CC', Validators.required],
      numeroDocumento: ['', Validators.required],
      aceptaDatos: [false, Validators.requiredTrue],
    });

    this.step2Form = this.fb.group({
      fechaTramite: ['', Validators.required],
      horaTramite: ['', Validators.required],
    });

    this.step3Form = this.fb.group({
      placa: ['', [Validators.required, this.placaValidator.bind(this)]],
      nombreVendedor: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      tipoDocVendedor: ['CC', Validators.required],
      numeroDocVendedor: ['', Validators.required],
      tipoDocComprador: ['', Validators.required],
      numeroDocComprador: ['', Validators.required],
    });

    // Normalizadores
    this.step3Form
      .get('placa')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: string) => {
        const cleaned = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (cleaned !== v) this.step3Form.get('placa')?.setValue(cleaned, { emitEvent: false });
      });

    this.step3Form
      .get('telefono')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: string) => {
        const cleaned = (v || '').replace(/[^\d]/g, '').slice(0, 10);
        if (cleaned !== v) this.step3Form.get('telefono')?.setValue(cleaned, { emitEvent: false });
      });

    // ✅ Horarios: cuando cambia la fecha, pide slots al backend
    this.step2Form
      .get('fechaTramite')
      ?.valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(250),
        distinctUntilChanged(),
        tap(() => {
          this.horariosDisponibles = [];
          this.step2Form.get('horaTramite')?.setValue('');
        }),
        switchMap((fechaISO: string) => {
          if (!fechaISO || !this.sedeOperativa || !this.servicioOperativo) return of([]);

          // ✅ NO mandes from_flow acá. El service ya lo mete en el body.
          return this.tramitesApi
            .obtenerHorariosDisponibles({
              sede: this.sedeOperativa,
              servicio: this.servicioOperativo,
              fechaISO,
            })
            .pipe(
              tap((resp: any) => console.log('✅ [Trámites] Respuesta horarios:', resp)),
              switchMap((resp: any) => of(this.parseHorarios(resp))),
              catchError((e) => {
                console.error('❌ [Trámites] Error obteniendo horarios', e);
                return of([]);
              })
            );
        })
      )
      .subscribe((horas: string[]) => {
        this.horariosDisponibles = Array.isArray(horas) ? horas : [];
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.bootstrapModalData();
    }
  }

  get f() {
    return this.form.controls;
  }
  get f2() {
    return this.step2Form.controls;
  }
  get f3() {
    return this.step3Form.controls;
  }

  private placaValidator(control: AbstractControl): ValidationErrors | null {
    const v = ((control.value as string) || '').toUpperCase();
    if (!v) return null;
    if (!/^[A-Z0-9]{6}$/.test(v)) return { placaFormato: true };
    return null;
  }

  private isoToFechaAgenda(fechaISO: string): { day: number; month: number; year: number } {
    const [y, m, d] = (fechaISO || '').split('-').map((n) => Number(n));
    return { day: d, month: m, year: y };
  }

  selectTramite(tramiteId: string): void {
    this.selectedTramite = tramiteId;

    // ✅ Setea también el servicio exacto API (para mostrar en resumen)
    const nombreUI = this.getSelectedTramiteName();
    this.servicioApiNombre = this.mapearNombreServicio(nombreUI);
  }

  getSelectedTramiteName(): string {
    return this.tramites.find((t) => t.id === this.selectedTramite)?.nombre || '';
  }

  getSelectedTramiteIconSrc(): string {
    return this.tramites.find((t) => t.id === this.selectedTramite)?.iconSrc || '';
  }

  getPrecioTramite(): number {
    return this.precioApi > 0 ? this.precioApi : this.precios[this.selectedTramite] || 0;
  }

  getFechaTransaccion(): string {
    const fecha = this.step2Form.get('fechaTramite')?.value;
    const hora = this.step2Form.get('horaTramite')?.value;
    if (!fecha || !hora) return '';
    return `${fecha} - ${hora}`;
  }

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private docTypeToApiLabel(doc: DocType): string {
    const map: Record<DocType, string> = {
      CC: 'Cedula de Ciudadania',
      CE: 'Cedula de Extranjeria',
      NIT: 'NIT',
      PAS: 'Pasaporte',
    };
    return map[doc] || 'Cedula de Ciudadania';
  }

  // ✅ NUEVO: nombre del servicio para mostrar en la pantalla de pago (tal cual API)
  // Si aún no está definido, cae al nombre UI para no romper nada.
  getNombreServicioResumen(): string {
    return (this.servicioApiNombre || this.servicioOperativo || '').trim() || this.getSelectedTramiteName();
  }

  // ✅ Ciudad default como el viejo: “Trámites Vehiculares”
  private pickCiudadOperativa(ciudades: any[]): string {
    const asStr = (ciudades || [])
      .map((c: any) => (typeof c === 'string' ? c : c?.name || c?.nombre || c?.ciudad))
      .filter(Boolean);

    const tramitesVeh = asStr.find(
      (x: string) => /trámites\s+vehiculares/i.test(x) || /tramites\s+vehiculares/i.test(x)
    );
    if (tramitesVeh) return tramitesVeh;

    const pre = asStr.find((x: string) => /preliquid/i.test(x));
    return pre || asStr.find((x: string) => /bogot/i.test(x)) || asStr[0] || 'Bogotá';
  }

  // ✅ Mapeo EXACTO (incluye dobles espacios como tu código viejo)
  private mapearNombreServicio(nombreUI: string): string {
    const mapeo: Record<string, string> = {
      'Matrícula/Registro': 'Tramite  Preliquidación Radicado Matrícula/Registro',
      'Traspaso': 'Tramite  Preliquidación Traspaso de vehículo',
      'Traslado Matrícula': 'Tramite Traslado y Radicación de Cuenta.',
      'Radicado y Matrícula': 'Tramite  Preliquidación Radicado Matrícula/Registro',
      'Cambio de color': 'Tramite  Preliquidación Cambio de color ',
      'Regrabar Chasis': 'Tramite Regrabar Chasis',
      'Regrabación de Motor': 'Tramite  Preliquidación Regrabación Motor ',
      'Cambio de servicio': 'Tramite  Preliquidación Cambio de Servicio',
      'Transformación': 'Tramite  Preliquidación Cambio de Carrocería',
      'Duplicado': 'Tramite  Preliquidación Duplicado de Placas',
      'Levantamiento Prenda': 'Tramite Preliquidación Levantamiento de Prenda',
      'Cancelación de Matrícula': 'Tramite  Preliquidación Cancelación de Matricula ',
    };

    return mapeo[nombreUI] || nombreUI;
  }

  private parseHorarios(response: any): string[] {
    let franjasRaw: any[] = [];

    if (Array.isArray(response) && response.length > 0 && response[0]?.slots) {
      franjasRaw = response[0].slots;
    } else if (response && Array.isArray(response.franjas)) {
      franjasRaw = response.franjas;
    } else if (Array.isArray(response)) {
      franjasRaw = response;
    } else if (response && Array.isArray(response.slots)) {
      franjasRaw = response.slots;
    } else if (response && response.data && Array.isArray(response.data)) {
      franjasRaw = response.data;
    }

    return franjasRaw.map((slot: any) => {
      if (typeof slot === 'object' && slot !== null) {
        return slot.time || slot.slot || slot.hora || slot.franja || slot.id || JSON.stringify(slot);
      } else if (typeof slot === 'string') {
        return slot;
      }
      return String(slot);
    });
  }

  private bootstrapModalData(): void {
    this.horariosDisponibles = [];
    this.ciudadesDisponibles = [];
    this.serviciosDisponibles = [];
    this.proveedoresDisponibles = [];

    this.ciudadOperativa = 'Bogotá';
    this.sedeOperativa = '';
    this.servicioOperativo = '';
    this.servicioApiNombre = '';
    this.servicesContainsId = 85;
    this.precioApi = 0;

    this.tramitesApi
      .obtenerCiudades()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((response: any) => {
          const list = response?.data || response?.results || response || [];
          const ciudades = Array.isArray(list) ? list : [];
          this.ciudadOperativa = this.pickCiudadOperativa(ciudades);
          this.ciudadesDisponibles = ciudades
            .map((c: any) => (typeof c === 'string' ? c : c?.name || c?.nombre || c?.ciudad))
            .filter(Boolean);

          console.log('✅ [Trámites] Ciudades cargadas:', this.ciudadesDisponibles.length);
          console.log('✅ [Trámites] Ciudad operativa:', this.ciudadOperativa);
        }),
        catchError((e) => {
          console.error('❌ [Trámites] Error cargando catálogos', e);
          return of(null);
        })
      )
      .subscribe();
  }

  continueToStep2(): void {
    if (!this.selectedTramite) return;

    const nombreUI = this.getSelectedTramiteName();

    // ✅ set servicio operativo con mapeo exacto
    this.servicioOperativo = this.mapearNombreServicio(nombreUI);

    // ✅ guarda el nombre API para resumen/pago
    this.servicioApiNombre = this.servicioOperativo;

    this.currentStep = 2;
    this.step2SubStep = 1;

    this.isLoading = true;

    this.tramitesApi
      .obtenerProveedores(this.ciudadOperativa, this.servicesContainsId ?? 85)
      .pipe(
        finalize(() => (this.isLoading = false)),
        catchError((e) => {
          console.error('❌ [Trámites] Error obteniendo proveedores', e);
          return of(null);
        })
      )
      .subscribe((resp: any) => {
        const list = resp?.data || resp?.results || resp?.proveedores || resp || [];
        const proveedores = Array.isArray(list) ? list : [];

        if (!proveedores.length) {
          console.warn('🔥 FORZANDO proveedor (hardcoded - API no devuelve lista)');
          this.sedeOperativa = 'Preliquidación Trámites Vehiculares ';
          return;
        }

        this.proveedoresDisponibles = proveedores;

        const first = this.proveedoresDisponibles[0];
        this.sedeOperativa =
          typeof first === 'string'
            ? first
            : first?.name || first?.nombre || first?.sede || first?.provider || '';

        const fecha = this.step2Form.get('fechaTramite')?.value;
        if (fecha) this.step2Form.get('fechaTramite')?.setValue(fecha);
      });
  }

  advanceToStep2_2(): void {
    if (this.step2Form.valid) this.step2SubStep = 2;
  }

  continueToStep3(): void {
    if (!this.step2Form.valid) return;
    this.currentStep = 3;
    this.step3SubStep = 1;
  }

  canAdvanceToStep3_2(): boolean {
    return !!(
      this.step3Form.get('placa')?.valid &&
      this.step3Form.get('nombreVendedor')?.valid &&
      this.step3Form.get('telefono')?.valid &&
      this.step3Form.get('correo')?.valid
    );
  }
  advanceToStep3_2(): void {
    if (this.canAdvanceToStep3_2()) this.step3SubStep = 2;
  }

  canAdvanceToStep3_3(): boolean {
    return !!(
      this.step3Form.get('tipoDocVendedor')?.valid &&
      this.step3Form.get('numeroDocVendedor')?.valid
    );
  }
  advanceToStep3_3(): void {
    if (this.canAdvanceToStep3_3()) this.step3SubStep = 3;
  }

  canAdvanceToStep3_4(): boolean {
    return !!(
      this.step3Form.get('tipoDocComprador')?.valid &&
      this.step3Form.get('numeroDocComprador')?.valid
    );
  }
  advanceToStep3_4(): void {
    if (this.canAdvanceToStep3_4()) this.step3SubStep = 4;
  }

  confirmarTramite(): void {
    if (this.step3Form.invalid || this.step2Form.invalid) {
      this.step3Form.markAllAsTouched();
      this.step2Form.markAllAsTouched();
      return;
    }

    if (!this.sedeOperativa || !this.servicioOperativo) {
      alert('No fue posible identificar sede/servicio para agendar. Reintenta.');
      return;
    }

    const fechaISO = this.step2Form.get('fechaTramite')?.value as string;
    const franja = this.step2Form.get('horaTramite')?.value as string;

    const payloadBase: any = {
      cliente: 'pagina_web',
      placa: this.step3Form.get('placa')?.value,
      fecha_agenda: this.isoToFechaAgenda(fechaISO),
      franja,
      ciudad: this.ciudadOperativa,
      sede: this.sedeOperativa,
      servicio: this.servicioOperativo,
      tipo_identificacion: this.docTypeToApiLabel(this.step3Form.get('tipoDocVendedor')?.value),
      identificacion: this.step3Form.get('numeroDocVendedor')?.value,
      celular: this.step3Form.get('telefono')?.value,
      correo: this.step3Form.get('correo')?.value,
      nombres: this.step3Form.get('nombreVendedor')?.value,
      from_flow: 'trámites',
    };

    this.isLoading = true;

    this.tramitesApi
      .cotizar(payloadBase)
      .pipe(
        tap((cot: any) => {
          const possible =
            cot?.valor ||
            cot?.total ||
            cot?.price ||
            cot?.data?.valor ||
            cot?.data?.total ||
            cot?.data?.price;

          const n = Number(possible);
          this.precioApi = Number.isFinite(n) && n > 0 ? n : 0;
        }),
        switchMap(() => this.tramitesApi.agendar(payloadBase)),
        finalize(() => (this.isLoading = false)),
        catchError((e) => {
          console.error('❌ [Trámites] Error cotizar/agendar', e);
          alert('No fue posible agendar el trámite. Intenta nuevamente.');
          return of(null);
        })
      )
      .subscribe((ag: any) => {
        if (!ag) return;

        const agId =
          ag?.invoice_id ||
          ag?.agendamiento_id ||
          ag?.id ||
          ag?.uuid ||
          ag?.data?.invoice_id ||
          ag?.data?.agendamiento_id ||
          ag?.data?.id ||
          ag?.data?.uuid ||
          ag?.codeBooking ||
          ag?.data?.codeBooking;

        if (!agId) {
          console.error('❌ [Trámites] No llegó identificador usable', ag);
          alert('No se recibió el ID del agendamiento.');
          return;
        }

        localStorage.setItem(LS_TRAMITES_AGENDAMIENTO_ID, String(agId));

        localStorage.setItem(
          LS_TRAMITES_RESUMEN,
          JSON.stringify({
            agendamiento_id: agId,
            invoice_id: ag?.invoice_id ?? null,
            codeBooking: ag?.codeBooking ?? null,
            tramite_ui: this.getSelectedTramiteName(),
            servicio_api: this.servicioOperativo,
            ciudad: this.ciudadOperativa,
            sede: this.sedeOperativa,
            fecha: fechaISO,
            franja,
            precio: this.getPrecioTramite(),
            placa: this.step3Form.get('placa')?.value,
            nombre: this.step3Form.get('nombreVendedor')?.value,
            telefono: this.step3Form.get('telefono')?.value,
            correo: this.step3Form.get('correo')?.value,
          })
        );

        this.currentStep = 4;
        this.step4SubStep = 1;
      });
  }

  aplicarCodigo(): void {
    if (this.codigoPromocional.trim()) {
      alert(`Código "${this.codigoPromocional}" aplicado (pendiente integración real)`);
    }
  }

  advanceToStep4_2(): void {
    this.step4SubStep = 2;
  }
  advanceToStep4_3(): void {
    this.step4SubStep = 3;
  }

  // ========================================
  // ✅ HELPER: construir servicio_label SIN inventar
  // (usa lo que ya guardaste en LS_TRAMITES_RESUMEN)
  // ========================================
  private buildServicioLabelFromResumen(): string {
    try {
      const raw = localStorage.getItem(LS_TRAMITES_RESUMEN);
      const data = raw ? JSON.parse(raw) : null;

      const placa = (data?.placa || this.step3Form.get('placa')?.value || '').toString().trim();
      const servicio = (data?.servicio_api || this.getNombreServicioResumen() || '').toString().trim();
      const sede = (data?.sede || this.sedeOperativa || '').toString().trim();
      const fecha = (data?.fecha || this.step2Form.get('fechaTramite')?.value || '').toString().trim();
      const franja = (data?.franja || this.step2Form.get('horaTramite')?.value || '').toString().trim();
      const codeBooking = (data?.codeBooking || '').toString().trim();

      const partes = [
        placa || '',
        servicio ? `${servicio}` : '',
        fecha && franja ? `${fecha} ${franja}` : '',
        codeBooking ? `(Reserva número ${codeBooking})` : '',
        sede || '',
      ].filter(Boolean);

      // Formato tipo RTM: separados por " ,"
      return partes.join(' ,');
    } catch (e) {
      // fallback ultra seguro
      const placa = (this.step3Form.get('placa')?.value || '').toString().trim();
      const servicio = this.getNombreServicioResumen();
      return [placa, servicio].filter(Boolean).join(' ,') || 'Trámite';
    }
  }

  // ========================================
  // ✅ NUEVO: armar y guardar ultima_reserva (lo que lee /pago-exitoso)
  // ========================================
  private guardarUltimaReservaTramites(): void {
    try {
      const raw = localStorage.getItem(LS_TRAMITES_RESUMEN);
      const data = raw ? JSON.parse(raw) : null;

      const invoiceIdRaw = data?.invoice_id ?? null;
      const invoiceId =
        typeof invoiceIdRaw === 'number' ? invoiceIdRaw : invoiceIdRaw ? Number(invoiceIdRaw) : undefined;

      const codeBooking = (data?.codeBooking ?? '').toString().trim();
      const monto = Number(data?.precio ?? this.getPrecioTramite() ?? 0);

      const fecha = (data?.fecha ?? this.step2Form.get('fechaTramite')?.value ?? '').toString().trim();
      const franja = (data?.franja ?? this.step2Form.get('horaTramite')?.value ?? '').toString().trim();

      const reserva = {
        tipo: 'tramites',
        invoiceId: invoiceId,
        codeBooking: codeBooking,
        monto: monto,
        nombreServicio: this.getNombreServicioResumen(),
        sede: (data?.sede ?? this.sedeOperativa ?? '').toString(),
        fecha: fecha && franja ? `${fecha} - ${franja}` : (data?.fecha ?? ''),
        placa: (data?.placa ?? this.step3Form.get('placa')?.value ?? '').toString(),
      };

      localStorage.setItem(LS_ULTIMA_RESERVA, JSON.stringify(reserva));
      console.log('💾 [Trámites] ultima_reserva actualizada:', reserva);
    } catch (e) {
      // fallback: aun así sobre-escribe para no quedar con peritaje
      const reserva = {
        tipo: 'tramites',
        monto: Number(this.getPrecioTramite() || 0),
        nombreServicio: this.getNombreServicioResumen(),
        sede: this.sedeOperativa || '',
        fecha: this.getFechaTransaccion() || '',
        placa: (this.step3Form.get('placa')?.value || '').toString(),
      };
      localStorage.setItem(LS_ULTIMA_RESERVA, JSON.stringify(reserva));
      console.warn('⚠️ [Trámites] Fallback ultima_reserva:', reserva);
    }
  }

  // ========================================
  // ✅ CONFIRMAR PAGO - ESTILO RTM (SIN obtenerProyectoPago)
  // ========================================
  confirmarPago(): void {
    if (!this.aceptaCondiciones) {
      alert('Debes aceptar las condiciones del servicio');
      return;
    }

    const agId = localStorage.getItem(LS_TRAMITES_AGENDAMIENTO_ID);
    if (!agId) {
      alert('No se encontró el ID de agendamiento. Vuelve a agendar el trámite.');
      return;
    }

    // intenta extraer invoice_id y codeBooking desde resumen
    let invoiceId: number | null = null;
    let codeBooking: string | null = null;

    try {
      const raw = localStorage.getItem(LS_TRAMITES_RESUMEN);
      const data = raw ? JSON.parse(raw) : null;
      const inv = data?.invoice_id;
      invoiceId = typeof inv === 'number' ? inv : inv ? Number(inv) : null;
      codeBooking = data?.codeBooking ?? null;
    } catch {
      invoiceId = null;
      codeBooking = null;
    }

    // guarda invoice_id por si lo usas después en /pago-exitoso para registrar_pago
    if (invoiceId) {
      localStorage.setItem('ultimo_invoice_id', String(invoiceId));
    }
    if (codeBooking) {
      localStorage.setItem('ultimo_codigo_reserva', String(codeBooking));
    }

    const servicioLabel = this.buildServicioLabelFromResumen();

    const pagoRequest: GenerarLinkPagoRequest = {
      proyecto: this.NOMBRE_PROYECTO_PAGOS as any, // 'pagina_web' igual RTM
      medio_pago: 'mercadopago' as any,
      servicio_label: servicioLabel as any,
      valor: this.getPrecioTramite() as any,
      placa_vehiculo: (this.step3Form.get('placa')?.value || '') as any,
      sede: null as any,
      servicio_tipovehiculo: null as any,
      urls: {
        success: `${window.location.origin}/pago-exitoso`,
        failure: `${window.location.origin}/pago-fallido`,
        pending: `${window.location.origin}/pago-pendiente`,
      } as any,
    } as any;

    console.log('💳 [Trámites] Generando link de pago:', pagoRequest);

    this.isLoading = true;

    this.pagosApi
      .generarLinkPago(pagoRequest)
      .pipe(
        finalize(() => (this.isLoading = false)),
        catchError((e) => {
          console.error('❌ [Trámites][Pagos] Error generando link', e);
          alert('No fue posible generar el link de pago. Intenta nuevamente.');
          return of(null);
        })
      )
      .subscribe((resp) => {
        if (!resp) return;

        const pagoId = (resp as any)?.pago_id;
        const link = (resp as any)?.payment_link;

        if (pagoId) localStorage.setItem('ultimo_pago_id', String(pagoId));

        if (!link) {
          console.error('❌ [Trámites][Pagos] No llegó payment_link', resp);
          alert('No se recibió la URL de pago.');
          return;
        }

        // ✅ CLAVE: SOBRE-ESCRIBIR ultima_reserva para que /pago-exitoso NO lea peritaje
        this.guardarUltimaReservaTramites();

        console.log('🔗 [Trámites][Pagos] Redirigiendo a Mercado Pago:', link);
        window.location.href = link;
      });
  }

  goBack(): void {
    if (this.currentStep === 2 && this.step2SubStep > 1) {
      this.step2SubStep--;
    } else if (this.currentStep === 3 && this.step3SubStep > 1) {
      this.step3SubStep--;
    } else if (this.currentStep === 4 && this.step4SubStep > 1) {
      this.step4SubStep--;
    } else if (this.currentStep > 1) {
      this.currentStep--;
      this.step2SubStep = 1;
      this.step3SubStep = 1;
      this.step4SubStep = 1;
    }
  }

  openConditions(): void {
    alert('Condiciones del trámite...');
  }

  onClose(): void {
    this.currentStep = 1;
    this.step2SubStep = 1;
    this.step3SubStep = 1;
    this.step4SubStep = 1;

    this.selectedTramite = '';
    this.codigoPromocional = '';
    this.aceptaCondiciones = false;
    this.isLoading = false;

    this.horariosDisponibles = [];
    this.ciudadesDisponibles = [];
    this.serviciosDisponibles = [];
    this.proveedoresDisponibles = [];

    this.ciudadOperativa = 'Bogotá';
    this.sedeOperativa = '';
    this.servicioOperativo = '';
    this.servicioApiNombre = '';
    this.servicesContainsId = 85;
    this.precioApi = 0;

    this.form.reset({ tipoDocumento: 'CC', aceptaDatos: false });
    this.step2Form.reset();
    this.step3Form.reset({ tipoDocVendedor: 'CC', tipoDocComprador: '' });

    this.close.emit();
  }

  onBackdropClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.onClose();
  }
}