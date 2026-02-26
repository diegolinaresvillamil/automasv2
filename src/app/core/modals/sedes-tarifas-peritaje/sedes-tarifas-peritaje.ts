import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  Pipe,
  PipeTransform,
  DestroyRef,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PeritajeApiService } from '../../../core/services/peritaje-api.service';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
  tap,
  throwError,
  Observable,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// ✅ NUEVO: pagos (igual que agendar-peritaje)
import { PagosApiService } from '../../../core/services/pagos-api.service';
import {
  GenerarLinkPagoRequest,
  GenerarLinkPagoResponse,
} from '../../../shared/models/pagos.models';

@Pipe({
  name: 'sanitizeUrl',
  standalone: true,
})
export class SanitizeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

type DocType = 'CC' | 'CE' | 'NIT' | 'PAS';
type ComboId = 'diamante' | 'oro' | 'plata' | 'domicilio';

interface Sede {
  id: number;
  nombre: string; // UI
  rawNombre: string; // EXACTO como llega del API (para horarios)
  direccion: string;
  horario: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-sedes-tarifas-peritaje',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SanitizeUrlPipe],
  templateUrl: './sedes-tarifas-peritaje.html',
  styleUrl: './sedes-tarifas-peritaje.scss',
})
export class SedesTarifasPeritajeComponent {
  private destroyRef = inject(DestroyRef);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Input() imageSrc = 'assets/peritaje.png';
  @Input() imageAlt = 'Peritaje';

  // =============================
  // ✅ ESTADOS UI
  // =============================
  currentStep = 3;
  isLoading = false;
  isActivatingLocation = false;

  // loaders separados
  isLoadingServicios = false;
  isLoadingSedes = false;

  // ✅ horarios dinámicos (API)
  isLoadingHorarios = false;
  horariosError = '';
  horariosDisponibles: string[] = [];

  step4SubStep = 1;
  step4_2_SubStep = 1;
  step5SubStep = 1;
  step6SubStep = 1;

  sedesCurrentPage = 1;
  sedesPerPage = 2;
  totalSedesPages = 1;

  selectedCiudad = 'Bogotá';
  selectedTipoVehiculo = '';
  selectedSubtipo = '';
  showSubtipos = false;

  // clave interna
  tipoVehiculoNombre = '';

  // combos dinámicos (tabs)
  combos: Array<{ id: ComboId; nombre: string }> = [];
  selectedCombo: ComboId = 'diamante';

  // serviceId real traído del API para filtrar sedes
  private serviceIdByCombo: Partial<Record<ComboId, string>> = {};
  private selectedServiceId: string | null = null;

  // ✅ nombre real del servicio (para obtener_horarios_disponibles)
  private serviceNameByCombo: Partial<Record<ComboId, string>> = {};
  private selectedServiceName: string | null = null;

  selectedSede: Sede | null = null;

  // sedes reales (desde api)
  private sedesRaw: any[] = [];
  sedesPaginadas: Sede[] = [];

  codigoPromocional = '';
  aceptaCondicionesPago = false;

  // =============================
  // ✅ PAGO / AGENDA (igual que agendar-peritaje)
  // =============================
  agendamientoResponse: any = null;
  pagoId: string | null = null;
  paymentLink: string | null = null;
  paymentPreferenceId: string | null = null;

  // =============================
  // ✅ CIUDADES (puedes reemplazar por API luego)
  // =============================
  ciudades = [
    { id: 1, nombre: 'Bogotá' },
    { id: 2, nombre: 'Medellín' },
    { id: 3, nombre: 'Cali' },
    { id: 4, nombre: 'Barranquilla' },
    { id: 5, nombre: 'Cartagena' },
  ];

  // =============================
  // ✅ TIPOS VEHÍCULO
  // =============================
  tiposVehiculo = [
    { id: 'livianos', nombre: 'Vehículos Livianos' },
    { id: 'pesados', nombre: 'Vehículos Pesados' },
    { id: 'moto-urbana', nombre: 'Moto Urbana' },
    { id: 'moto-superbike', nombre: 'Moto Superbike' },
  ];

  subtiposLivianos = [
    { id: 'particular', nombre: 'Particular' },
    { id: 'electrico', nombre: 'Eléctrico/Híbrido' },
  ];

  // =============================
  // ✅ PRECIOS FIJOS (los que me pasaste)
  // =============================
  private readonly PRECIOS_REALES: Record<string, Partial<Record<ComboId, number>>> = {
    'VEHICULOS LIVIANOS': {
      diamante: 502000,
      oro: 426000,
      plata: 296000,
      domicilio: 426000, // solo Bogotá / Cali
    },
    'VEHICULOS PESADOS': {
      oro: 586000,
      plata: 411000,
    },
    'MOTOCICLETAS URBANA': {
      oro: 145000,
      plata: 130000,
    },
    'MOTOCICLETAS SUPERBIKE': {
      oro: 269000,
      plata: 201000,
    },
    'ELECTRICOS O HIBRIDOS': {
      diamante: 441000,
    },
  };

