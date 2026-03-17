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
  OnInit,
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
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  throwError,
  Observable,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// ✅ pagos (igual que agendar-peritaje)
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

interface ComboAccordionItem {
  titulo: string;
  items: string[];
}

type ComboDetailItem = string | ComboAccordionItem;

interface ComboDescription {
  titulo: string;
  descripcion: string;
  items: ComboDetailItem[];
}

@Component({
  selector: 'app-sedes-tarifas-peritaje',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SanitizeUrlPipe],
  templateUrl: './sedes-tarifas-peritaje.html',
  styleUrl: './sedes-tarifas-peritaje.scss',
})
export class SedesTarifasPeritajeComponent implements OnInit {
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

  // ✅ para habilitar domicilio SOLO si el usuario aceptó ubicación
  locationDetected = false;

  // loaders separados
  isLoadingServicios = false;
  isLoadingSedes = false;

  // ✅ horarios dinámicos (API)
  isLoadingHorarios = false;
  horariosError = '';
  horariosDisponibles: string[] = [];

  // ✅ Mapa label->raw para enviar franja correcta al API
  private horarioRawByLabel = new Map<string, string>();

  // ✅ Acordeón combos
  comboAccordionOpenKeys = new Set<string>();

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

  // clave interna para imágenes/descripciones
  tipoVehiculoNombre = '';

  // combos dinámicos (tabs)
  combos: Array<{ id: ComboId; nombre: string }> = [];
  selectedCombo: ComboId = 'diamante';

  // ✅ precios reales por combo (desde API)
  private preciosByCombo: Partial<Record<ComboId, number>> = {};

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
  // ✅ DOMICILIO: proveedor fijo por ciudad (NO mostrar sedes)
  // =============================
  // Bogotá -> 47 | Cali -> 39
  private getDomicilioProveedorId(): number | null {
    const c = (this.selectedCiudad || '').trim().toLowerCase();
    if (c === 'bogotá' || c === 'bogota') return 47;
    if (c === 'cali') return 39;
    return null;
  }

  // =============================
  // ✅ PAGO / AGENDA
  // =============================
  agendamientoResponse: any = null;
  pagoId: string | null = null;
  paymentLink: string | null = null;
  paymentPreferenceId: string | null = null;
  codeBooking = '';

  // ✅ NUEVO: cache de cotización/RUNT para enriquecer label de Mercado Pago
  cotizacionResponse: any = null;
  runtDataCache: {
    modelo: string;
    tipoCombustible: string;
    claseVehiculo: string;
    tipoServicio: string;
    tipoVehiculo: string;
  } = {
    modelo: '',
    tipoCombustible: '',
    claseVehiculo: '',
    tipoServicio: '',
    tipoVehiculo: '',
  };

  // =============================
  // ✅ CIUDADES
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

  // ✅ AJUSTE: subtipo Eléctrico + renombrar Híbrido
  subtiposLivianos = [
    { id: 'particular', nombre: 'Particular' },
    { id: 'electrico', nombre: 'Eléctrico' },
    { id: 'hibrido', nombre: 'Híbrido' },
  ];

