import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { Observable, throwError } from 'rxjs';
import { finalize, switchMap, tap } from 'rxjs/operators';

import { PeritajeApiService } from '../../services/peritaje-api.service';
import { RtmApiService } from '../../services/rtm-api.service';
import { PagosApiService } from '../../services/pagos-api.service';

import {
  GenerarLinkPagoRequest,
  GenerarLinkPagoResponse,
} from '../../../shared/models/pagos.models';

interface DocType {
  value: string;
  label: string;
}

interface ComboDescription {
  titulo: string;
  descripcion: string;
  items: string[];
}

interface VehiculoData {
  marca: string;
  linea: string;
  modelo: string;
  placa: string;
  clase_vehiculo: string;
  tipo_servicio: string;
  tipo_combustible: string;
  cilindraje: number;
}

interface Ciudad {
  id: number;
  nombre: string;
  lat: string;
  lng: string;
}

interface Sede {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  horario: string;
  lat: string;
  lng: string;
  distancia?: number;

  // ✅ extras para UI (NO afectan back)
  fotoUrl?: string;
  mapEmbedUrl?: string;
}

interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string;
}

type ComboId = 'plata' | 'oro' | 'diamante' | 'domicilio';

@Component({
  selector: 'app-agendar-peritaje',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './agendar-peritaje.html',
  styleUrls: ['./agendar-peritaje.scss'],
})
export class AgendarPeritajeComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  private peritajeApi = inject(PeritajeApiService);
  private rtmApi = inject(RtmApiService);
  private pagosApi = inject(PagosApiService);

  // =============================
  // ✅ ESTADOS / STEPS
  // =============================
  currentStep = 1;
  isLoading = false;
  isActivatingLocation = false;
  isLoadingSedes = false;
  isLoadingHorarios = false;

  step2SubStep = 1;
  step4SubStep = 1;
  step5SubStep = 1;
  step6SubStep = 1;

  // =============================
  // ✅ FORMS
  // =============================
  form: FormGroup;
  step5Form: FormGroup;

  // =============================
  // ✅ DATA / CATALOGS
  // =============================
  docTypes: DocType[] = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PAS', label: 'Pasaporte' },
  ];

  vehiculoData: VehiculoData = {
    marca: '',
    linea: '',
    modelo: '',
    placa: '',
    clase_vehiculo: '',
    tipo_servicio: '',
    tipo_combustible: '',
    cilindraje: 0,
  };

  ciudades: Ciudad[] = [];
  selectedCiudad: string = '';
  userLocation: { lat: number; lng: number } | null = null;

  sedes: Sede[] = [];
  sedesPaginadas: Sede[] = [];
  selectedSede: Sede | null = null;
  sedesCurrentPage = 1;
  sedesPerPage = 2;
  totalSedesPages = 1;

  horariosDisponibles: string[] = [];
  fechaAgenda: { year: number; month: number; day: number } | null = null;
  mensajeHorarios = '';

  // Servicios que vienen del back
  serviciosPresenciales: any[] = [];
  serviciosADomicilio: any[] = [];
  selectedService: Servicio | null = null;

  // Flags
  esServicioADomicilio = false;

  // =============================
  // ✅ TABS (HTML LOS EXIGE)
  // =============================
  selectedTab: ComboId = 'plata';

  precios: Record<ComboId, number> = {
    plata: 0,
    oro: 0,
    diamante: 0,
    domicilio: 0,
  };

  get tabsDisponibles(): ComboId[] {
    const tabs: ComboId[] = [];

    if (this.precios.plata > 0) tabs.push('plata');
    if (this.precios.oro > 0) tabs.push('oro');
    if (this.precios.diamante > 0) tabs.push('diamante');

    const hayDomicilio = this.precios.domicilio > 0;
    if (hayDomicilio) tabs.push('domicilio');

    return tabs.length ? tabs : (['plata'] as ComboId[]);
  }

  selectTab(tab: ComboId): void {
    this.selectedTab = tab;
    console.log('🧭 [PERITAJE] Tab seleccionada:', tab, 'Precio:', this.getPrecioActual());
    this.cdr.markForCheck();
  }

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
  // ✅ STEP 6
  // =============================
  codigoPromocional = '';
  aceptaCondicionesPago = false;

  // 🔁 útiles para debug
  agendamientoResponse: any = null;
  pagoId: string | null = null;
  paymentLink: string | null = null;
  paymentPreferenceId: string | null = null;

  constructor() {
    this.form = this.fb.group({
      placa: [
        '',
        [Validators.required, this.placaLongitudValidator, this.placaFormatoValidator],
      ],
      nombre: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      tipoDocumento: ['CC', Validators.required],
      numeroDocumento: ['', [Validators.required, this.documentoValidator.bind(this)]],
      aceptaDatos: [false, Validators.requiredTrue],
    });

    this.step5Form = this.fb.group({
      fechaRevision: ['', Validators.required],
      horaRevision: ['', Validators.required],
      placa: [{ value: '', disabled: true }],
      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      tipoDocumento: ['CC', Validators.required],
      numeroDocumento: ['', Validators.required],
      correoResultado: ['', [Validators.required, Validators.email]],
      nombreResultado: ['', Validators.required],
      direccionServicio: [''], // ✅ se vuelve required solo si es domicilio
      aceptaTerminos: [false, Validators.requiredTrue],
    });

    this.detectarUbicacionInicial();
  }

  // =============================
  // ✅ GETTERS usados en template
  // =============================
  get f() {
    return this.form.controls;
  }

  get docPlaceholder(): string {
    const tipo = this.form.get('tipoDocumento')?.value;
    const placeholders: Record<string, string> = {
      CC: 'Ej: 1234567890',
      CE: 'Ej: 123456789012',
      NIT: 'Ej: 900123456',
      PAS: 'Ej: AB1234567',
    };
    return placeholders[tipo] || 'Número de documento';
  }

  get docHelper(): string {
    const tipo = this.form.get('tipoDocumento')?.value;
    const helpers: Record<string, string> = {
      CC: '6-10 dígitos',
      CE: '6-12 dígitos',
      NIT: '9-10 dígitos',
      PAS: '6-12 caracteres',
    };
    return helpers[tipo] || '';
  }

  /** ✅ Para pintar el nombre REAL del servicio (API) donde lo necesites */
  getNombreServicioSeleccionado(): string {
    return this.selectedService?.nombre || `Peritaje ${this.getComboNombre()}`;
  }

  /** ✅ Para pintar un resumen completo tipo: "Servicio ... - Sede ... - dd/mm/yyyy - franja" */
  getResumenServicioParaPago(): string {
    const servicio = (this.selectedService?.nombre || '').trim();
    const sede = (this.selectedSede?.nombre || '').trim();
    const fecha = this.fechaAgenda
      ? `${String(this.fechaAgenda.day).padStart(2, '0')}/${String(this.fechaAgenda.month).padStart(2, '0')}/${this.fechaAgenda.year}`
      : '';
    const franja = (this.step5Form?.value?.horaRevision || '').toString().trim();

    const parts = [servicio, sede, fecha, franja].filter((p) => !!p);
    return parts.join(' - ');
  }

  // ✅ NUEVO: fecha agendada + hora (para mostrar en el resumen de pago)
  getFechaAgendadaConHora(): string {
    const fecha = this.fechaAgenda
      ? `${String(this.fechaAgenda.day).padStart(2, '0')}/${String(this.fechaAgenda.month).padStart(2, '0')}/${this.fechaAgenda.year}`
      : '';
    const hora = (this.step5Form?.value?.horaRevision || '').toString().trim();
    const parts = [fecha, hora].filter((p) => !!p);
    return parts.join(' - ');
  }

  // =============================
  // ✅ VALIDATORS
  // =============================
  private placaLongitudValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value || '').toString().trim().toUpperCase();
    if (!v) return null;
    return v.length === 6 ? null : { placaLongitud: true };
  }

  private placaFormatoValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value || '').toString().trim().toUpperCase();
    if (!v) return null;
    const ok = /^[A-Z]{3}\d{3}$/.test(v) || /^[A-Z]{3}\d{2}[A-Z]$/.test(v);
    return ok ? null : { placaFormato: true };
  }

  private documentoValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value || '').toString().trim();
    if (!v) return null;

    const tipo = this.form?.get('tipoDocumento')?.value;

    if (tipo === 'CC') return /^\d{6,10}$/.test(v) ? null : { docCC: true };
    if (tipo === 'CE') return /^\d{6,12}$/.test(v) ? null : { docCE: true };
    if (tipo === 'NIT') return /^\d{9,10}$/.test(v) ? null : { docNIT: true };
    if (tipo === 'PAS')
      return /^[A-Z0-9]{6,12}$/.test(v.toUpperCase()) ? null : { docPAS: true };

    return null;
  }

  transformarPlacaMayusculas(event: any): void {
    const input = event.target as HTMLInputElement;
    const valor = (input.value || '').toUpperCase();
    this.form.patchValue({ placa: valor }, { emitEvent: false });
    input.value = valor;
  }

  // =============================
  // ✅ NORMALIZADORES PARA API (CLAVE)
  // =============================
  private getTipoCombustibleParaApi(): string {
    const raw = (this.vehiculoData.tipo_combustible || '').toString().trim().toUpperCase();

    const hasGas = raw.includes('GAS');
    const hasElec = raw.includes('ELEC') || raw.includes('ELÉC');
    const hasHibr = raw.includes('HIBR') || raw.includes('HÍBR');

    // ✅ pedido: híbrido se manda como eléctrico
    if ((hasGas && hasElec) || hasHibr) return 'ELECTRICO';
    if (hasElec) return 'ELECTRICO';
    if (raw.includes('DIE')) return 'DIESEL';

    return 'GASOLINA';
  }

  /** ✅ Segmento SOLO UI para motos (imagen/copy), NO para API */
  private getMotoSegmentoUi(): 'URBANA' | 'SUPERBIKE' {
    const cil = Number(this.vehiculoData.cilindraje || 0);
    return cil >= 230 ? 'SUPERBIKE' : 'URBANA';
  }

  /**
   * ✅ API PRESENCIAL:
   * - Motos SIEMPRE deben ir como "MOTOCICLETA" (no "MOTOCICLETA URBANA")
   * - Lo demás se manda como clase normal
   */
  private getClaseVehiculoParaApiPresencial(): string {
    const clase = (this.vehiculoData.clase_vehiculo || '').toString().trim().toUpperCase();

    if (clase.includes('MOTOCICLETA') || clase.includes('MOTO')) {
      return 'MOTOCICLETA';
    }

    return clase || 'VEHICULO';
  }

  /**
   * ✅ API DOMICILIO:
   * - Primero intenta con "MOTOCICLETA"
   * - Fallback a URBANA/SUPERBIKE por cilindraje
   */
  private getClasesVehiculoParaApiDomicilioConFallback(): string[] {
    const clase = (this.vehiculoData.clase_vehiculo || '').toString().trim().toUpperCase();

    if (clase.includes('MOTOCICLETA') || clase.includes('MOTO')) {
      const seg = this.getMotoSegmentoUi();
      const fallback = seg === 'SUPERBIKE' ? 'MOTOCICLETA SUPERBIKE' : 'MOTOCICLETA URBANA';
      return ['MOTOCICLETA', fallback];
    }

    return [clase || 'VEHICULO'];
  }

  private esVehiculoPesado(): boolean {
    const clase = (this.vehiculoData.clase_vehiculo || '').toUpperCase();
    return (
      clase.includes('CAMION') ||
      clase.includes('BUS') ||
      clase.includes('VOLQUETA') ||
      clase.includes('TRACTOCAMION') ||
      clase.includes('TRACTOCAMIÓN') ||
      clase.includes('MAQUINARIA') ||
      clase.includes('PESADO')
    );
  }

  // =============================
  // ✅ HELPERS DE TEXTO DESDE DESCRIPTION
  // =============================
  private stripHtml(html: string): string {
    try {
      const doc = new DOMParser().parseFromString(html || '', 'text/html');
      const t = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
      return t;
    } catch {
      return (html || '').replace(/\s+/g, ' ').trim();
    }
  }

  private extraerDireccionDeDescription(descripcion: string): string {
    if (!descripcion) return '';
    const texto = this.stripHtml(descripcion);

    // 1) si viene explícito como "Dirección:"
    const dirMatch = texto.match(/Direcci[oó]n\s*:\s*([^@]+?)(?=(\s*@|$))/i);
    if (dirMatch?.[1]) return dirMatch[1].trim();

    // 2) regex de dirección colombiana común
    const regex =
      /(Calle|Carrera|Cll|Cra|Kr|Av|Avenida|Diagonal|Transversal|Dg|DG|Dgl)\s*\.?\s*[\w\d]+\s*(sur|norte)?\s*#\s*[\w\d]+\s*-\s*[\w\d]+/i;
    const match = texto.match(regex);
    if (match?.[0]) return match[0].trim();

    // 3) formato tipo "Dg 13 # 69-16" sin calle/carrera detectada
    const alt = texto.match(/\b(Dg|DG|Diagonal)\s*\d+\s*#\s*\d+\s*-\s*\d+\b/i);
    if (alt?.[0]) return alt[0].trim();

    return '';
  }

  private extraerHorario(descripcion: string): string {
    if (!descripcion) return '';
    const texto = this.stripHtml(descripcion);

    // 1) "Horarios: .... @Dirección:"
    const match = texto.match(/Horarios?\s*:\s*([^@]+?)(?=(\s*@|$))/i);
    if (match?.[1]) return match[1].trim();

    // 2) fallback si hay "Lunes..." etc
    const regexHorario = /(Lunes.*?)(?=(\s*@|$))/i;
    const m2 = texto.match(regexHorario);
    if (m2?.[1]) return m2[1].trim();

    return '';
  }

  private extraerTelefonoDeDescription(descripcion: string): string {
    if (!descripcion) return '';
    const texto = this.stripHtml(descripcion);
    const regexTelefono = /(\d{3}\s?\d{7}|\d{10}|60\d\s?\d{7})/;
    const match = texto.match(regexTelefono);
    return match ? match[0] : '';
  }

  // =============================
  // ✅ MAP URL (coords o dirección) + FALLBACK FOTO (PC)
  // =============================
  private isValidCoord(v: any): boolean {
    const n = Number(v);
    return Number.isFinite(n) && Math.abs(n) > 0.0001; // evita 0,0
  }

  getSedeMapEmbedUrl(sede: Sede): SafeResourceUrl | null {
    const latOk = this.isValidCoord(sede.lat);
    const lngOk = this.isValidCoord(sede.lng);

    if (latOk && lngOk) {
      const q = `${Number(sede.lat)},${Number(sede.lng)}`;
      return this.sanitizeUrl(`https://www.google.com/maps?q=${q}&output=embed`);
    }

    // ✅ fallback: buscar por dirección/nombre (para que NO se quede en blanco en PC)
    const base = (sede.direccion || '').trim() || (sede.nombre || '').trim();
    if (!base) return null;

    const q = encodeURIComponent(`${base}, ${this.selectedCiudad}, Colombia`);
    return this.sanitizeUrl(`https://www.google.com/maps?q=${q}&output=embed`);
  }

  // =============================
  // ✅ FLUJO PRINCIPAL
  // =============================
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('🧾 [PERITAJE] Submit con:', {
      placa: (this.form.value.placa || '').toUpperCase(),
      tipoDocumento: this.form.value.tipoDocumento,
      numeroDocumento: this.form.value.numeroDocumento,
      ciudadDetectada: this.selectedCiudad,
      userLocation: this.userLocation,
    });

    this.isLoading = true;
    this.consultarRUNT();
  }

  private consultarRUNT(): void {
    const tipoDoc =
      this.form.value.tipoDocumento === 'CC'
        ? 'Cedula de Ciudadania'
        : this.form.value.tipoDocumento;

    const placa = (this.form.value.placa || '').toUpperCase();

    this.rtmApi.consultarRunt(placa, tipoDoc, this.form.value.numeroDocumento).subscribe({
      next: (response: any) => {
        if (response?.error) {
          this.isLoading = false;
          alert('No se pudo consultar el RUNT: ' + (response?.mensaje || ''));
          return;
        }

        const dataRunt = response?.data || {};

        this.vehiculoData = {
          marca: dataRunt.marca || '',
          linea: dataRunt.linea || '',
          modelo: dataRunt.modelo || '',
          placa,
          clase_vehiculo: dataRunt.clase || dataRunt.claseVehiculo || '',
          tipo_servicio: dataRunt.servicio || dataRunt.tipoServicio || 'Particular',
          tipo_combustible: dataRunt.combustible || dataRunt.tipoCombustible || 'GASOLINA',
          cilindraje: dataRunt.cilindraje || 0,
        };

        console.log('✅ [PERITAJE] Vehículo RUNT:', this.vehiculoData);
        console.log('🧩 [PERITAJE] Normalizados API:', {
          tipo_combustible_api: this.getTipoCombustibleParaApi(),
          clase_vehiculo_presencial_api: this.getClaseVehiculoParaApiPresencial(),
          clases_vehiculo_domicilio_api: this.getClasesVehiculoParaApiDomicilioConFallback(),
          es_pesado: this.esVehiculoPesado(),
          moto_segmento_ui:
            (this.vehiculoData.clase_vehiculo || '').toUpperCase().includes('MOT')
              ? this.getMotoSegmentoUi()
              : null,
        });

        this.consultarServiciosPresenciales();
      },
      error: (err) => {
        console.error('❌ Error al consultar RUNT:', err);
        this.isLoading = false;
        alert('Error al consultar el RUNT. Verifica datos e intenta nuevamente.');
      },
    });
  }

  private consultarServiciosPresenciales(): void {
    const params = {
      grupo_servicio: 'Peritaje presencial',
      servicios_por_placa: true,
      placa: this.vehiculoData.placa,
      cliente: 'pagina_web',

      // ✅ NORMALIZADOS
      tipo_combustible: this.getTipoCombustibleParaApi(),
      modelo: this.vehiculoData.modelo,
      tipo_servicio: this.vehiculoData.tipo_servicio,
      clase_vehiculo: this.getClaseVehiculoParaApiPresencial(),
    };

    console.log('📦 [PERITAJE] Consultando servicios presenciales params:', params);

    this.peritajeApi.obtenerServicios(params).subscribe({
      next: (response: any) => {
        this.serviciosPresenciales = response?.data || [];

        console.log('✅ [PERITAJE] Servicios presenciales RAW:', this.serviciosPresenciales);
        console.table(
          (this.serviciosPresenciales || []).map((s: any) => ({
            id: s?.id,
            name: s?.name,
            price: s?.price,
          }))
        );

        this.procesarTabsYPrecios();
        this.consultarServiciosADomicilio();
      },
      error: (err) => {
        console.error('❌ Error al obtener servicios presenciales:', err);
        this.isLoading = false;
        alert('Error al consultar servicios disponibles.');
      },
    });
  }

  private consultarServiciosADomicilio(): void {
    console.log('🏙️ [PERITAJE] Ciudad para domicilio:', this.selectedCiudad);

    // ✅ Pesados NO tienen domicilio
    if (this.esVehiculoPesado()) {
      console.log('🚫 [PERITAJE] Vehículo pesado: se omite domicilio.');
      this.precios.domicilio = 0;
      this.serviciosADomicilio = [];
      this.isLoading = false;
      this.currentStep = 2;
      this.step2SubStep = 1;
      this.ensureSelectedTabValida();
      return;
    }

    // ✅ Solo Bogotá y Cali
    if (this.selectedCiudad !== 'Bogotá' && this.selectedCiudad !== 'Cali') {
      console.log('🚫 [PERITAJE] Domicilio NO aplica para ciudad:', this.selectedCiudad);
      this.precios.domicilio = 0;
      this.serviciosADomicilio = [];
      this.isLoading = false;
      this.currentStep = 2;
      this.step2SubStep = 1;
      this.ensureSelectedTabValida();
      return;
    }

    const clasesTry = this.getClasesVehiculoParaApiDomicilioConFallback();

    const intentar = (idx: number) => {
      const claseVehiculo = clasesTry[idx];

      const params = {
        grupo_servicio: 'Peritaje a domicilio',
        servicios_por_placa: true,
        placa: this.vehiculoData.placa,
        cliente: 'pagina_web',

        tipo_combustible: this.getTipoCombustibleParaApi(),
        modelo: this.vehiculoData.modelo,
        tipo_servicio: this.vehiculoData.tipo_servicio,
        clase_vehiculo: claseVehiculo,
      };

      console.log(`🏠 [PERITAJE] Consultando domicilio intento ${idx + 1}/${clasesTry.length} params:`, params);

      this.peritajeApi.obtenerServicios(params).subscribe({
        next: (response: any) => {
          const data = response?.data || [];

          console.log(`✅ [PERITAJE] Domicilio RAW intento ${idx + 1}:`, data);
          console.table(
            (data || []).map((s: any) => ({
              id: s?.id,
              name: s?.name,
              price: s?.price,
            }))
          );

          // Si vino vacío y hay fallback, probamos el siguiente
          if ((!data || !data.length) && idx + 1 < clasesTry.length) {
            return intentar(idx + 1);
          }

          this.serviciosADomicilio = data;
          this.procesarPrecioDomicilio();

          console.log('💰 [PERITAJE] precios tras domicilio:', this.precios);
          console.log('🧭 [PERITAJE] tabsDisponibles tras domicilio:', this.tabsDisponibles);

          this.isLoading = false;
          this.currentStep = 2;
          this.step2SubStep = 1;
          this.ensureSelectedTabValida();
        },
        error: (err) => {
          console.warn(`⚠️ [PERITAJE] Error domicilio intento ${idx + 1}:`, err);

          if (idx + 1 < clasesTry.length) return intentar(idx + 1);

          this.serviciosADomicilio = [];
          this.precios.domicilio = 0;

          this.isLoading = false;
          this.currentStep = 2;
          this.step2SubStep = 1;
          this.ensureSelectedTabValida();
        },
      });
    };

    intentar(0);
  }

  private procesarTabsYPrecios(): void {
    this.precios.plata = 0;
    this.precios.oro = 0;
    this.precios.diamante = 0;

    for (const s of this.serviciosPresenciales) {
      const name = (s?.name || '').toLowerCase();
      const price = Number(s?.price || 0);

      if (name.includes('plata')) this.precios.plata = price;
      if (name.includes('oro')) this.precios.oro = price;
      if (name.includes('diamante')) this.precios.diamante = price;
    }

    console.log('💰 [PERITAJE] precios tras presenciales:', this.precios);
    console.log('🧭 [PERITAJE] tabsDisponibles tras presenciales:', this.tabsDisponibles);
  }

  private procesarPrecioDomicilio(): void {
    let domicilio = 0;

    for (const s of this.serviciosADomicilio) {
      const price = Number(s?.price || 0);
      domicilio = Math.max(domicilio, price);
    }

    this.precios.domicilio = domicilio;
  }

  private ensureSelectedTabValida(): void {
    const tabs = this.tabsDisponibles;
    if (!tabs.includes(this.selectedTab)) {
      this.selectedTab = tabs[0];
    }
    this.cdr.markForCheck();
  }

  // =============================
  // ✅ STEP 2 HELPERS
  // =============================
  getPrecioActual(): number {
    return this.precios[this.selectedTab] || 0;
  }

  getImagenActual(): string {
    const categoria = this.determinarCategoriaVehiculo();
    const imgSet = this.imagenesCombos[categoria] || this.imagenesCombos['VEHICULOS LIVIANOS'];

    const key = this.selectedTab;
    return imgSet[key] || imgSet['plata'] || 'assets/peritaje-liviano-plata.png';
  }

  // ✅ NUEVO: normaliza el nombre del servicio para que el HTML NO duplique "Peritaje"
  private normalizeComboLabelFromServiceName(nombreServicio: string): string {
    const raw = (nombreServicio || '').toString().trim();
    if (!raw) return '';

    // Quita "Peritaje" al inicio si viene (case-insensitive)
    let cleaned = raw.replace(/^\s*peritaje\s*/i, '').trim();

    // Quita separadores iniciales si quedaran
    cleaned = cleaned.replace(/^[-–—:|]+/g, '').trim();

    return cleaned;
  }

  getComboNombre(): string {
    const fromService = this.normalizeComboLabelFromServiceName(this.selectedService?.nombre || '');
    if (fromService) return fromService;

    const map: Record<ComboId, string> = {
      plata: 'Plata',
      oro: 'Oro',
      diamante: 'Diamante',
      domicilio: 'A domicilio',
    };
    return map[this.selectedTab] || 'Plata';
  }

  getComboDescription(): ComboDescription {
    if (this.selectedTab === 'domicilio') {
      return {
        titulo: 'Peritaje a domicilio incluye:',
        descripcion: 'Realizamos el peritaje donde lo necesites (según cobertura).',
        items: [
          'Agendamiento y atención a domicilio',
          'Inspección y verificación completa',
          'Entrega de resultado según el servicio',
        ],
      };
    }

    const descriptions: Record<string, ComboDescription> = {
      plata: {
        titulo: 'El Combo Plata incluye:',
        descripcion: 'Inspección básica y certificado de peritaje.',
        items: ['Estructura y Carrocería', 'Improntas y Antecedentes (LTA)', 'Prueba de Motor', 'CertiMás Basic'],
      },
      oro: {
        titulo: 'El Combo Oro incluye:',
        descripcion: 'Inspección completa con diagnóstico avanzado.',
        items: [
          'Estructura y Carrocería',
          'Improntas y Antecedentes (LTA)',
          'Prueba de Motor',
          'CertiMás Basic',
          'Diagnóstico Scanner',
        ],
      },
      diamante: {
        titulo: 'El Combo Diamante incluye:',
        descripcion: 'Inspección premium con todos los servicios.',
        items: [
          'Estructura y Carrocería',
          'Improntas y Antecedentes (LTA)',
          'Prueba de Motor',
          'CertiMás Basic',
          'Diagnóstico Scanner',
          'CertiMás Premium',
          'Informe detallado de valor comercial',
        ],
      },
    };

    return descriptions[this.selectedTab] || descriptions['plata'];
  }

  private determinarCategoriaVehiculo(): string {
    const clase = (this.vehiculoData.clase_vehiculo || '').toUpperCase();
    const combustible = (this.vehiculoData.tipo_combustible || '').toUpperCase();

    // eléctricos/híbridos (UI)
    if (
      clase.includes('ELECTR') ||
      clase.includes('HIBR') ||
      combustible.includes('ELECT') ||
      combustible.includes('HIBR') ||
      (combustible.includes('GAS') && combustible.includes('ELEC'))
    ) {
      return 'ELECTRICOS O HIBRIDOS';
    }

    if (clase.includes('MOTOCICLETA') || clase.includes('MOTO')) {
      const seg = this.getMotoSegmentoUi();
      return seg === 'SUPERBIKE' ? 'MOTOCICLETAS SUPERBIKE' : 'MOTOCICLETAS URBANA';
    }

    if (this.esVehiculoPesado()) return 'VEHICULOS PESADOS';

    return 'VEHICULOS LIVIANOS';
  }

  advanceToStep2_2(): void {
    this.step2SubStep = 2;
  }

  goBackStep2(): void {
    if (this.step2SubStep === 2) {
      this.step2SubStep = 1;
    } else {
      this.currentStep = 1;
      this.step2SubStep = 1;
    }
  }

  agendarPeritaje(): void {
    const tab = this.selectedTab;

    let servicio: any = null;

    if (tab === 'domicilio') {
      servicio = this.serviciosADomicilio?.[0] || null;
    } else {
      servicio = this.serviciosPresenciales.find((s: any) =>
        (s?.name || '').toLowerCase().includes(tab)
      );
    }

    if (!servicio) {
      console.error('❌ No se encontró servicio para tab:', tab);
      alert('No se pudo encontrar el servicio seleccionado.');
      return;
    }

    this.esServicioADomicilio =
      tab === 'domicilio' || (servicio?.name || '').toLowerCase().includes('domicilio');

    // ✅ dirección requerida SOLO si domicilio
    const direccionControl = this.step5Form.get('direccionServicio');
    if (this.esServicioADomicilio) {
      direccionControl?.setValidators([Validators.required]);
    } else {
      direccionControl?.clearValidators();
      direccionControl?.setValue('', { emitEvent: false });
    }
    direccionControl?.updateValueAndValidity();

    this.selectedService = {
      id: Number(servicio.id),
      nombre: servicio.name,
      precio: Number(servicio.price || 0),
      descripcion: servicio.description,
    };

    this.currentStep = 3;
  }

  // =============================
  // ✅ STEP 3 / 4 (ciudades + sedes)
  // =============================
  private detectarUbicacionInicial(): void {
    this.peritajeApi.obtenerCiudades().subscribe({
      next: (response: any) => {
        this.ciudades = (response?.data || []).map((c: any) => ({
          id: c.id,
          nombre: (c.name || '').trim(),
          lat: c.lat,
          lng: c.lng,
        }));

        this.selectedCiudad = this.ciudades?.[0]?.nombre || 'Bogotá';
        console.log('🏙️ [PERITAJE] Ciudades cargadas:', this.ciudades);
        console.log('🏙️ [PERITAJE] Ciudad default:', this.selectedCiudad);

        this.detectarUbicacion();
      },
      error: (err) => {
        console.error('❌ Error al obtener ciudades:', err);
        this.ciudades = [];
        this.selectedCiudad = 'Bogotá';
      },
    });
  }

  private detectarUbicacion(): void {
    if (!navigator.geolocation) {
      this.selectedCiudad = 'Bogotá';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.detectarCiudadPorNombre(position);

        console.log('📍 [PERITAJE] Ubicación detectada:', this.userLocation);
        console.log('🏙️ [PERITAJE] Ciudad detectada:', this.selectedCiudad);
      },
      () => {
        this.selectedCiudad = 'Bogotá';
        console.warn('⚠️ [PERITAJE] No se pudo detectar ubicación. Fallback Bogotá.');
      }
    );
  }

  private detectarCiudadPorNombre(position: GeolocationPosition): void {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    if (lat >= 4.5 && lat <= 4.9 && lng >= -74.3 && lng <= -73.9) this.selectedCiudad = 'Bogotá';
    else if (lat >= 6.1 && lat <= 6.4 && lng >= -75.7 && lng <= -75.4) this.selectedCiudad = 'Medellín';
    else if (lat >= 3.3 && lat <= 3.6 && lng >= -76.7 && lng <= -76.4) this.selectedCiudad = 'Cali';
    else if (lat >= 10.8 && lat <= 11.2 && lng >= -75.0 && lng <= -74.6) this.selectedCiudad = 'Barranquilla';
    else if (lat >= 10.2 && lat <= 10.6 && lng >= -75.7 && lng <= -75.3) this.selectedCiudad = 'Cartagena';
    else this.selectedCiudad = 'Bogotá';
  }

  activateLocation(): void {
    this.isActivatingLocation = true;

    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      this.isActivatingLocation = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        this.detectarCiudadPorNombre(position);

        this.isActivatingLocation = false;
        this.currentStep = 4;
        this.step4SubStep = 1;
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación. Por favor selecciona manualmente.');
        this.isActivatingLocation = false;
      }
    );
  }

  selectManually(): void {
    this.currentStep = 4;
    this.step4SubStep = 1;
  }

  advanceToStep4_2(): void {
    this.step4SubStep = 2;
    this.sedesCurrentPage = 1;
    this.isLoadingSedes = true;
    this.cargarSedes();
  }

  private getReferenciaOrdenSedes(): { lat: number; lng: number } | null {
    if (this.userLocation) return this.userLocation;

    const ciudad = this.ciudades.find((c) => c.nombre === this.selectedCiudad);
    if (ciudad && this.isValidCoord(ciudad.lat) && this.isValidCoord(ciudad.lng)) {
      return { lat: Number(ciudad.lat), lng: Number(ciudad.lng) };
    }

    return null;
  }

  private cargarSedes(): void {
    if (!this.selectedService) {
      console.error('❌ No hay servicio seleccionado');
      this.isLoadingSedes = false;
      return;
    }

    this.peritajeApi.obtenerProveedores(this.selectedCiudad, String(this.selectedService.id)).subscribe({
      next: (response: any) => {
        this.sedes = (response?.data || []).map((sede: any) => {
          const desc = sede.description || '';

          const direccionExtraida =
            this.extraerDireccionDeDescription(desc) ||
            (sede.address || sede.direccion || '').toString().trim();

          const horarioExtraido =
            this.extraerHorario(desc) || (sede.schedule || sede.horario || '').toString().trim();

          const telefonoExtraido =
            (sede.phone || '').toString().trim() || this.extraerTelefonoDeDescription(desc);

          const fotoUrl =
            sede.photo || sede.foto || sede.image || sede.imagen || sede.picture || sede.logo || '';

          const lat = (sede.lat ?? '').toString();
          const lng = (sede.lng ?? '').toString();

          const sedeMapped: Sede = {
            id: sede.id,
            nombre: sede.name || 'Sin nombre',
            direccion:
              direccionExtraida && direccionExtraida.length > 2 ? direccionExtraida : 'Dirección no disponible',
            telefono: telefonoExtraido || 'Sin teléfono',
            horario:
              horarioExtraido && horarioExtraido.length > 2 ? horarioExtraido : 'Horario no disponible',
            lat: lat || '0',
            lng: lng || '0',
            fotoUrl: (fotoUrl || '').toString().trim() || undefined,
          };

          const embed = this.getSedeMapEmbedUrl(sedeMapped);
          sedeMapped.mapEmbedUrl = embed ? (embed as any) : undefined;

          return sedeMapped;
        });

        const ref = this.getReferenciaOrdenSedes();
        if (ref) {
          this.sedes.forEach((s) => {
            const latOk = this.isValidCoord(s.lat);
            const lngOk = this.isValidCoord(s.lng);

            if (latOk && lngOk) {
              s.distancia = this.calcularDistancia(
                ref.lat,
                ref.lng,
                parseFloat(s.lat),
                parseFloat(s.lng)
              );
            } else {
              s.distancia = Number.POSITIVE_INFINITY;
            }
          });

          this.sedes.sort((a, b) => (a.distancia || 0) - (b.distancia || 0));
        }

        this.updateSedesPaginadas();
        this.isLoadingSedes = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar sedes:', err);
        this.sedes = [];
        this.updateSedesPaginadas();
        this.isLoadingSedes = false;
      },
    });
  }

  private calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private updateSedesPaginadas(): void {
    const start = (this.sedesCurrentPage - 1) * this.sedesPerPage;
    const end = start + this.sedesPerPage;
    this.sedesPaginadas = this.sedes.slice(start, end);
    this.totalSedesPages = Math.ceil(this.sedes.length / this.sedesPerPage) || 1;
  }

  prevSedesPage(): void {
    if (this.sedesCurrentPage > 1) {
      this.sedesCurrentPage--;
      this.updateSedesPaginadas();
    }
  }

  nextSedesPage(): void {
    if (this.sedesCurrentPage < this.totalSedesPages) {
      this.sedesCurrentPage++;
      this.updateSedesPaginadas();
    }
  }

  selectSede(sede: Sede): void {
    this.selectedSede = sede;
    this.currentStep = 5;
    this.step5SubStep = 1;
    this.inicializarStep5Form();
  }

  openGoogleMaps(sede: Sede): void {
    const latOk = this.isValidCoord(sede.lat);
    const lngOk = this.isValidCoord(sede.lng);

    let url = '';
    if (latOk && lngOk) {
      url = `https://www.google.com/maps?q=${Number(sede.lat)},${Number(sede.lng)}`;
    } else {
      const q = encodeURIComponent(`${(sede.direccion || sede.nombre || '').trim()}, ${this.selectedCiudad}, Colombia`);
      url = `https://www.google.com/maps?q=${q}`;
    }

    window.open(url, '_blank');
  }

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // =============================
  // ✅ STEP 5
  // =============================
  private inicializarStep5Form(): void {
    this.step5Form.patchValue({
      placa: this.vehiculoData.placa,
      nombre: this.form.value.nombre,
      telefono: this.form.value.telefono,
      tipoDocumento: this.form.value.tipoDocumento,
      numeroDocumento: this.form.value.numeroDocumento,
    });

    this.horariosDisponibles = [];
    this.mensajeHorarios = 'Selecciona una fecha para ver horarios disponibles';
    this.isLoadingHorarios = false;

    this.step5Form.patchValue({ horaRevision: '' }, { emitEvent: false });
  }

  onFechaChange(event: any): void {
    const fechaSeleccionada = event?.target?.value;
    if (!fechaSeleccionada) {
      this.horariosDisponibles = [];
      this.mensajeHorarios = 'Selecciona una fecha para ver horarios disponibles';
      this.step5Form.patchValue({ horaRevision: '' }, { emitEvent: false });
      return;
    }

    const fecha = new Date(fechaSeleccionada + 'T00:00:00');

    this.fechaAgenda = {
      year: fecha.getFullYear(),
      month: fecha.getMonth() + 1,
      day: fecha.getDate(),
    };

    this.step5Form.patchValue({ horaRevision: '' }, { emitEvent: false });

    this.cargarHorariosDisponibles();
  }

  private normalizarSlots(raw: any): string[] {
    if (!raw) return [];

    if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) {
      return raw as string[];
    }

    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
      return raw
        .map((o: any) => {
          const v =
            o?.label ||
            o?.hora ||
            o?.time ||
            o?.slot ||
            o?.value ||
            o?.franja ||
            o?.name ||
            (o?.start && o?.end ? `${o.start} - ${o.end}` : '') ||
            '';
          return (v || '').toString().trim();
        })
        .filter((x: string) => !!x);
    }

    if (raw?.slots) return this.normalizarSlots(raw.slots);
    if (raw?.data?.slots) return this.normalizarSlots(raw.data.slots);

    return [];
  }

  private cargarHorariosDisponibles(): void {
    if (!this.selectedSede || !this.selectedService || !this.fechaAgenda) {
      this.horariosDisponibles = [];
      this.mensajeHorarios = 'Completa sede/servicio/fecha para ver horarios.';
      return;
    }

    this.isLoadingHorarios = true;
    this.mensajeHorarios = 'Cargando horarios...';

    const payload = {
      sede: this.selectedSede.nombre,
      servicio: this.selectedService.nombre,
      fecha_agenda: this.fechaAgenda,
      from_flow: 'peritaje',
    };

    this.peritajeApi.obtenerHorariosDisponibles(payload).subscribe({
      next: (response: any) => {
        let candidate: any = null;

        if (Array.isArray(response)) {
          if (response.length && response[0]?.slots) candidate = response[0].slots;
          else candidate = response;
        } else if (response?.slots) {
          candidate = response.slots;
        } else if (response?.data?.slots) {
          candidate = response.data.slots;
        } else if (response?.data) {
          candidate = response.data;
        } else {
          candidate = response;
        }

        const slots = this.normalizarSlots(candidate);

        this.horariosDisponibles = slots || [];

        if (!this.horariosDisponibles.length) {
          this.mensajeHorarios = '⚠️ No hay horarios disponibles para esta fecha.';
        } else {
          this.mensajeHorarios = '';
        }

        this.isLoadingHorarios = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar horarios:', err);
        this.horariosDisponibles = [];
        this.mensajeHorarios = '❌ Error al cargar horarios. Intenta nuevamente.';
        this.isLoadingHorarios = false;
      },
    });
  }

  getTodayDate(): string {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  canAdvanceToStep5_2(): boolean {
    return (
      this.step5Form.get('fechaRevision')?.valid === true &&
      this.step5Form.get('horaRevision')?.valid === true
    );
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
    else {
      this.currentStep = 4;
      this.step4SubStep = 2;
    }
  }

  continuarAlPago(): void {
    if (this.esServicioADomicilio) {
      const dir = this.step5Form.get('direccionServicio');
      dir?.setValidators([Validators.required]);
      dir?.updateValueAndValidity({ emitEvent: false });
    }

    if (this.step5Form.invalid) {
      this.step5Form.markAllAsTouched();
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    this.currentStep = 6;
    this.step6SubStep = 1;
  }

  // =============================
  // ✅ STEP 6
  // =============================
  openConditions(): void {
    alert('Aquí se mostrarían las condiciones del servicio');
  }

  advanceToStep6_2(): void {
    this.step6SubStep = 2;
  }

  advanceToStep6_3(): void {
    this.step6SubStep = 3;
  }

  aplicarCodigo(): void {
    if (!this.codigoPromocional.trim()) {
      alert('Por favor ingresa un código promocional');
      return;
    }
    alert(`Código "${this.codigoPromocional}" aplicado (pendiente de lógica real).`);
  }

  /**
   * ✅ Flujo final:
   * 1) Agenda el peritaje
   * 2) Genera link MercadoPago
   * 3) Redirige al link (MP manejará success/failure/pending a tus páginas)
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

          // ✅ FIX: guardar la reserva de PERITAJE para que /pago-exitoso NO lea RTM
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
            nombreServicio: this.getResumenServicioParaPago() || this.getNombreServicioSeleccionado(),
            placa: this.vehiculoData.placa,
            sede: this.selectedSede?.nombre || '',
            fecha: this.getFechaAgendadaConHora(),
          };

          console.log('💾 [PERITAJE] Guardando ultima_reserva (PERITAJE):', reservaPeritaje);
localStorage.setItem('ultima_reserva', JSON.stringify(reservaPeritaje)); // ✅ CLAVE que lee pago-exitoso
localStorage.setItem('reserva_pago', JSON.stringify(reservaPeritaje));   // (opcional) debug
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
    if (!this.fechaAgenda || !this.selectedSede || !this.selectedService) {
      return throwError(() => new Error('Faltan datos de fecha/sede/servicio.'));
    }

    const tipoIdent =
      this.form.value.tipoDocumento === 'CC'
        ? 'Cedula de Ciudadania'
        : this.form.value.tipoDocumento;

    const payload: any = {
      cliente: 'pagina_web',
      placa: this.vehiculoData.placa,
      fecha_agenda: this.fechaAgenda,
      franja: this.step5Form.value.horaRevision,
      ciudad: this.selectedCiudad,
      sede: this.selectedSede.nombre,
      servicio: this.selectedService.nombre,

      tipo_identificacion: tipoIdent,
      identificacion: this.form.value.numeroDocumento,

      celular: this.step5Form.value.telefono,
      correo: this.step5Form.value.correo,
      nombres: this.step5Form.value.nombre,

      from_flow: 'peritaje',

      recibir_resultado: 'true',

      correo_resultado: this.step5Form.value.correoResultado,
      nombre_resultado: this.step5Form.value.nombreResultado,

      servicio_resumen: this.getResumenServicioParaPago(),
    };

    if (this.esServicioADomicilio) {
      payload.direccion_servicio = this.step5Form.value.direccionServicio;
    }

    return this.peritajeApi.agendar(payload);
  }

  /**
   * ✅ FIX: NO consultar "proyecto" (evita 404).
   * Genera link directo como tu RTM: pagos/generar-link/
   */
  private generarLinkMercadoPago$(): Observable<GenerarLinkPagoResponse> {
    const urls = this.buildBackUrls();

    // ✅ Payload estilo el que mostraste en la otra web
    // (Aunque "proyecto" no sea obligatorio, lo dejamos en "pagina_web" porque es el que usas en RTM)
    const req: GenerarLinkPagoRequest = {
      proyecto: 'pagina_web' as any,
      medio_pago: 'mercadopago',
      servicio_label: this.getResumenServicioParaPago() || `Peritaje ${this.getComboNombre()}`,
      valor: Number(this.getPrecioActual() || 0),
      placa_vehiculo: this.vehiculoData.placa,
      sede: null,
      servicio_tipovehiculo: null,
      urls,
    };

    console.log('💳 [PERITAJE] Generando link de pago...');
    console.log('💳 [PERITAJE] Payload:', req);

    return this.pagosApi.generarLinkPago(req);
  }

  private buildBackUrls(): { success: string; failure: string; pending: string } {
    // ✅ Tus páginas ya existen
    const origin = window.location.origin;
    return {
      success: `${origin}/pago-exitoso`,
      failure: `${origin}/pago-fallido`,
      pending: `${origin}/pago-pendiente`,
    };
  }

  getFechaTransaccion(): string {
    const fecha = new Date();
    const d = String(fecha.getDate()).padStart(2, '0');
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const y = fecha.getFullYear();
    return `${d}/${m}/${y}`;
  }

  // =============================
  // ✅ BACK NAV
  // =============================
  goBack(): void {
    if (this.currentStep === 3) {
      this.currentStep = 2;
      this.step2SubStep = 1;
    } else if (this.currentStep === 4) {
      if (this.step4SubStep === 2) this.step4SubStep = 1;
      else this.currentStep = 3;
    } else if (this.currentStep === 5) {
      this.currentStep = 4;
      this.step4SubStep = 2;
    } else if (this.currentStep === 6) {
      if (this.step6SubStep > 1) this.step6SubStep--;
      else this.currentStep = 5;
    }
  }

  // =============================
  // ✅ CLOSE / RESET
  // =============================
  onClose(): void {
    this.close.emit();
    this.resetModal();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('peritaje-modal')) {
      this.onClose();
    }
  }

  private resetModal(): void {
    this.currentStep = 1;
    this.step2SubStep = 1;
    this.step4SubStep = 1;
    this.step5SubStep = 1;
    this.step6SubStep = 1;

    this.isLoading = false;
    this.isActivatingLocation = false;
    this.isLoadingSedes = false;
    this.isLoadingHorarios = false;

    this.horariosDisponibles = [];
    this.fechaAgenda = null;
    this.mensajeHorarios = '';

    this.selectedSede = null;
    this.selectedService = null;

    this.selectedTab = 'plata';
    this.precios = { plata: 0, oro: 0, diamante: 0, domicilio: 0 };

    this.esServicioADomicilio = false;

    this.codigoPromocional = '';
    this.aceptaCondicionesPago = false;

    this.agendamientoResponse = null;
    this.pagoId = null;
    this.paymentLink = null;
    this.paymentPreferenceId = null;

    this.form.reset({ tipoDocumento: 'CC', aceptaDatos: false });
    this.step5Form.reset({ tipoDocumento: 'CC', aceptaTerminos: false });

    this.step5Form.get('placa')?.disable({ emitEvent: false });

    // limpia dirección domicilio
    const dir = this.step5Form.get('direccionServicio');
    dir?.clearValidators();
    dir?.setValue('', { emitEvent: false });
    dir?.updateValueAndValidity({ emitEvent: false });
  }
}