  // =============================
  // ✅ IMÁGENES
  // =============================
  imagenesCombos: Record<string, Record<string, string>> = {
    'VEHICULOS LIVIANOS': {
      diamante: 'assets/peritaje-liviano-diamante.png',
      oro: 'assets/peritaje-liviano-oro.png',
      plata: 'assets/peritaje-liviano-plata.png',
      domicilio: 'assets/domicilio.png',
    },
    'VEHICULOS PESADOS': {
      diamante: 'assets/pesado-diamante.png',
      oro: 'assets/pesado-oro.png',
      plata: 'assets/pesado-plata.png',
      domicilio: 'assets/domicilio.png',
    },
    'MOTOCICLETAS URBANA': {
      diamante: 'assets/urbana-diamante.png',
      oro: 'assets/urbana-oro.png',
      plata: 'assets/urbana-plata.png',
      domicilio: 'assets/domicilio.png',
    },
    'MOTOCICLETAS SUPERBIKE': {
      diamante: 'assets/moto-diamante.png',
      oro: 'assets/moto-oro.png',
      plata: 'assets/moto-plata.png',
      domicilio: 'assets/domicilio.png',
    },
    'ELECTRICOS O HIBRIDOS': {
      diamante: 'assets/electrico-diamante.png',
      oro: 'assets/electrico-oro.png',
      plata: 'assets/electrico-plata.png',
      domicilio: 'assets/domicilio.png',
    },
  };