  // =============================
  // ✅ IMÁGENES (se mantienen)
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
      plata: 'assets/urbana-oro.png',
      domicilio: 'assets/domicilio.png',
    },
    'MOTOCICLETAS SUPERBIKE': {
      diamante: 'assets/moto-diamante.png',
      oro: 'assets/moto-oro.png',
      plata: 'assets/moto-oro.png',
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
  // ✅ DESCRIPCIONES
  // =============================
  descripcionesCombos: Record<string, Record<string, ComboDescription>> = {
    'VEHICULOS LIVIANOS': {
      diamante: {
        titulo: 'Combo Diamante',
        descripcion: 'El Combo Diamante para Vehículos Livianos a Gasolina incluye:',
        items: [
          {
            titulo: 'Estructura y Carrocería',
            items: [
              'Verificación de chasis',
              'Verificación de carrocería',
              'Verificación de accesorios de confort',
              'Partes bajas (frenos, dirección, transmisión, suspensión, escape)',
              'Fugas mecánicas',
              'Estado de tapicería',
              'Estimación de vida útil de las llantas',
            ],
          },
          {
            titulo: 'Prueba de Motor',
            items: [
              'Medición del desgaste en el motor',
              'Verificación de reparaciones',
              'Análisis de emisiones de humo',
              'Revisión de fluidos (aceite motor, refrigerante, hidráulico)',
              'Verificación de componentes externos del motor (correa de accesorios, depósitos, tapas, carcasas)',
              'Verificación visual del arnés eléctrico',
              'Verificación adaptaciones no originales (adaptación a gas, headders, turbo, filtro de alto flujo)',
              'Análisis de batería',
            ],
          },
          {
            titulo: 'Improntas y Antecedentes (LTA)',
            items: [
              'Toma improntas',
              'Originalidad de sistemas de identificación (N motor, N chasis, N serie)',
              'Antecedentes judiciales',
              'Reporte de siniestros',
            ],
          },
          {
            titulo: 'CertiMás Basic',
            items: [
              'Verificación de datos del vehículo (N chasis, N motor, N serie, color, cilindraje, Regrabación de Sistemas de identificación autorizadas)',
              'Limitaciones a la propiedad (reclamaciones. embargos, restricciones)',
              'Prendas (pignoraciones)',
              'Info SOAT',
              'Histórico de propietarios',
              'Info RTM',
              'Solicitudes organismo de tránsito (traspasos, cambios de color, traslado de cuenta, cambio de tipo de servicio, etc)',
            ],
          },
          {
            titulo: 'Diagnóstico Scanner',
            items: [
              'Verificación de códigos de fallas (averías presentes actualmente en el funcionamiento del vehículo)',
              'histórico de averías(averías anteriores en el funcionamiento del vehículo)',
            ],
          },
          {
            titulo: 'Prueba de Ruta',
            items: [
              'Verificación de funcionamiento de la caja de velocidades',
              'Verificación de funcionamiento de tracción 4×4 (si aplica)',
              'Verificación de funcionamiento sistema de dirección',
              'Verificación de funcionamiento motor',
              'Detección de ruidos anormales',
              'Detección de vibraciones anormales',
            ],
          },
        ],
      },
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El Combo Oro para Vehículos Livianos incluye:',
        items: [
          {
            titulo: 'Estructura y Carrocería',
            items: [
              'Verificación de chasis',
              'Verificación de carrocería',
              'Verificación de accesorios de confort',
              'Partes bajas (frenos, dirección, transmisión, suspensión, escape)',
              'Fugas mecánicas',
              'Estado de tapicería',
              'Estimación de vida útil de las llantas',
            ],
          },
          {
            titulo: 'Prueba de Motor',
            items: [
              'Medición del desgaste en el motor',
              'Verificación de reparaciones',
              'Análisis de emisiones de humo',
              'Revisión de fluidos (aceite motor, refrigerante, hidráulico)',
              'Verificación de componentes externos del motor (correa de accesorios, depósitos, tapas, carcasas)',
              'Verificación visual del arnés eléctrico',
              'Verificación adaptaciones no originales (adaptación a gas, headders, turbo, filtro de alto flujo)',
              'Análisis de batería',
            ],
          },
          {
            titulo: 'Improntas y Antecedentes',
            items: [
              'Toma improntas',
              'Originalidad de sistemas de identificación (N motor, N chasis, N serie)',
              'Antecedentes judiciales',
              'Reporte de siniestros',
            ],
          },
          {
            titulo: 'CertiMás Basic',
            items: [
              'Verificación de datos del vehículo (N chasis, N motor, N serie, color, cilindraje, Regrabación de Sistemas de identificación autorizadas)',
              'Limitaciones a la propiedad (reclamaciones. embargos, restricciones)',
              'Prendas (pignoraciones)',
              'Info SOAT',
              'Histórico de propietarios',
              'Info RTM',
              'Solicitudes organismo de tránsito (traspasos, cambios de color, traslado de cuenta, cambio de tipo de servicio, etc)',
            ],
          },
          {
            titulo: 'Diagnóstico escáner',
            items: [
              'Verificación de códigos de fallas (averías presentes actualmente en el funcionamiento del vehículo)',
              'histórico de averías(averías anteriores en el funcionamiento del vehículo)',
            ],
          },
        ],
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El Combo Plata para Vehículos Livianos incluye:',
        items: [
          {
            titulo: 'Estructura y Carrocería',
            items: [
              'Verificación de chasis',
              'Verificación de carrocería',
              'Verificación de accesorios de confort',
              'Partes bajas (frenos, dirección, transmisión, suspensión, escape)',
              'Fugas mecánicas',
              'Estado de tapicería',
              'Estimación de vida útil de las llantas',
            ],
          },
          {
            titulo: 'Improntas y Antecedentes (LTA)',
            items: [
              'Toma y validación de improntas',
              'Originalidad de sistemas de identificación (N motor, N chasis, N serie)',
              'Antecedentes judiciales',
              'Reporte de siniestros',
            ],
          },
          {
            titulo: 'CertiMás Basic',
            items: [
              'Verificación de datos del vehículo (N chasis, N motor, N serie, color, cilindraje, Regrabación de Sistemas de identificación autorizadas)',
              'Limitaciones a la propiedad (reclamaciones. embargos, restricciones)',
              'Prendas (pignoraciones)',
              'Info SOAT',
              'Histórico de propietarios',
              'Info RTM',
              'Solicitudes organismo de tránsito (traspasos, cambios de color, traslado de cuenta, cambio de tipo de servicio, etc)',
            ],
          },
        ],
      },
      domicilio: {
        titulo: 'Combo A Domicilio',
        descripcion:
          'El Peritaje a Domicilio para Vehículos Livianos (Gasolina y Diésel) incluye:',
        items: [
          {
            titulo: 'Estructura y Carrocería',
            items: [
              'Verificación de chasis',
              'Verificación de carrocería',
              'Verificación de accesorios de confort',
              'Partes bajas (frenos, dirección, transmisión, suspensión, escape)',
              'Fugas mecánicas',
              'Estado de tapicería',
              'Estimación de vida útil de las llantas',
            ],
          },
          {
            titulo: 'Prueba de Motor',
            items: [
              'Medición del desgaste en el motor',
              'Verificación de reparaciones',
              'Análisis de emisiones de humo',
              'Revisión de fluidos (aceite motor, refrigerante, hidráulico)',
              'Verificación de componentes externos del motor (correa de accesorios, depósitos, tapas, carcasas)',
              'Verificación visual del arnés eléctrico',
              'Verificación adaptaciones no originales (adaptación a gas, headders, turbo, filtro de alto flujo)',
              'Análisis de batería',
            ],
          },
          {
            titulo: 'Improntas y Antecedentes',
            items: [
              'Toma improntas',
              'Originalidad de sistemas de identificación (N motor, N chasis, N serie)',
              'Antecedentes judiciales',
              'Reporte de siniestros',
            ],
          },
          {
            titulo: 'CertiMás Basic',
            items: [
              'Verificación de datos del vehículo (N chasis, N motor, N serie, color, cilindraje, Regrabación de Sistemas de identificación autorizadas)',
              'Limitaciones a la propiedad (reclamaciones. embargos, restricciones)',
              'Prendas (pignoraciones)',
              'Info SOAT',
              'Histórico de propietarios',
              'Info RTM',
              'Solicitudes organismo de tránsito (traspasos, cambios de color, traslado de cuenta, cambio de tipo de servicio, etc)',
            ],
          },
          {
            titulo: 'Diagnóstico escáner',
            items: [
              'Verificación de códigos de fallas (averías presentes actualmente en el funcionamiento del vehículo)',
              'histórico de averías(averías anteriores en el funcionamiento del vehículo)',
            ],
          },
        ],
      },
    },

    'VEHICULOS PESADOS': {
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El Combo Oro para Vehículo Pesado incluye:',
        items: [
          'Estructura y Chasis Vehículo Pesado',
          'Improntas y Antecedentes (LTA)',
          'CertiMás Basic',
          'Valor Fasecolda',
          'Prueba Turbo',
          'Prueba de Batería',
          'Consulta de siniestros',
          'Valor Mercado',
          'Prueba de Gases',
          'Prueba de Motor',
          'Adaptaciones Chasis',
        ],
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El Combo Plata para Vehículos Pesados incluye:',
        items: ['Estructura y Chasis', 'Improntas y Antecedentes (LTA)', 'CertiMás Basic'],
      },
    },

    'MOTOCICLETAS URBANA': {
      oro: {
        titulo: 'Combo Oro',
        descripcion:
          'Combo Oro Motocicleta Urbana (Cilindraje inferior o igual a 229 C.C) incluye:',
        items: [
          'Estructura y Carrocería',
          'Prueba de Motor',
          'Improntas y Antecedentes (LTA)',
          'CertiMás Basic',
          'Histórico de propietarios',
          'Comparendos e Impuestos',
          'Análisis de gases',
          'Prueba de luces',
          'Prueba de frenos',
        ],
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion:
          'Combo Plata Motocicleta Urbana (Cilindraje inferior o igual a 229 C.C) incluye:',
        items: [
          'Estructura y Carrocería',
          'Improntas y Antecedentes (LTA)',
          'CertiMás Basic',
          'Histórico de Propietarios',
          'Análisis Trámites',
          'Histórico de Comparendos e impuestos',
        ],
      },
    },

    'MOTOCICLETAS SUPERBIKE': {
      oro: {
        titulo: 'Combo Oro',
        descripcion:
          'Combo Oro Motocicleta Superbike (Cilindraje mayor o igual a 230 C.C) incluye:',
        items: [
          'Estructura y Carrocería',
          'Prueba de Motor',
          'Improntas y Antecedentes (LTA)',
          'CertiMás Basic',
          'Histórico de propietarios',
          'Comparendos e Impuestos',
          'Análisis de gases',
          'Prueba de luces',
          'Prueba de frenos',
        ],
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion:
          'Combo Plata Motocicleta Superbike (Cilindraje mayor o igual a 230 C.C) incluye:',
        items: [
          'Estructura y Carrocería',
          'Improntas y Antecedentes (LTA)',
          'CertiMás Basic',
          'Histórico de Propietarios',
          'Análisis Trámites',
          'Histórico de Comparendos e impuestos',
        ],
      },
    },

    'ELECTRICOS O HIBRIDOS': {
      diamante: {
        titulo: 'Combo Diamante',
        descripcion: 'El Combo Diamante para Vehículos ELECTRICOS O HIBRIDOS incluye:',
        items: [
          {
            titulo: 'Estructura y Carrocería',
            items: [
              'Verificación de chasis',
              'Verificación de carrocería',
              'Verificación de accesorios de confort',
              'Partes bajas (frenos, dirección, transmisión, suspensión, escape)',
              'Fugas mecánicas',
              'Estado de tapicería',
              'Estimación de vida útil de las llantas',
            ],
          },
          {
            titulo: 'Prueba de Motor',
            items: [
              'Medición del desgaste en el motor',
              'Verificación de reparaciones',
              'Análisis de emisiones de humo',
              'Revisión de fluidos (aceite motor, refrigerante, hidráulico)',
              'Verificación de componentes externos del motor (correa de accesorios, depósitos, tapas, carcasas)',
              'Verificación visual del arnés eléctrico',
              'Verificación adaptaciones no originales (adaptación a gas, headders, turbo, filtro de alto flujo)',
              'Análisis de batería',
            ],
          },
          {
            titulo: 'Improntas y Antecedentes (LTA)',
            items: [
              'Toma improntas',
              'Originalidad de sistemas de identificación (N motor, N chasis, N serie)',
              'Antecedentes judiciales',
              'Reporte de siniestros',
            ],
          },
          {
            titulo: 'CertiMás Basic',
            items: [
              'Verificación de datos del vehículo (N chasis, N motor, N serie, color, cilindraje, Regrabación de Sistemas de identificación autorizadas)',
              'Limitaciones a la propiedad (reclamaciones. embargos, restricciones)',
              'Prendas (pignoraciones)',
              'Info SOAT',
              'Histórico de propietarios',
              'Info RTM',
              'Solicitudes organismo de tránsito (traspasos, cambios de color, traslado de cuenta, cambio de tipo de servicio, etc)',
            ],
          },
          {
            titulo: 'Diagnóstico Scanner',
            items: [
              'Verificación de códigos de fallas (averías presentes actualmente en el funcionamiento del vehículo)',
              'histórico de averías(averías anteriores en el funcionamiento del vehículo)',
            ],
          },
          {
            titulo: 'Prueba de Ruta',
            items: [
              'Verificación de funcionamiento de la caja de velocidades',
              'Verificación de funcionamiento de tracción 4×4 (si aplica)',
              'Verificación de funcionamiento sistema de dirección',
              'Verificación de funcionamiento motor',
              'Detección de ruidos anormales',
              'Detección de vibraciones anormales',
            ],
          },
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

  step5Form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private peritajeApi: PeritajeApiService,
    private pagosApi: PagosApiService
  ) {}

  ngOnInit(): void {
    this.initStep5Form();
  }

  private initStep5Form(): void {
    this.step5Form = this.fb.group({
      fechaRevision: ['', Validators.required],
      horaRevision: [{ value: '', disabled: true }, Validators.required],

      placa: ['', [Validators.required, Validators.minLength(6)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      tipoDocumento: ['CC'],
      numeroDocumento: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      correoResultado: ['', [Validators.required, Validators.email]],
      nombreResultado: ['', Validators.required],

      direccion: [''],
      direccionDomicilio: [''],

      aceptaTerminos: [false, Validators.requiredTrue],
    });

    this.updateDomicilioValidators();

    this.step5Form
      .get('direccion')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: string) => {
        const val = (v || '').toString();
        if (this.step5Form.get('direccionDomicilio')?.value !== val) {
          this.step5Form.get('direccionDomicilio')?.setValue(val, { emitEvent: false });
        }
      });

    this.step5Form
      .get('telefono')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: string) => {
        const cleaned = (v || '').replace(/[^\d]/g, '').slice(0, 10);
        if (cleaned !== v) {
          this.step5Form.get('telefono')?.setValue(cleaned, { emitEvent: false });
        }
      });

    this.step5Form
      .get('placa')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: string) => {
        const cleaned = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (cleaned !== v) {
          this.step5Form.get('placa')?.setValue(cleaned, { emitEvent: false });
        }
      });

    this.step5Form
      .get('numeroDocumento')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: string) => {
        const tipo = this.step5Form.get('tipoDocumento')?.value as DocType;
        let cleaned = v || '';
        cleaned =
          tipo === 'PAS'
            ? cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '')
            : cleaned.replace(/[^\d]/g, '');
        cleaned = cleaned.slice(0, this.getDocMaxLen(tipo));

        if (cleaned !== v) {
          this.step5Form.get('numeroDocumento')?.setValue(cleaned, { emitEvent: false });
        }
      });

    this.step5Form
      .get('tipoDocumento')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.step5Form.get('numeroDocumento')?.setValue('');
      });

    this.step5Form
      .get('fechaRevision')
      ?.valueChanges.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => {
          this.horariosError = '';
          this.horariosDisponibles = [];
          this.horarioRawByLabel.clear();
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
  // ✅ FALLBACK PRECIOS ELÉCTRICO / HÍBRIDO
  // =============================
  private getFallbackPrecioByCombo(comboId: ComboId): number {
    if (comboId !== 'diamante') return 0;
    if (this.selectedTipoVehiculo !== 'livianos') return 0;

    if (this.selectedSubtipo === 'hibrido') return 490000;
    if (this.selectedSubtipo === 'electrico') return 441000;

    return 0;
  }

  // ✅ NUEVO: fallback de nombre real de servicio para habilitar horarios/agendamiento
  private getFallbackServiceNameByCombo(comboId: ComboId): string {
    if (comboId !== 'diamante') return '';
    if (this.selectedTipoVehiculo !== 'livianos') return '';

    if (this.selectedSubtipo === 'hibrido') return 'Combo Diamante Para Vehículo Híbrido Liviano';
    if (this.selectedSubtipo === 'electrico') return 'Combo Diamante Para Vehículo Eléctrico Liviano';

    return '';
  }

  // =============================
  // ✅ ACORDEÓN
  // =============================
  isAccordionItem(item: ComboDetailItem): item is ComboAccordionItem {
    return typeof item !== 'string' && !!item?.titulo && Array.isArray(item?.items);
  }

  getComboItemTrackKey(item: ComboDetailItem, index: number): string {
    if (this.isAccordionItem(item)) return `${this.selectedCombo}-acc-${item.titulo}-${index}`;
    return `${this.selectedCombo}-txt-${item}-${index}`;
  }

  toggleComboAccordion(item: ComboDetailItem, index: number): void {
    if (!this.isAccordionItem(item)) return;

    const key = this.getComboItemTrackKey(item, index);
    if (this.comboAccordionOpenKeys.has(key)) {
      this.comboAccordionOpenKeys.delete(key);
    } else {
      this.comboAccordionOpenKeys.add(key);
    }
  }

  isComboAccordionOpen(item: ComboDetailItem, index: number): boolean {
    if (!this.isAccordionItem(item)) return false;
    return this.comboAccordionOpenKeys.has(this.getComboItemTrackKey(item, index));
  }

  private resetAccordionForCurrentCombo(): void {
    this.comboAccordionOpenKeys.clear();
  }

  // =============================
  // ✅ DOMICILIO: VALIDADORES + LECTURA DE DIRECCIÓN
  // =============================
  private updateDomicilioValidators(): void {
    const c1 = this.step5Form?.get('direccion');
    const c2 = this.step5Form?.get('direccionDomicilio');

    if (!c1 && !c2) return;

    if (this.selectedCombo === 'domicilio') {
      const v = [Validators.required, Validators.minLength(5)];
      c1?.setValidators(v);
      c2?.clearValidators();
    } else {
      c1?.clearValidators();
      c2?.clearValidators();
      c1?.setValue('', { emitEvent: false });
      c2?.setValue('', { emitEvent: false });
    }

    c1?.updateValueAndValidity({ emitEvent: false });
    c2?.updateValueAndValidity({ emitEvent: false });
  }

  private getDireccionDomicilioValue(): string {
    const v1 = (this.step5Form.value?.direccion || '').toString().trim();
    if (v1) return v1;
    return (this.step5Form.value?.direccionDomicilio || '').toString().trim();
  }

  private isDomicilioAllowed(): boolean {
    return (
      this.locationDetected === true &&
      this.selectedTipoVehiculo === 'livianos' &&
      this.selectedSubtipo === 'particular' &&
      (this.selectedCiudad === 'Bogotá' || this.selectedCiudad === 'Cali')
    );
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
    this.horarioRawByLabel.clear();

    this.comboAccordionOpenKeys.clear();

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

    this.preciosByCombo = {};
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

    this.agendamientoResponse = null;
    this.pagoId = null;
    this.paymentLink = null;
    this.paymentPreferenceId = null;
    this.codeBooking = '';

    this.cotizacionResponse = null;
    this.runtDataCache = {
      modelo: '',
      tipoCombustible: '',
      claseVehiculo: '',
      tipoServicio: '',
      tipoVehiculo: '',
    };

    this.locationDetected = false;

    this.step5Form.reset({ tipoDocumento: 'CC', aceptaTerminos: false });
    this.step5Form.get('horaRevision')?.disable({ emitEvent: false });

    this.step5Form.get('direccion')?.setValue('', { emitEvent: false });
    this.step5Form.get('direccionDomicilio')?.setValue('', { emitEvent: false });
    this.step5Form.get('direccion')?.clearValidators();
    this.step5Form.get('direccionDomicilio')?.clearValidators();
    this.step5Form.get('direccion')?.updateValueAndValidity({ emitEvent: false });
    this.step5Form.get('direccionDomicilio')?.updateValueAndValidity({ emitEvent: false });

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
      this.locationDetected = true;
      this.currentStep = 4;
      this.step4SubStep = 1;

      this.rebuildCombosBySelection();
    }, 800);
  }

  selectManually(): void {
    this.locationDetected = false;
    this.currentStep = 4;
    this.step4SubStep = 1;

    this.rebuildCombosBySelection();
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
      else if (this.selectedSubtipo === 'hibrido') this.tipoVehiculoNombre = 'ELECTRICOS O HIBRIDOS';
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
  // ✅ ARMAR TABS + CONSULTAR SERVICIOS
  // =============================
  private rebuildCombosBySelection(): void {
    const tipoKey = this.tipoVehiculoNombre;
    if (!tipoKey) {
      this.combos = [];
      this.selectedCombo = 'diamante';
      this.preciosByCombo = {};
      this.serviceIdByCombo = {};
      this.serviceNameByCombo = {};
      this.selectedServiceId = null;
      this.selectedServiceName = null;
      this.comboAccordionOpenKeys.clear();
      this.updateDomicilioValidators();
      return;
    }

    const order: ComboId[] = ['diamante', 'oro', 'plata', 'domicilio'];

    const isElecOrHybrid =
      this.selectedTipoVehiculo === 'livianos' &&
      (this.selectedSubtipo === 'electrico' || this.selectedSubtipo === 'hibrido');

    const combosDisponibles = order.filter((id) => {
      if (isElecOrHybrid) return id === 'diamante';

      if (this.selectedTipoVehiculo === 'livianos' && this.selectedSubtipo === 'particular') {
        if (id === 'domicilio') return this.isDomicilioAllowed();
        return id === 'diamante' || id === 'oro' || id === 'plata';
      }

      if (this.selectedTipoVehiculo === 'pesados') return id === 'oro' || id === 'plata';
      if (this.selectedTipoVehiculo === 'moto-urbana') return id === 'oro' || id === 'plata';
      if (this.selectedTipoVehiculo === 'moto-superbike') return id === 'oro' || id === 'plata';

      return id === 'diamante' || id === 'oro' || id === 'plata';
    });

    this.combos = combosDisponibles.map((id) => ({
      id,
      nombre: id === 'domicilio' ? 'A Domicilio' : id.charAt(0).toUpperCase() + id.slice(1),
    }));

    if (!combosDisponibles.includes(this.selectedCombo)) {
      this.selectedCombo = combosDisponibles[0] || 'diamante';
    }

    this.resetAccordionForCurrentCombo();
    this.updateDomicilioValidators();
    this.fetchServiciosByFixedIds();
  }

  // =============================
  // ✅ IDS FIJOS
  // =============================
  private getFixedServiceIdsForSelection(): Partial<Record<ComboId, number>> {
    if (this.selectedTipoVehiculo === 'livianos' && this.selectedSubtipo === 'particular') {
      const base: Partial<Record<ComboId, number>> = { diamante: 3, oro: 9, plata: 11 };
      if (this.isDomicilioAllowed()) {
        base.domicilio = this.selectedCiudad === 'Bogotá' ? 90 : 91;
      }
      return base;
    }

    if (this.selectedTipoVehiculo === 'livianos' && this.selectedSubtipo === 'electrico') return { diamante: 7 };
    if (this.selectedTipoVehiculo === 'livianos' && this.selectedSubtipo === 'hibrido') return { diamante: 8 };

    if (this.selectedTipoVehiculo === 'pesados') return { oro: 16, plata: 17 };
    if (this.selectedTipoVehiculo === 'moto-urbana') return { oro: 14, plata: 13 };
    if (this.selectedTipoVehiculo === 'moto-superbike') return { oro: 12, plata: 15 };

    return {};
  }

  // =============================
  // ✅ PARAMS BASE
  // =============================
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
      grupo_servicio: 'Peritaje presencial',
      servicios_por_placa: false,
      placa: 'AAA000',
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

  private pickServiceName(item: any): string {
    return String(item?.name ?? item?.nombre ?? item?.title ?? item?.service_name ?? '').trim();
  }

  private pickServicePrice(item: any): number {
    const raw =
      item?.price ??
      item?.precio ??
      item?.valor ??
      item?.amount ??
      item?.total ??
      item?.value ??
      item?.tarifa ??
      0;

    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  private getAnyId(item: any): string {
    return String(
      item?.id ??
        item?.service_id ??
        item?.serviceId ??
        item?.servicio_id ??
        item?.id_servicio ??
        item?.pk ??
        item?.uuid ??
        ''
    ).trim();
  }

  private resolveServicioFromResponse(
    res: any,
    requestedId: number
  ): { foundId: string | null; price: number; name: string } {
    const requestedIdStr = String(requestedId).trim();

    const arr = this.extractArray(res);
    let item: any = null;

    if (Array.isArray(arr) && arr.length) {
      item = arr.find((x: any) => this.getAnyId(x) === requestedIdStr) ?? null;

      // ✅ si no matchea id exacto pero vino un único item, úsalo
      if (!item && arr.length === 1) {
        item = arr[0];
      }
    }

    if (!item && res && typeof res === 'object') {
      const rootId = this.getAnyId(res);
      if (rootId === requestedIdStr) item = res;

      // ✅ si el root tiene nombre válido, úsalo aunque no matchee id
      if (!item && this.pickServiceName(res)) {
        item = res;
      }
    }

    if (!item) return { foundId: null, price: 0, name: '' };

    const foundId = this.getAnyId(item) || null;
    const name = this.pickServiceName(item);
    const price = this.pickServicePrice(item);

    return { foundId, price, name };
  }

  private fetchServicioByIdWithFallback$(
    requestedId: number,
    comboId: ComboId
  ): Observable<{
    comboId: ComboId;
    requestedId: number;
    foundId: string | null;
    price: number;
    name: string;
  }> {
    const baseParams = this.getServiciosParamsBase();
    const grupoServicio = comboId === 'domicilio' ? 'Peritaje a domicilio' : 'Peritaje presencial';

    const paramsNormal: any = {
      ...baseParams,
      grupo_servicio: grupoServicio,
      id: requestedId,
      service_id: requestedId,
      servicio_id: requestedId,
      id_servicio: requestedId,
    };

    const paramsFallback: any = {
      cliente: 'pagina_web',
      placa: 'AAA000',
      servicios_por_placa: false,
      grupo_servicio: grupoServicio,
      id: requestedId,
      service_id: requestedId,
      servicio_id: requestedId,
      id_servicio: requestedId,
    };

    return this.peritajeApi.obtenerServicios(paramsNormal).pipe(
      map((res: any) => {
        const r = this.resolveServicioFromResponse(res, requestedId);

        console.log('🔎 [PERITAJE] servicio', {
          comboId,
          requestedId,
          foundId: r.foundId,
          price: r.price,
          name: r.name,
          attempt: 'normal',
        });

        if (!r.foundId && !r.name) throw new Error('NOT_FOUND_NORMAL');

        return { comboId, requestedId, foundId: r.foundId, price: r.price, name: r.name };
      }),
      catchError(() => {
        return this.peritajeApi.obtenerServicios(paramsFallback).pipe(
          map((res2: any) => {
            const r2 = this.resolveServicioFromResponse(res2, requestedId);

            console.log('🔎 [PERITAJE] servicio', {
              comboId,
              requestedId,
              foundId: r2.foundId,
              price: r2.price,
              name: r2.name,
              attempt: 'fallback',
            });

            if (!r2.foundId && !r2.name) {
              return { comboId, requestedId, foundId: null, price: 0, name: '' };
            }

            return { comboId, requestedId, foundId: r2.foundId, price: r2.price, name: r2.name };
          }),
          catchError((err2) => {
            console.error(`❌ [PERITAJE] Error obtener_servicios (id=${requestedId})`, err2);
            return of({ comboId, requestedId, foundId: null, price: 0, name: '' });
          })
        );
      })
    );
  }

  private fetchServiciosByFixedIds(): void {
    const fixed = this.getFixedServiceIdsForSelection();
    const comboIds = Object.keys(fixed) as ComboId[];

    this.preciosByCombo = {};
    this.serviceIdByCombo = {};
    this.serviceNameByCombo = {};
    this.selectedServiceId = null;
    this.selectedServiceName = null;

    if (!comboIds.length) {
      this.updateDomicilioValidators();
      return;
    }

    this.isLoadingServicios = true;

    const calls = comboIds.map((comboId) => {
      const id = fixed[comboId]!;
      this.serviceIdByCombo[comboId] = String(id);
      return this.fetchServicioByIdWithFallback$(id, comboId);
    });

    forkJoin(calls)
      .pipe(finalize(() => (this.isLoadingServicios = false)))
      .subscribe({
        next: (results) => {
          const precios: Partial<Record<ComboId, number>> = {};
          const names: Partial<Record<ComboId, string>> = {};

          for (const r of results) {
            let precioFinal = r.price || 0;
            let nombreFinal = (r.name || '').trim();

            // ✅ FALLBACK SOLO PARA ELÉCTRICO / HÍBRIDO
            if (!precioFinal || precioFinal <= 0) {
              const fallbackPrecio = this.getFallbackPrecioByCombo(r.comboId);
              if (fallbackPrecio > 0) {
                precioFinal = fallbackPrecio;
                console.warn('⚠️ [PERITAJE] Aplicando fallback de precio:', {
                  comboId: r.comboId,
                  requestedId: r.requestedId,
                  subtipo: this.selectedSubtipo,
                  fallbackPrecio,
                });
              }
            }

            // ✅ si no vino nombre real, pero aplica fallback eléctrico/híbrido,
            // dejamos nombre fallback para que horarios y agendamiento funcionen
            if (!nombreFinal) {
              const fallbackName = this.getFallbackServiceNameByCombo(r.comboId);
              if (fallbackName) {
                nombreFinal = fallbackName;
                console.warn('⚠️ [PERITAJE] Aplicando fallback de nombre:', {
                  comboId: r.comboId,
                  requestedId: r.requestedId,
                  subtipo: this.selectedSubtipo,
                  fallbackName,
                });
              }
            }

            if (precioFinal > 0) {
              precios[r.comboId] = precioFinal;
            }

            if (nombreFinal) {
              names[r.comboId] = nombreFinal;
            }
          }

          this.preciosByCombo = precios;
          this.serviceNameByCombo = names;

          this.selectedServiceId = this.serviceIdByCombo[this.selectedCombo] || null;
          this.selectedServiceName = this.serviceNameByCombo[this.selectedCombo] || null;

          this.updateDomicilioValidators();

          if (this.step4SubStep === 3) {
            if (this.selectedCombo === 'domicilio') this.autoSelectDomicilioSede();
            else this.fetchSedesFromApi();
          }

          if (this.currentStep === 5) {
            this.horariosDisponibles = [];
            this.horariosError = '';
            this.horarioRawByLabel.clear();
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
          console.error('❌ [PERITAJE] Error consolidando servicios:', err);
          this.preciosByCombo = {};
          this.serviceNameByCombo = {};
          this.updateDomicilioValidators();
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

    this.selectedServiceId = this.serviceIdByCombo[this.selectedCombo] || null;
    this.selectedServiceName = this.serviceNameByCombo[this.selectedCombo] || null;

    this.resetAccordionForCurrentCombo();
    this.updateDomicilioValidators();

    if (this.step4SubStep === 3) {
      this.sedesCurrentPage = 1;
      if (this.selectedCombo === 'domicilio') this.autoSelectDomicilioSede();
      else this.fetchSedesFromApi();
    }
  }

  getPrecioActual(): number {
    return this.preciosByCombo[this.selectedCombo] || 0;
  }

  getImagenActual(): string {
    const imagenesPorTipo = this.imagenesCombos[this.tipoVehiculoNombre] || {};
    return imagenesPorTipo[this.selectedCombo] || 'assets/peritaje.png';
  }

  getComboDescription(): ComboDescription {
    const desc = this.descripcionesCombos[this.tipoVehiculoNombre] || {};
    return (
      desc[this.selectedCombo] || {
        titulo: '',
        descripcion: '',
        items: [],
      }
    );
  }

  getComboNombre(): string {
    const combo = this.combos.find((c) => c.id === this.selectedCombo);
    return combo?.nombre || '';
  }

  // =============================
  // ✅ NOMBRE COMPLETO SERVICIO (API) PARA STEP 6
  // =============================
  getNombreServicioCompleto(): string {
    const apiName = (this.selectedServiceName || '').trim();
    if (apiName) return apiName;
    return `Peritaje ${this.getComboNombre()}`.trim();
  }

  // =============================
  // ✅ NUEVO: HELPERS RUNT / COTIZACIÓN
  // =============================
  private mapTipoDocumentoToApi(tipo: DocType): string {
    const mapDoc: Record<DocType, string> = {
      CC: 'Cedula de Ciudadania',
      CE: 'Cedula de Extranjeria',
      NIT: 'NIT',
      PAS: 'Pasaporte',
    };
    return mapDoc[tipo] || 'Cedula de Ciudadania';
  }

  private getFallbackModeloBySelection(): string {
    if (this.selectedTipoVehiculo === 'livianos' && this.selectedSubtipo === 'hibrido') return 'Híbrido';
    if (this.selectedTipoVehiculo === 'livianos' && this.selectedSubtipo === 'electrico') return 'Eléctrico';
    return '';
  }

  private getFallbackTipoCombustibleBySelection(): string {
    if (this.selectedTipoVehiculo === 'livianos' && this.selectedSubtipo === 'hibrido') return 'HIBRIDO';
    if (this.selectedTipoVehiculo === 'livianos' && this.selectedSubtipo === 'electrico') return 'ELECTRICO';
    if (this.selectedTipoVehiculo === 'pesados') return 'DIESEL';
    return 'GASOLINA';
  }

  private getFallbackClaseVehiculoBySelection(): string {
    if (this.selectedTipoVehiculo === 'pesados') return 'CAMION';
    if (this.selectedTipoVehiculo === 'moto-urbana' || this.selectedTipoVehiculo === 'moto-superbike') {
      return 'MOTO';
    }
    return 'VEHICULO';
  }

  private getFallbackTipoServicioBySelection(): string {
    return 'Particular';
  }

  private getFallbackTipoVehiculoBySelection(): string {
    if (this.selectedTipoVehiculo === 'livianos') {
      if (this.selectedSubtipo === 'electrico') return 'Liviano Eléctrico';
      if (this.selectedSubtipo === 'hibrido') return 'Liviano Híbrido';
      return 'Liviano Particular';
    }
    if (this.selectedTipoVehiculo === 'pesados') return 'Pesado';
    if (this.selectedTipoVehiculo === 'moto-urbana') return 'Motocicleta Urbana';
    if (this.selectedTipoVehiculo === 'moto-superbike') return 'Motocicleta Superbike';
    return this.tipoVehiculoNombre || '';
  }

  private extractStringFromPaths(obj: any, paths: string[][]): string {
    for (const path of paths) {
      let current = obj;
      let found = true;

      for (const key of path) {
        if (current && current[key] !== undefined && current[key] !== null) {
          current = current[key];
        } else {
          found = false;
          break;
        }
      }

      if (found) {
        const value = String(current).trim();
        if (value) return value;
      }
    }
    return '';
  }

  private cacheRuntDataFromResponse(resp: any): void {
    if (!resp || typeof resp !== 'object') return;

    const modelo =
      this.extractStringFromPaths(resp, [
        ['modelo'],
        ['model'],
        ['anio_modelo'],
        ['año_modelo'],
        ['year_model'],
        ['data', 'modelo'],
        ['data', 'model'],
        ['data', 'anio_modelo'],
        ['vehicle', 'model'],
        ['vehicle', 'year'],
        ['runt', 'modelo'],
        ['runt', 'anio_modelo'],
      ]) || this.runtDataCache.modelo;

    const tipoCombustible =
      this.extractStringFromPaths(resp, [
        ['tipo_combustible'],
        ['combustible'],
        ['fuel_type'],
        ['data', 'tipo_combustible'],
        ['data', 'combustible'],
        ['vehicle', 'fuel_type'],
        ['runt', 'tipo_combustible'],
      ]) || this.runtDataCache.tipoCombustible;

    const claseVehiculo =
      this.extractStringFromPaths(resp, [
        ['clase_vehiculo'],
        ['clase'],
        ['vehicle_class'],
        ['data', 'clase_vehiculo'],
        ['vehicle', 'class'],
        ['runt', 'clase_vehiculo'],
      ]) || this.runtDataCache.claseVehiculo;

    const tipoServicio =
      this.extractStringFromPaths(resp, [
        ['tipo_servicio'],
        ['service_type'],
        ['data', 'tipo_servicio'],
        ['runt', 'tipo_servicio'],
      ]) || this.runtDataCache.tipoServicio;

    const tipoVehiculo =
      this.extractStringFromPaths(resp, [
        ['tipo_vehiculo'],
        ['vehicle_type'],
        ['data', 'tipo_vehiculo'],
        ['runt', 'tipo_vehiculo'],
      ]) || this.runtDataCache.tipoVehiculo;

    this.runtDataCache = {
      modelo: modelo || this.getFallbackModeloBySelection(),
      tipoCombustible: tipoCombustible || this.getFallbackTipoCombustibleBySelection(),
      claseVehiculo: claseVehiculo || this.getFallbackClaseVehiculoBySelection(),
      tipoServicio: tipoServicio || this.getFallbackTipoServicioBySelection(),
      tipoVehiculo: tipoVehiculo || this.getFallbackTipoVehiculoBySelection(),
    };

    console.log('✅ [PERITAJE] Cache RUNT/cotización actualizada:', this.runtDataCache);
  }

  private consultarYCotizarAntesDePago$(): Observable<any> {
    const fecha = this.step5Form.get('fechaRevision')?.value || '';
    const franjaLabel = this.step5Form.get('horaRevision')?.value || '';
    const franjaRaw = this.horarioRawByLabel.get(franjaLabel) || franjaLabel;

    if (!fecha || !franjaRaw) return throwError(() => new Error('Faltan datos de fecha/franja.'));
    if (!this.selectedSede) return throwError(() => new Error('Falta sede seleccionada.'));
    if (!this.selectedServiceName) return throwError(() => new Error('Falta servicio seleccionado.'));

    const [y, m, d] = String(fecha).split('-').map((n) => Number(n));
    if (!y || !m || !d) return throwError(() => new Error('Fecha inválida.'));

    const tipoDoc = (this.step5Form.value?.tipoDocumento || 'CC') as DocType;
    const tipoIdentificacion = this.mapTipoDocumentoToApi(tipoDoc);

    const payload: any = {
      cliente: 'pagina_web',
      placa: (this.step5Form.value?.placa || '').toString().toUpperCase(),
      fecha_agenda: { year: y, month: m, day: d },
      franja: franjaRaw,
      ciudad: this.selectedCiudad,
      sede: this.selectedSede.rawNombre ?? this.selectedSede.nombre,
      servicio: this.selectedServiceName,
      tipo_identificacion: tipoIdentificacion,
      identificacion: (this.step5Form.value?.numeroDocumento || '').toString(),
      celular: (this.step5Form.value?.telefono || '').toString(),
      correo: (this.step5Form.value?.correo || '').toString(),
      nombres: (this.step5Form.value?.nombre || '').toString(),
      from_flow: 'peritaje',
      recibir_resultado: 'true',
      correo_resultado: (this.step5Form.value?.correoResultado || '').toString(),
      nombre_resultado: (this.step5Form.value?.nombreResultado || '').toString(),
    };

    if (this.selectedCombo === 'domicilio') {
      const dir = this.getDireccionDomicilioValue();
      if (!dir) return throwError(() => new Error('Falta la dirección para el servicio a domicilio.'));
      payload.direccion_servicio = dir;
    }

    console.log('🔎 [PERITAJE] Cotizando antes de pago para consultar RUNT...', payload);

    return this.peritajeApi.cotizar(payload).pipe(
      tap((res) => {
        this.cotizacionResponse = res;
        this.cacheRuntDataFromResponse(res);
      })
    );
  }

  private getServicioLabelData(): any {
    const formData = this.step5Form.value;

    return {
      ...(this.cotizacionResponse || {}),
      ...(this.agendamientoResponse || {}),
      placa: (formData.placa || '').toString().toUpperCase().trim(),
      sede: (this.selectedSede?.nombre || '').toString().trim(),
      servicio: this.getNombreServicioCompleto(),
      fecha: this.getFechaTransaccion(),
      direccion: this.selectedCombo === 'domicilio' ? this.getDireccionDomicilioValue() : '',
      ciudad: this.selectedCiudad,
      combo: this.getComboNombre(),
      tipoVehiculo: (
        this.agendamientoResponse?.tipo_vehiculo ||
        this.cotizacionResponse?.tipo_vehiculo ||
        this.runtDataCache.tipoVehiculo ||
        this.tipoVehiculoNombre
      )
        .toString()
        .trim(),
      tipoCombustible: (
        this.agendamientoResponse?.tipo_combustible ||
        this.cotizacionResponse?.tipo_combustible ||
        this.runtDataCache.tipoCombustible
      )
        .toString()
        .trim(),
      claseVehiculo: (
        this.agendamientoResponse?.clase_vehiculo ||
        this.cotizacionResponse?.clase_vehiculo ||
        this.runtDataCache.claseVehiculo
      )
        .toString()
        .trim(),
      tipoServicio: (
        this.agendamientoResponse?.tipo_servicio ||
        this.cotizacionResponse?.tipo_servicio ||
        this.runtDataCache.tipoServicio
      )
        .toString()
        .trim(),
      modelo: (
        this.agendamientoResponse?.modelo ||
        this.cotizacionResponse?.modelo ||
        this.runtDataCache.modelo
      )
        .toString()
        .trim(),
      codeBooking: (
        this.codeBooking ||
        this.agendamientoResponse?.codeBooking ||
        this.agendamientoResponse?.codigo_reserva ||
        this.agendamientoResponse?.booking_code ||
        this.agendamientoResponse?.data?.codeBooking ||
        ''
      )
        .toString()
        .trim(),
    };
  }

  private construirServicioLabel(data: any): string {
    const servicio = (data?.servicio || this.getNombreServicioCompleto() || '').toString().trim();
    const sede = (data?.sede || '').toString().trim();
    const placa = (data?.placa || '').toString().trim();
    const direccion = (data?.direccion || '').toString().trim();
    const ciudad = (data?.ciudad || this.selectedCiudad || '').toString().trim();
    const codeBooking = (data?.codeBooking || this.codeBooking || '').toString().trim();

    const tipoVehiculo = (data?.tipoVehiculo || '').toString().trim();
    const tipoServicio = (data?.tipoServicio || '').toString().trim();
    const tipoCombustible = (data?.tipoCombustible || '').toString().trim();
    const modelo = (data?.modelo || '').toString().trim();

    const partes: string[] = [servicio];

    if (tipoVehiculo) partes.push(tipoVehiculo);
    if (tipoServicio) partes.push(tipoServicio);
    if (tipoCombustible) partes.push(tipoCombustible);
    if (modelo) partes.push(modelo);

    if (this.selectedCombo === 'domicilio') {
      if (ciudad) partes.push(ciudad);
      if (placa) partes.push(`placa ${placa}`);
      if (direccion) partes.push(direccion);
      if (codeBooking) partes.push(`(Reserva número ${codeBooking})`);
    } else {
      if (sede) partes.push(sede);
      if (placa) partes.push(`placa ${placa}`);
      if (codeBooking) partes.push(`(Reserva número ${codeBooking})`);
    }

    return partes.filter(Boolean).join(' ');
  }

  getServicioLabelPago(): string {
    const data = this.getServicioLabelData();
    return this.construirServicioLabel(data);
  }

  // =============================
  // ✅ PASO 4.3 SEDES
  // =============================
  advanceToStep4_3(): void {
    if (this.selectedCombo === 'domicilio') {
      this.autoSelectDomicilioSede();
      return;
    }

    this.step4SubStep = 3;
    this.sedesCurrentPage = 1;
    this.fetchSedesFromApi();
  }

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

  private autoSelectDomicilioSede(): void {
    this.selectedServiceId = this.serviceIdByCombo[this.selectedCombo] || this.selectedServiceId;
    this.selectedServiceName = this.serviceNameByCombo[this.selectedCombo] || this.selectedServiceName;

    if (!this.selectedServiceId) {
      console.warn('⚠️ [DOMICILIO] Aún no hay serviceId para domicilio.');
      return;
    }

    const proveedorId = this.getDomicilioProveedorId();
    if (!proveedorId) {
      alert('No hay proveedor configurado para la ciudad seleccionada en domicilio.');
      return;
    }

    this.isLoadingSedes = true;

    console.log('🏠 [DOMICILIO] Auto-selección proveedorId:', proveedorId, 'ciudad:', this.selectedCiudad);

    this.peritajeApi.obtenerProveedores(this.selectedCiudad, String(this.selectedServiceId)).subscribe({
      next: (res) => {
        const list = this.extractArray(res);
        const raw = Array.isArray(list) ? list : [];

        const match =
          raw.find((x: any) => Number(x?.id ?? x?.pk ?? x?.provider_id) === Number(proveedorId)) ?? null;

        const picked = match ?? raw[0] ?? null;

        if (!picked) {
          this.isLoadingSedes = false;
          alert('No se encontraron proveedores para domicilio en esta ciudad.');
          return;
        }

        this.selectedSede = this.mapSedeFromApi(picked, 0);

        this.isLoadingSedes = false;

        this.updateDomicilioValidators();

        this.horariosDisponibles = [];
        this.horariosError = '';
        this.horarioRawByLabel.clear();
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
      },
      error: (err) => {
        console.error('❌ [DOMICILIO] Error obteniendo proveedores:', err);
        this.isLoadingSedes = false;
        alert('No fue posible obtener el proveedor para domicilio. Intenta nuevamente.');
      },
    });
  }

  private fetchSedesFromApi(): void {
    this.selectedServiceId = this.serviceIdByCombo[this.selectedCombo] || this.selectedServiceId;
    this.selectedServiceName = this.serviceNameByCombo[this.selectedCombo] || this.selectedServiceName;

    if (this.selectedCombo === 'domicilio') {
      this.autoSelectDomicilioSede();
      return;
    }

    if (!this.selectedServiceId) {
      console.warn('⚠️ [SEDES] Aún no hay serviceId para el combo seleccionado.');
      this.sedesRaw = [];
      this.updateSedesPaginadas();
      return;
    }

    this.isLoadingSedes = true;

    console.log('📍 [SEDES] obtener_proveedores ciudad:', this.selectedCiudad, 'serviceId:', this.selectedServiceId);

    this.peritajeApi.obtenerProveedores(this.selectedCiudad, String(this.selectedServiceId)).subscribe({
      next: (res) => {
        const list = this.extractArray(res);
        this.sedesRaw = Array.isArray(list) ? list : [];

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

    this.updateDomicilioValidators();

    this.horariosDisponibles = [];
    this.horariosError = '';
    this.horarioRawByLabel.clear();
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
    if (!fecha) return of<string[]>([]);
    if (!this.selectedSede) return of<string[]>([]);
    if (!this.selectedServiceName) return of<string[]>([]);

    const [y, m, d] = String(fecha).split('-').map((n) => Number(n));
    if (!y || !m || !d) return of<string[]>([]);

    this.isLoadingHorarios = true;
    this.horariosError = '';
    this.horarioRawByLabel.clear();

    const payload: any = {
      sede: this.selectedSede.rawNombre ?? this.selectedSede.nombre,
      servicio: this.selectedServiceName,
      fecha_agenda: { day: d, month: m, year: y },
      from_flow: 'peritaje',
    };

    return this.peritajeApi.obtenerHorariosDisponibles(payload).pipe(
      map((res: any) => {
        const list = res?.data || res?.results || res?.horarios || res?.items || res || [];
        const arr = Array.isArray(list) ? list : [];

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

        const labels = horas.map((raw) => {
          const label = this.formatTimeIfNeeded(raw);
          this.horarioRawByLabel.set(label, raw);
          return label;
        });

        return labels;
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
    if (/am|pm/i.test(time)) return time;

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
    this.updateDomicilioValidators();

    if (this.step5Form.invalid) {
      this.step5Form.markAllAsTouched();
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    if (this.isLoading) return;

    this.isLoading = true;

    this.consultarYCotizarAntesDePago$()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.currentStep = 6;
          this.step6SubStep = 1;
        },
        error: (err) => {
          console.error('❌ [PERITAJE] Error consultando RUNT antes del pago:', err);

          // ✅ no bloquea el flujo si falla la consulta
          this.currentStep = 6;
          this.step6SubStep = 1;
        },
      });
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

  confirmarPago(): void {
    if (!this.aceptaCondicionesPago) {
      alert('Debes aceptar las condiciones del servicio');
      return;
    }

    if (this.isLoading) return;

    this.updateDomicilioValidators();

    if (this.selectedCombo === 'domicilio' && !this.getDireccionDomicilioValue()) {
      alert('Por favor ingresa la dirección para el servicio a domicilio.');
      return;
    }

    this.isLoading = true;

    this.agendar$()
      .pipe(
        tap((agRes) => {
          this.agendamientoResponse = agRes;
          this.codeBooking = (
            agRes?.codeBooking ??
            agRes?.codigo_reserva ??
            agRes?.booking_code ??
            agRes?.data?.codeBooking ??
            ''
          ).toString();

          // ✅ conservar también datos enriquecidos para Mercado Pago
          this.cacheRuntDataFromResponse(agRes);

          const invoiceId =
            Number(agRes?.invoice_id ?? agRes?.invoiceId ?? agRes?.data?.invoice_id ?? 0) || 0;

          const reservaPeritaje = {
            tipo: 'peritaje',
            invoiceId,
            codeBooking: this.codeBooking,
            monto: Number(this.getPrecioActual() || 0),
            nombreServicio: this.getServicioLabelPago(),
            placa: (this.step5Form.value?.placa || '').toString().toUpperCase(),
            sede: this.selectedSede?.nombre || '',
            fecha: this.getFechaTransaccion(),
            direccion: this.selectedCombo === 'domicilio' ? this.getDireccionDomicilioValue() : '',
            modelo: this.runtDataCache.modelo,
            tipoCombustible: this.runtDataCache.tipoCombustible,
            claseVehiculo: this.runtDataCache.claseVehiculo,
            tipoServicio: this.runtDataCache.tipoServicio,
            tipoVehiculo: this.runtDataCache.tipoVehiculo,
          };

          localStorage.setItem('ultima_reserva', JSON.stringify(reservaPeritaje));
          localStorage.setItem('reserva_pago', JSON.stringify(reservaPeritaje));
        }),
        switchMap(() => this.generarLinkMercadoPago$()),
        tap((pagoRes) => {
          this.pagoId = pagoRes.pago_id || null;
          this.paymentPreferenceId = pagoRes.preference_id || null;
          this.paymentLink = pagoRes.payment_link || null;

          if (!this.paymentLink) throw new Error('No se recibió el link de pago desde la API');
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
    const franjaLabel = this.step5Form.get('horaRevision')?.value || '';

    const franjaRaw = this.horarioRawByLabel.get(franjaLabel) || franjaLabel;

    if (!fecha || !franjaRaw) return throwError(() => new Error('Faltan datos de fecha/franja.'));
    if (!this.selectedSede) return throwError(() => new Error('Falta sede seleccionada.'));
    if (!this.selectedServiceName) return throwError(() => new Error('Falta servicio seleccionado.'));

    const [y, m, d] = String(fecha).split('-').map((n) => Number(n));
    if (!y || !m || !d) return throwError(() => new Error('Fecha inválida.'));

    const tipoDoc = (this.step5Form.value?.tipoDocumento || 'CC') as DocType;
    const tipoIdent = this.mapTipoDocumentoToApi(tipoDoc);

    const payload: any = {
      cliente: 'pagina_web',
      placa: (this.step5Form.value?.placa || '').toString().toUpperCase(),
      fecha_agenda: { year: y, month: m, day: d },
      franja: franjaRaw,
      ciudad: this.selectedCiudad,

      grupo_servicio: this.selectedCombo === 'domicilio' ? 'Peritaje a domicilio' : 'Peritaje presencial',

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

    if (this.selectedCombo === 'domicilio') {
      const dir = this.getDireccionDomicilioValue();
      if (!dir) return throwError(() => new Error('Falta la dirección para el servicio a domicilio.'));

      payload.direccion = dir;
      payload.direccion_domicilio = dir;
      payload.direccionServicio = dir;
      payload.direccion_servicio = dir;

      const provId = this.getDomicilioProveedorId();
      if (provId) {
        payload.proveedor_id = provId;
        payload.provider_id = provId;
        payload.id_proveedor = provId;
      }
    }

    return this.peritajeApi.agendar(payload);
  }

  private generarLinkMercadoPago$(): Observable<GenerarLinkPagoResponse> {
    const urls = this.buildBackUrls();
    const data = this.getServicioLabelData();
    const servicioLabel = this.construirServicioLabel(data);

    const req: GenerarLinkPagoRequest = {
      proyecto: 'pagina_web' as any,
      medio_pago: 'mercadopago',
      servicio_label: servicioLabel,
      valor: Number(this.getPrecioActual() || 0),
      placa_vehiculo: (data?.placa || '').toString().toUpperCase(),
      sede: null,
      servicio_tipovehiculo: null,
      urls,
    };

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