  // =============================
  // ✅ DESCRIPCIONES (tu bloque)
  // =============================
  descripcionesCombos: Record<string, Record<string, any>> = {
    'VEHICULOS LIVIANOS': {
      diamante: {
        titulo: 'Combo Diamante',
        descripcion: 'El peritaje Para Vehículos Livianos incluye:',
        items: [
          'Estructura y Carrocería +Prueba de Ruta + Improntas y Antecedentes (LTA) + Prueba de Motor + CertiMás Basic+ Diagnóstico Scanner.',
          'verificación chasis',
          'verificación carrocería',
          'verificación accesorios de confort',
          'partes bajas (frenos, dirección, trasmisión, suspensión, escape)',
          'fugas mecánicas',
          'Estado Tapicería',
          'Estimación vida útil de las llantas',
        ],
      },
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El peritaje Para Vehículos Livianos incluye:',
        items: [
          'verificación chasis',
          'verificación carrocería',
          'partes bajas (frenos, dirección, trasmisión)',
          'fugas mecánicas',
          'Estado Tapicería',
        ],
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El peritaje Para Vehículos Livianos incluye:',
        items: ['verificación chasis', 'verificación carrocería', 'fugas mecánicas'],
      },
      domicilio: {
        titulo: 'Combo A Domicilio',
        descripcion: 'El peritaje Para Vehículos Livianos incluye:',
        items: [
          'verificación chasis',
          'verificación carrocería',
          'verificación accesorios de confort',
          'partes bajas (frenos, dirección, trasmisión, suspensión, escape)',
          'fugas mecánicas',
          'Servicio a domicilio',
        ],
      },
    },
    'VEHICULOS PESADOS': {
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El peritaje Para Vehículos Pesados incluye:',
        items: ['verificación chasis', 'verificación carrocería', 'sistema de frenos', 'fugas mecánicas'],
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El peritaje Para Vehículos Pesados incluye:',
        items: ['verificación chasis', 'verificación carrocería básica', 'fugas evidentes'],
      },
    },
    'MOTOCICLETAS URBANA': {
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El peritaje Para Motocicletas Urbanas incluye:',
        items: ['verificación chasis', 'frenos', 'motor', 'cadena'],
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El peritaje Para Motocicletas Urbanas incluye:',
        items: ['verificación chasis', 'frenos básicos', 'motor visual'],
      },
    },
    'MOTOCICLETAS SUPERBIKE': {
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El peritaje Para Motocicletas Superbike incluye:',
        items: ['verificación chasis', 'frenos ABS', 'motor', 'cadena', 'suspensión'],
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El peritaje Para Motocicletas Superbike incluye:',
        items: ['verificación chasis', 'frenos básicos', 'motor visual'],
      },
    },
    'ELECTRICOS O HIBRIDOS': {
      diamante: {
        titulo: 'Combo Diamante',
        descripcion: 'El peritaje Para Vehículos Eléctricos/Híbridos incluye:',
        items: [
          'verificación batería de alto voltaje',
          'sistema de carga',
          'motor eléctrico',
          'convertidor de potencia',
          'sistema de frenos regenerativo',
          'chasis',
          'carrocería',
          'Estado general batería',
        ],
      },
    },
  };

  // =============================
  // ✅ FORM
  // =============================
  docTypes = [
    { value: 'CC', label: 'Cédula de ciudadanía' },
    { value: 'CE', label: 'Cédula de extranjería' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PAS', label: 'Pasaporte' },
  ];

  step5Form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private peritajeApi: PeritajeApiService,
    private pagosApi: PagosApiService
  ) {
    this.step5Form = this.fb.group({
      fechaRevision: ['', Validators.required],
      // ✅ manejar disabled desde el FormControl (quita warning + evita elegir hora sin horarios)
      horaRevision: [{ value: '', disabled: true }, Validators.required],
      placa: ['', [Validators.required, Validators.minLength(6)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      tipoDocumento: ['CC'],
      numeroDocumento: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      correoResultado: ['', [Validators.required, Validators.email]],
      nombreResultado: ['', Validators.required],
      aceptaTerminos: [false, Validators.requiredTrue],
    });

    // normalizadores
    this.step5Form.get('telefono')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').replace(/[^\d]/g, '').slice(0, 10);
      if (cleaned !== v) this.step5Form.get('telefono')?.setValue(cleaned, { emitEvent: false });
    });

    this.step5Form.get('placa')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (cleaned !== v) this.step5Form.get('placa')?.setValue(cleaned, { emitEvent: false });
    });

    this.step5Form.get('numeroDocumento')?.valueChanges.subscribe((v: string) => {
      const tipo = this.step5Form.get('tipoDocumento')?.value as DocType;
      let cleaned = v || '';
      cleaned =
        tipo === 'PAS'
          ? cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '')
          : cleaned.replace(/[^\d]/g, '');
      cleaned = cleaned.slice(0, this.getDocMaxLen(tipo));
      if (cleaned !== v)
        this.step5Form.get('numeroDocumento')?.setValue(cleaned, { emitEvent: false });
    });

    this.step5Form.get('tipoDocumento')?.valueChanges.subscribe(() => {
      this.step5Form.get('numeroDocumento')?.setValue('');
    });

    // ✅ cuando cambia la fecha => pedir horarios al API (por sede + servicio)
    this.step5Form
      .get('fechaRevision')
      ?.valueChanges.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => {
          this.horariosError = '';
          this.horariosDisponibles = [];
          this.step5Form.get('horaRevision')?.setValue('');
          this.step5Form.get('horaRevision')?.disable({ emitEvent: false });
        }),
        switchMap((fecha: string) => this.loadHorariosForDate(fecha)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((horas) => {
        this.horariosDisponibles = horas;

        if (horas.length) {
          this.step5Form.get('horaRevision')?.enable({ emitEvent: false });
        } else {
          this.step5Form.get('horaRevision')?.disable({ emitEvent: false });
          if (this.selectedSede && this.selectedServiceName) {
            this.horariosError = 'No hay horarios disponibles para esta fecha.';
          }
        }
      });
  }

  private getDocMaxLen(type: DocType): number {
    const lens: Record<DocType, number> = { CC: 10, CE: 12, NIT: 10, PAS: 12 };
    return lens[type] || 12;
  }

  // =============================
  // ✅ CLOSE
  // =============================
  onClose(): void {
    this.currentStep = 3;
    this.isLoading = false;
    this.isLoadingServicios = false;
    this.isLoadingSedes = false;

    this.isLoadingHorarios = false;
    this.horariosError = '';
    this.horariosDisponibles = [];

    this.step4SubStep = 1;
    this.step4_2_SubStep = 1;
    this.step5SubStep = 1;
    this.step6SubStep = 1;

    this.selectedTipoVehiculo = '';
    this.selectedSubtipo = '';
    this.tipoVehiculoNombre = '';
    this.showSubtipos = false;

    this.combos = [];
    this.selectedCombo = 'diamante';

    this.serviceIdByCombo = {};
    this.selectedServiceId = null;

    this.serviceNameByCombo = {};
    this.selectedServiceName = null;

    this.sedesRaw = [];
    this.sedesPaginadas = [];
    this.sedesCurrentPage = 1;
    this.totalSedesPages = 1;

    this.selectedSede = null;
    this.codigoPromocional = '';
    this.aceptaCondicionesPago = false;

    // ✅ pago
    this.agendamientoResponse = null;
    this.pagoId = null;
    this.paymentLink = null;
    this.paymentPreferenceId = null;

    this.step5Form.reset({ tipoDocumento: 'CC', aceptaTerminos: false });
    this.step5Form.get('horaRevision')?.disable({ emitEvent: false });

    this.close.emit();
  }

  onBackdropClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.onClose();
  }

  // =============================
  // ✅ BACK
  // =============================
  goBack(): void {
    if (this.currentStep === 6 && this.step6SubStep > 1) {
      this.step6SubStep--;
      return;
    }

    if (this.currentStep === 4 && this.step4SubStep > 1) {
      this.step4SubStep--;
      if (this.step4SubStep === 2) this.step4_2_SubStep = 1;
      return;
    }

    if (this.currentStep > 3) {
      this.currentStep--;
      this.step4SubStep = 1;
      this.step4_2_SubStep = 1;
      this.step6SubStep = 1;
    }
  }

  // =============================
  // ✅ UBICACIÓN (demo)
  // =============================
  activateLocation(): void {
    this.isActivatingLocation = true;
    setTimeout(() => {
      this.isActivatingLocation = false;
      this.currentStep = 4;
      this.step4SubStep = 1;
    }, 800);
  }

  selectManually(): void {
    this.currentStep = 4;
    this.step4SubStep = 1;
  }

  // =============================
  // ✅ TIPO / SUBTIPO
  // =============================
  selectTipoVehiculo(tipo: string): void {
    this.selectedTipoVehiculo = tipo;
    this.showSubtipos = tipo === 'livianos';
    if (tipo !== 'livianos') this.selectedSubtipo = '';
    this.updateTipoVehiculoNombre();
    this.rebuildCombosBySelection();
  }

  selectSubtipo(subtipo: string): void {
    this.selectedSubtipo = subtipo;
    this.updateTipoVehiculoNombre();
    this.rebuildCombosBySelection();
  }

  updateTipoVehiculoNombre(): void {
    if (this.selectedTipoVehiculo === 'livianos') {
      if (this.selectedSubtipo === 'particular') this.tipoVehiculoNombre = 'VEHICULOS LIVIANOS';
      else if (this.selectedSubtipo === 'electrico') this.tipoVehiculoNombre = 'ELECTRICOS O HIBRIDOS';
      else this.tipoVehiculoNombre = '';
      return;
    }

    if (this.selectedTipoVehiculo === 'pesados') this.tipoVehiculoNombre = 'VEHICULOS PESADOS';
    else if (this.selectedTipoVehiculo === 'moto-urbana') this.tipoVehiculoNombre = 'MOTOCICLETAS URBANA';
    else if (this.selectedTipoVehiculo === 'moto-superbike') this.tipoVehiculoNombre = 'MOTOCICLETAS SUPERBIKE';
    else this.tipoVehiculoNombre = '';
  }

  canAdvanceStep4_1(): boolean {
    return this.selectedTipoVehiculo === 'livianos'
      ? this.selectedSubtipo !== ''
      : this.selectedTipoVehiculo !== '';
  }

  advanceToStep4_2(): void {
    if (!this.canAdvanceStep4_1()) return;

    this.rebuildCombosBySelection();

    this.step4SubStep = 2;
    this.step4_2_SubStep = 1;
  }

  // =============================
  // ✅ ARMAR TABS + CONSULTAR SERVICIOS (serviceId + serviceName)
  // =============================
  private rebuildCombosBySelection(): void {
    const tipoKey = this.tipoVehiculoNombre;
    if (!tipoKey) {
      this.combos = [];
      this.selectedCombo = 'diamante';
      return;
    }

    const preciosTipo = this.PRECIOS_REALES[tipoKey] || {};
    const ciudad = (this.selectedCiudad || '').toLowerCase();
    const ciudadOkDomicilio = ciudad === 'bogotá' || ciudad === 'bogota' || ciudad === 'cali';

    const order: ComboId[] = ['diamante', 'oro', 'plata', 'domicilio'];

    const combosDisponibles = order.filter((id) => {
      const precio = preciosTipo[id];
      if (!precio || precio <= 0) return false;
      if (id === 'domicilio') return tipoKey === 'VEHICULOS LIVIANOS' && ciudadOkDomicilio;
      return true;
    });

    this.combos = combosDisponibles.map((id) => ({
      id,
      nombre: id === 'domicilio' ? 'A Domicilio' : id.charAt(0).toUpperCase() + id.slice(1),
    }));

    if (!combosDisponibles.includes(this.selectedCombo)) {
      this.selectedCombo = combosDisponibles[0] || 'diamante';
    }

    this.fetchServiciosAndMapIds();
  }

  private getServiciosParamsBase(): {
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
  } {
    const tipoKey = this.tipoVehiculoNombre;

    const base = {
      grupo_servicio: this.selectedCombo === 'domicilio' ? 'Peritaje domicilio' : 'Peritaje presencial',
      servicios_por_placa: false,
      placa: 'AAA000', // ✅ evita 400 (placa requerida)
      cliente: 'pagina_web',
    };

    if (tipoKey === 'VEHICULOS PESADOS') {
      return { ...base, clase_vehiculo: 'CAMION', tipo_combustible: 'DIESEL', tipo_servicio: 'Particular' };
    }

    if (tipoKey === 'ELECTRICOS O HIBRIDOS') {
      return { ...base, clase_vehiculo: 'VEHICULO', tipo_combustible: 'ELECTRICO', tipo_servicio: 'Particular' };
    }

    if (tipoKey === 'MOTOCICLETAS URBANA' || tipoKey === 'MOTOCICLETAS SUPERBIKE') {
      return { ...base, clase_vehiculo: 'MOTO', tipo_combustible: 'GASOLINA', tipo_servicio: 'Particular' };
    }

    return { ...base, clase_vehiculo: 'VEHICULO', tipo_combustible: 'GASOLINA', tipo_servicio: 'Particular' };
  }

  private extractArray(anyRes: any): any[] {
    return (
      anyRes?.data ||
      anyRes?.results ||
      anyRes?.servicios ||
      anyRes?.services ||
      anyRes?.providers ||
      anyRes?.items ||
      []
    );
  }

  private fetchServiciosAndMapIds(): void {
    if (!this.tipoVehiculoNombre) return;

    this.isLoadingServicios = true;
    const params = this.getServiciosParamsBase();

    console.log('📦 [SEDES] obtener_servicios params:', params);

    this.peritajeApi.obtenerServicios(params).subscribe({
      next: (res) => {
        const list = this.extractArray(res);

        const mapIds: Partial<Record<ComboId, string>> = {};
        const mapNames: Partial<Record<ComboId, string>> = {};

        for (const s of list) {
          const id = String(s?.id ?? s?.service_id ?? s?.pk ?? '');
          const rawName = String(s?.name ?? s?.nombre ?? s?.title ?? '');
          const nameLower = rawName.toLowerCase();

          if (!id || !rawName) continue;

          if (nameLower.includes('diamante')) { mapIds.diamante = id; mapNames.diamante = rawName; }
          if (nameLower.includes('oro'))      { mapIds.oro = id;      mapNames.oro = rawName; }
          if (nameLower.includes('plata'))    { mapIds.plata = id;    mapNames.plata = rawName; }
          if (nameLower.includes('domicilio')){ mapIds.domicilio = id;mapNames.domicilio = rawName; }
        }

        this.serviceIdByCombo = mapIds;
        this.serviceNameByCombo = mapNames;

        this.selectedServiceId = this.serviceIdByCombo[this.selectedCombo] || null;
        this.selectedServiceName = this.serviceNameByCombo[this.selectedCombo] || null;

        console.log('✅ [SEDES] serviceIdByCombo:', this.serviceIdByCombo);
        console.log('✅ [SEDES] serviceNameByCombo:', this.serviceNameByCombo);
        console.log('✅ [SEDES] selectedServiceId:', this.selectedServiceId);
        console.log('✅ [SEDES] selectedServiceName:', this.selectedServiceName);

        this.isLoadingServicios = false;

        // ✅ si ya estás en sedes, recarga sedes
        if (this.step4SubStep === 3) this.fetchSedesFromApi();

        // ✅ si ya estás en step 5 y hay fecha, recarga horarios por el nuevo servicio
        if (this.currentStep === 5) {
          this.horariosDisponibles = [];
          this.horariosError = '';
          this.step5Form.get('horaRevision')?.setValue('');
          this.step5Form.get('horaRevision')?.disable({ emitEvent: false });

          const fecha = this.step5Form.get('fechaRevision')?.value;
          if (fecha && this.selectedSede) {
            this.loadHorariosForDate(fecha).subscribe((h) => {
              this.horariosDisponibles = h;
              if (h.length) this.step5Form.get('horaRevision')?.enable({ emitEvent: false });
            });
          }
        }
      },
      error: (err) => {
        console.error('❌ [SEDES] Error servicios:', err);
        this.serviceIdByCombo = {};
        this.selectedServiceId = null;

        this.serviceNameByCombo = {};
        this.selectedServiceName = null;

        this.isLoadingServicios = false;
      },
    });
  }

  // =============================
  // ✅ MOBILE SUBPASOS 4.2
  // =============================
  advanceToStep4_2_2(): void {
    this.step4_2_SubStep = 2;
  }

  goBackStep4_2(): void {
    if (this.step4_2_SubStep > 1) this.step4_2_SubStep--;
    else this.step4SubStep = 1;
  }

  // =============================
  // ✅ COMBO
  // =============================
  selectCombo(comboId: string): void {
    this.selectedCombo = comboId as ComboId;

    this.fetchServiciosAndMapIds();

    if (this.step4SubStep === 3) {
      this.sedesCurrentPage = 1;
      this.fetchSedesFromApi();
    }
  }

  getPrecioActual(): number {
    const preciosTipo = this.PRECIOS_REALES[this.tipoVehiculoNombre] || {};
    return preciosTipo[this.selectedCombo] || 0;
  }

  getImagenActual(): string {
    const imagenesPorTipo = this.imagenesCombos[this.tipoVehiculoNombre] || {};
    return imagenesPorTipo[this.selectedCombo] || 'assets/peritaje.png';
  }

  getComboDescription(): any {
    const desc = this.descripcionesCombos[this.tipoVehiculoNombre] || {};
    return desc[this.selectedCombo] || { titulo: '', descripcion: '', items: [] };
  }

  getComboNombre(): string {
    const combo = this.combos.find((c) => c.id === this.selectedCombo);
    return combo?.nombre || '';
  }

  // =============================
  // ✅ NOMBRE COMPLETO SERVICIO (API) PARA STEP 6
  // =============================
  getNombreServicioCompleto(): string {
    // Si ya tenemos el nombre exacto del servicio desde el API, úsalo
    const apiName = (this.selectedServiceName || '').trim();
    if (apiName) return apiName;

    // fallback (lo que tenías)
    return `Peritaje ${this.getComboNombre()}`.trim();
  }

  // =============================
  // ✅ PASO 4.3 SEDES (API REAL)
  // =============================
  advanceToStep4_3(): void {
    this.step4SubStep = 3;
    this.sedesCurrentPage = 1;
    this.fetchSedesFromApi();
  }

  /**
   * ✅ Extrae solo Horarios y Dirección desde HTML
   */
  private extractHorarioYDireccionFromHtml(html: string): { horario: string; direccion: string } {
    if (!html) return { horario: '', direccion: '' };

    let text = '';

    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      text = (doc.body?.textContent || '').replace(/\u00A0/g, ' ');
    } catch {
      text = html.replace(/<[^>]+>/g, ' ').replace(/\u00A0/g, ' ');
    }

    text = text.replace(/\s+/g, ' ').trim();

    const pick = (label: string) => {
      const re = new RegExp(`${label}\\s*:?\\s*([^@]+?)(?=\\s*@\\w+\\s*:?|$)`, 'i');
      const m = text.match(re);
      return (m?.[1] || '').trim();
    };

    const horario = pick('@Horarios') || pick('Horarios');
    const direccion = pick('@Dirección') || pick('Dirección');

    return { horario, direccion };
  }

  private mapSedeFromApi(item: any, index: number): Sede {
    const id = Number(item?.id ?? item?.pk ?? item?.provider_id ?? index + 1);

    // ✅ rawNombre debe quedar EXACTO como llega (incluye espacios si el backend los usa)
    const rawNombre = String(item?.name ?? item?.nombre ?? item?.title ?? 'Sede');
    const nombre = rawNombre.trim();

    const parsed = this.extractHorarioYDireccionFromHtml(String(item?.description ?? ''));

    const direccion =
      String(item?.address ?? item?.direccion ?? item?.location?.address ?? '').trim() || parsed.direccion;

    const horario =
      String(item?.schedule ?? item?.horario ?? item?.opening_hours ?? item?.hours ?? '').trim() || parsed.horario;

    let lat = Number(item?.lat ?? item?.latitude ?? item?.location?.lat ?? 0);
    let lng = Number(item?.lng ?? item?.longitude ?? item?.location?.lng ?? 0);

    if (!lat || !lng) {
      lat = 4.65;
      lng = -74.1;
    }

    return { id, nombre, rawNombre, direccion, horario, lat, lng };
  }

  private fetchSedesFromApi(): void {
    this.selectedServiceId = this.serviceIdByCombo[this.selectedCombo] || this.selectedServiceId;
    this.selectedServiceName = this.serviceNameByCombo[this.selectedCombo] || this.selectedServiceName;

    if (!this.selectedServiceId) {
      console.warn('⚠️ [SEDES] Aún no hay serviceId para el combo seleccionado. Reintentando servicios...');
      this.fetchServiciosAndMapIds();
      this.sedesRaw = [];
      this.updateSedesPaginadas();
      return;
    }

    this.isLoadingSedes = true;

    console.log(
      '📍 [SEDES] obtener_proveedores ciudad:',
      this.selectedCiudad,
      'serviceId:',
      this.selectedServiceId
    );

    this.peritajeApi.obtenerProveedores(this.selectedCiudad, String(this.selectedServiceId)).subscribe({
      next: (res) => {
        const list = this.extractArray(res);
        this.sedesRaw = Array.isArray(list) ? list : [];

        console.log('✅ [SEDES] sedes API:', this.sedesRaw);
        console.log('✅ [SEDES] sedesRaw.length:', this.sedesRaw.length);

        this.isLoadingSedes = false;

        const pages = Math.ceil(this.sedesRaw.length / this.sedesPerPage) || 1;
        if (this.sedesCurrentPage > pages) this.sedesCurrentPage = 1;

        this.updateSedesPaginadas();
      },
      error: (err) => {
        console.error('❌ [SEDES] Error sedes:', err);
        this.sedesRaw = [];
        this.isLoadingSedes = false;
        this.updateSedesPaginadas();
      },
    });
  }

  selectSede(sede: Sede): void {
    this.selectedSede = sede;

    // ✅ al entrar al paso 5, dejamos horarios listos según fecha seleccionada (si existe)
    this.horariosDisponibles = [];
    this.horariosError = '';
    this.step5Form.get('horaRevision')?.setValue('');
    this.step5Form.get('horaRevision')?.disable({ emitEvent: false });

    const fecha = this.step5Form.get('fechaRevision')?.value;
    if (fecha) {
      this.loadHorariosForDate(fecha).subscribe((h) => {
        this.horariosDisponibles = h;
        if (h.length) this.step5Form.get('horaRevision')?.enable({ emitEvent: false });
      });
    }

    this.currentStep = 5;
    this.step5SubStep = 1;
  }

  openGoogleMaps(sede: Sede): void {
    window.open(`https://www.google.com/maps/search/?api=1&query=${sede.lat},${sede.lng}`, '_blank');
  }

  updateSedesPaginadas(): void {
    const total = this.sedesRaw.length;
    const pages = Math.ceil(total / this.sedesPerPage) || 1;
    this.totalSedesPages = pages;

    const mapped = this.sedesRaw.map((s, i) => this.mapSedeFromApi(s, i));

    const start = (this.sedesCurrentPage - 1) * this.sedesPerPage;
    this.sedesPaginadas = mapped.slice(start, start + this.sedesPerPage);

    console.log('📄 [SEDES] Pagination:', {
      total,
      sedesPerPage: this.sedesPerPage,
      totalSedesPages: this.totalSedesPages,
      sedesCurrentPage: this.sedesCurrentPage,
      showing: this.sedesPaginadas.length,
    });
  }

  nextSedesPage(): void {
    if (this.sedesCurrentPage < this.totalSedesPages) {
      this.sedesCurrentPage++;
      this.updateSedesPaginadas();
    }
  }

  prevSedesPage(): void {
    if (this.sedesCurrentPage > 1) {
      this.sedesCurrentPage--;
      this.updateSedesPaginadas();
    }
  }

  // =============================
  // ✅ HORARIOS (API REAL)
  // =============================
  private loadHorariosForDate(fecha: string) {
    // solo si ya hay sede y servicio seleccionados
    if (!fecha) return of<string[]>([]);
    if (!this.selectedSede) return of<string[]>([]);
    if (!this.selectedServiceName) return of<string[]>([]);

    // fecha viene "YYYY-MM-DD" => backend espera {day, month, year}
    const [y, m, d] = String(fecha).split('-').map((n) => Number(n));
    if (!y || !m || !d) return of<string[]>([]);

    this.isLoadingHorarios = true;
    this.horariosError = '';

    // ✅ payload como Postman (sede y servicio por NOMBRE, fecha como objeto)
    const payload: any = {
      sede: this.selectedSede.rawNombre ?? this.selectedSede.nombre,
      servicio: this.selectedServiceName,
      fecha_agenda: { day: d, month: m, year: y },
      from_flow: 'peritaje',
    };

    console.log('🕒 [HORARIOS] payload:', payload);

    return this.peritajeApi.obtenerHorariosDisponibles(payload).pipe(
      map((res: any) => {
        const list = res?.data || res?.results || res?.horarios || res?.items || res || [];

        const arr = Array.isArray(list) ? list : [];

        // puede venir [{slots:[...]}, ...] o directamente ["08:00", ...]
        const dayObj = arr[0];

        const slotsRaw = dayObj?.slots ?? dayObj?.times ?? dayObj?.horas ?? dayObj ?? [];

        const slots = Array.isArray(slotsRaw) ? slotsRaw : [];

        const horas = slots
          .filter((s: any) => {
            if (typeof s === 'string') return true;
            return (s?.available ?? s?.disponible ?? true) === true;
          })
          .map((s: any) => (typeof s === 'string' ? s : String(s?.time ?? s?.hora ?? '')))
          .map((t: string) => t.trim())
          .filter(Boolean);

        return horas.map((h) => this.formatTimeIfNeeded(h));
      }),
      catchError((err) => {
        console.error('❌ [HORARIOS] Error:', err);
        this.horariosError = 'No fue posible cargar horarios. Intenta de nuevo.';
        return of<string[]>([]);
      }),
      finalize(() => {
        this.isLoadingHorarios = false;
      })
    );
  }

  private formatTimeIfNeeded(time: string): string {
    // Si ya trae AM/PM, no tocar
    if (/am|pm/i.test(time)) return time;

    // Si es HH:mm o HH:mm:ss, convertir a AM/PM
    const m = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!m) return time;

    let hh = Number(m[1]);
    const mm = m[2];
    const suffix = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    if (hh === 0) hh = 12;
    const hhStr = String(hh).padStart(2, '0');
    return `${hhStr}:${mm} ${suffix}`;
  }

  // =============================
  // ✅ STEP 5
  // =============================
  canAdvanceToStep5_2(): boolean {
    const fechaValid = this.step5Form.get('fechaRevision')?.valid || false;
    const horaValid = this.step5Form.get('horaRevision')?.valid || false;
    return fechaValid && horaValid;
  }

  advanceToStep5_2(): void {
    if (this.canAdvanceToStep5_2()) this.step5SubStep = 2;
  }

  advanceToStep5_3(): void {
    this.step5SubStep = 3;
  }

  advanceToStep5_4(): void {
    this.step5SubStep = 4;
  }

  goBackStep5(): void {
    if (this.step5SubStep > 1) this.step5SubStep--;
    else this.goBack();
  }

  continuarAlPago(): void {
    if (this.step5Form.invalid) {
      this.step5Form.markAllAsTouched();
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    // ✅ sin quitar tu flujo: solo pasamos a step 6
    this.currentStep = 6;
    this.step6SubStep = 1;
  }

  // =============================
  // ✅ STEP 6
  // =============================
  getFechaTransaccion(): string {
    const fecha = this.step5Form.get('fechaRevision')?.value || '';
    const hora = this.step5Form.get('horaRevision')?.value || '';
    if (!fecha || !hora) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year} - ${hora}`;
  }

  aplicarCodigo(): void {
    if (!this.codigoPromocional.trim()) {
      alert('Por favor ingresa un código promocional');
      return;
    }
    if (this.codigoPromocional.toUpperCase() === 'AUTOMAS10') alert('¡Código aplicado! 10% de descuento');
    else alert('Código no válido');
  }

  advanceToStep6_2(): void {
    this.step6SubStep = 2;
  }

  advanceToStep6_3(): void {
    this.step6SubStep = 3;
  }

  /**
   * ✅ Flujo final (igual que agendar-peritaje):
   * 1) Agenda el peritaje
   * 2) Genera link MercadoPago
   * 3) Redirige al link
   */
  confirmarPago(): void {
    if (!this.aceptaCondicionesPago) {
      alert('Debes aceptar las condiciones del servicio');
      return;
    }

    if (this.isLoading) return;

    this.isLoading = true;

    this.agendar$()
      .pipe(
        tap((agRes) => {
          this.agendamientoResponse = agRes;

          const invoiceId =
            Number(agRes?.invoice_id ?? agRes?.invoiceId ?? agRes?.data?.invoice_id ?? 0) || 0;

          const codeBooking = (
            agRes?.codeBooking ??
            agRes?.codigo_reserva ??
            agRes?.booking_code ??
            agRes?.data?.codeBooking ??
            ''
          ).toString();

          const reservaPeritaje = {
            tipo: 'peritaje',
            invoiceId,
            codeBooking,
            monto: Number(this.getPrecioActual() || 0),
            nombreServicio: this.getNombreServicioCompleto(),
            placa: (this.step5Form.value?.placa || '').toString(),
            sede: this.selectedSede?.nombre || '',
            fecha: this.getFechaTransaccion(),
          };

          console.log('💾 [PERITAJE] Guardando ultima_reserva (PERITAJE):', reservaPeritaje);
          localStorage.setItem('ultima_reserva', JSON.stringify(reservaPeritaje));
          localStorage.setItem('reserva_pago', JSON.stringify(reservaPeritaje));
        }),
        switchMap(() => this.generarLinkMercadoPago$()),
        tap((pagoRes) => {
          this.pagoId = pagoRes.pago_id || null;
          this.paymentPreferenceId = pagoRes.preference_id || null;
          this.paymentLink = pagoRes.payment_link || null;

          if (!this.paymentLink) {
            throw new Error('No se recibió el link de pago desde la API');
          }
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          window.location.href = this.paymentLink!;
        },
        error: (err) => {
          console.error('❌ Error confirmando pago:', err);
          alert(err?.message || 'Ocurrió un error al generar el pago. Por favor intenta nuevamente.');
        },
      });
  }

  private agendar$(): Observable<any> {
    const fecha = this.step5Form.get('fechaRevision')?.value || '';
    const franja = this.step5Form.get('horaRevision')?.value || '';

    if (!fecha || !franja) {
      return throwError(() => new Error('Faltan datos de fecha/franja.'));
    }
    if (!this.selectedSede) {
      return throwError(() => new Error('Falta sede seleccionada.'));
    }
    if (!this.selectedServiceName) {
      return throwError(() => new Error('Falta servicio seleccionado.'));
    }

    const [y, m, d] = String(fecha).split('-').map((n) => Number(n));
    if (!y || !m || !d) {
      return throwError(() => new Error('Fecha inválida.'));
    }

    const tipoDoc = (this.step5Form.value?.tipoDocumento || 'CC') as DocType;
    const tipoIdent = tipoDoc === 'CC' ? 'Cedula de Ciudadania' : tipoDoc;

    const payload: any = {
      cliente: 'pagina_web',
      placa: (this.step5Form.value?.placa || '').toString().toUpperCase(),
      fecha_agenda: { year: y, month: m, day: d },
      franja: franja,
      ciudad: this.selectedCiudad,
      sede: this.selectedSede.rawNombre ?? this.selectedSede.nombre,
      servicio: this.selectedServiceName,

      tipo_identificacion: tipoIdent,
      identificacion: (this.step5Form.value?.numeroDocumento || '').toString(),

      celular: (this.step5Form.value?.telefono || '').toString(),
      correo: (this.step5Form.value?.correo || '').toString(),
      nombres: (this.step5Form.value?.nombre || '').toString(),

      from_flow: 'peritaje',
      recibir_resultado: 'true',

      correo_resultado: (this.step5Form.value?.correoResultado || '').toString(),
      nombre_resultado: (this.step5Form.value?.nombreResultado || '').toString(),

      servicio_resumen: this.getNombreServicioCompleto(),
    };

    return this.peritajeApi.agendar(payload);
  }

  private generarLinkMercadoPago$(): Observable<GenerarLinkPagoResponse> {
    const urls = this.buildBackUrls();

    const req: GenerarLinkPagoRequest = {
      proyecto: 'pagina_web' as any,
      medio_pago: 'mercadopago',
      servicio_label: this.getNombreServicioCompleto(),
      valor: Number(this.getPrecioActual() || 0),
      placa_vehiculo: (this.step5Form.value?.placa || '').toString().toUpperCase(),
      sede: null,
      servicio_tipovehiculo: null,
      urls,
    };

    console.log('💳 [PERITAJE] Generando link de pago...');
    console.log('💳 [PERITAJE] Payload:', req);

    return this.pagosApi.generarLinkPago(req);
  }

  private buildBackUrls(): { success: string; failure: string; pending: string } {
    const origin = window.location.origin;
    return {
      success: `${origin}/pago-exitoso`,
      failure: `${origin}/pago-fallido`,
      pending: `${origin}/pago-pendiente`,
    };
  }

  // =============================
  // ✅ UTIL
  // =============================
  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  openConditions(): void {
    alert('Condiciones del servicio...');
  }
}