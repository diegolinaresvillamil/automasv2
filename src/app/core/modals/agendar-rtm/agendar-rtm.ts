import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  RtmApiService,
  ObtenerHorariosRequest,
} from '../../services/rtm-api.service';
import { PagosApiService } from '../../services/pagos-api.service';
import {
  Ciudad,
  Proveedor,
  CotizarRequest,
  AgendarRequest,
} from '../../../shared/models/rtm.models';
import { GenerarLinkPagoRequest } from '../../../shared/models/pagos.models';
import { forkJoin, map, of, catchError } from 'rxjs';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_CONFIG } from '../../../../config';

type DocType = 'CC' | 'CE' | 'NIT' | 'PAS';
type TipoVehiculoId = 'liviano' | 'moto' | 'pesado';

@Component({
  selector: 'app-agendar-rtm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './agendar-rtm.html',
  styleUrl: './agendar-rtm.scss',
})
export class AgendarRtmComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Input() imageSrc = 'assets/tecno.png';
  @Input() imageAlt = 'Revisión Técnico Mecánica';

  currentStep = 1;
  step2SubStep = 1;
  step4SubStep = 1;
  step5SubStep = 1;
  step6SubStep = 1;
  isLoading = false;
  isActivatingLocation = false;
  isLoadingHorarios = false;

  isLoadingSedes = false;
  selectedSedeLoading: number | null = null;

  ciudades: Ciudad[] = [];
  proveedores: Proveedor[] = [];
  horariosDisponibles: string[] = [];
  selectedCiudad: Ciudad | null = null;
  selectedProveedor: Proveedor | null = null;
  selectedSede: Proveedor | null = null;
  cotizacionData: any = null;
  agendamientoData: any = null;

  userLocation: { lat: number; lng: number } | null = null;

  datosRunt: {
    clase_vehiculo: string;
    tipo_servicio: string;
    tipo_combustible: string;
    modelo: string;
    fecha_vencimiento_rtm: string | null;
    fromRunt: boolean;
  } | null = null;

  consultaRuntExitosa = false;

  vehicleData = {
    placa: '',
    marca: '',
    modelo: '',
    year: '',
    clasificacion: '',
    tipoVehiculo: '',
    claseVehiculo: '',
    tipoServicio: '',
    tipoCombustible: '',
    vencimiento: '',
  };

  tiposVehiculo = [
    { id: 'liviano', nombre: 'Vehículos Livianos' },
    { id: 'moto', nombre: 'Motos' },
    { id: 'pesado', nombre: 'Vehículos Pesados' },
  ];

  subtiposLivianos = [
    { id: 'particular', nombre: 'Particular' },
    { id: 'publico', nombre: 'Público' },
  ];

  selectedTipoVehiculo: string | null = null;
  selectedSubtipo: string | null = null;
  showSubtipos = false;

  sedesCurrentPage = 1;
  sedesPerPage = 3;

  sedesDesktopCurrentPage = 1;
  sedesDesktopPerPage = 2;

  precioEstimado = 0;

  codigoPromocional = '';
  aceptaCondicionesPago = false;

  docPlaceholder = 'Número de cédula (6 a 10 dígitos)';
  docHelper = 'Cédula 6-10 dígitos';

  docTypes = [
    { value: 'CC', label: 'Cédula de ciudadanía' },
    { value: 'CE', label: 'Cédula de extranjería' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PAS', label: 'Pasaporte' },
  ];

  form: FormGroup;
  step5Form: FormGroup;

  private coordenadasReales: Record<string, { lat: number; lng: number }> = {
    Bogotá: { lat: 4.711, lng: -74.0721 },
    Medellín: { lat: 6.2476, lng: -75.5658 },
    Cali: { lat: 3.4516, lng: -76.532 },
    Barranquilla: { lat: 10.9639, lng: -74.7964 },
    Cartagena: { lat: 10.391, lng: -75.4794 },
    'Barbosa Antioquia': { lat: 6.4386, lng: -75.3314 },
    Popayán: { lat: 2.4419, lng: -76.6063 },
    Cajicá: { lat: 4.9186, lng: -74.0267 },
    Armenia: { lat: 4.5389, lng: -75.6811 },
    'Armenia Quindío': { lat: 4.5389, lng: -75.6811 },
    ' Armenia  Quindío ': { lat: 4.5389, lng: -75.6811 },
    Neiva: { lat: 2.9273, lng: -75.2819 },
    'El Carmen de Viboral': { lat: 6.08, lng: -75.335 },
  };

  private readonly BASE_URL = API_CONFIG.BASE_URL;
  private readonly TOKEN = '2c632158202204ad6d69a9e0e2735a26268ebc3d';

  constructor(
    private fb: FormBuilder,
    private rtmApiService: RtmApiService,
    private pagosApiService: PagosApiService,
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {
    console.log('🚗 [Agendar RTM] Componente inicializado');

    this.form = this.fb.group({
      placa: ['', [Validators.required, this.placaValidator.bind(this)]],
      nombre: ['', [Validators.required, this.nombreValidator.bind(this)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      tipoDocumento: ['CC', Validators.required],
      numeroDocumento: ['', Validators.required],
      aceptaDatos: [false, Validators.requiredTrue],
    });

    this.step5Form = this.fb.group({
      fechaRevision: ['', Validators.required],
      horaRevision: ['', Validators.required],
      placa: [''],
      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      tipoDocumento: ['CC'],
      numeroDocumento: ['', Validators.required],
      aceptaTerminos: [false, Validators.requiredTrue],
    });

    this.step5Form.get('fechaRevision')?.valueChanges.subscribe((fecha) => {
      if (fecha && this.selectedSede) {
        console.log(
          '📅 [Agendar RTM] Fecha cambiada, recargando horarios:',
          fecha
        );
        this.cargarHorariosDisponibles(fecha);
      }
    });

    this.form.get('tipoDocumento')?.valueChanges.subscribe((tipo: DocType) => {
      this.updateDocLabels(tipo);
      this.applyDocRules(tipo);
    });

    this.form.get('placa')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);
      if (cleaned !== v) {
        this.form.get('placa')?.setValue(cleaned, { emitEvent: false });
      }
    });

    this.form.get('nombre')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '');
      const normalized = cleaned.replace(/\s{2,}/g, ' ');
      if (normalized !== v) {
        this.form.get('nombre')?.setValue(normalized, { emitEvent: false });
      }
    });

    this.form.get('telefono')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').replace(/[^\d]/g, '').slice(0, 10);
      if (cleaned !== v) {
        this.form.get('telefono')?.setValue(cleaned, { emitEvent: false });
      }
    });

    this.form.get('numeroDocumento')?.valueChanges.subscribe((v: string) => {
      const tipo = this.form.get('tipoDocumento')?.value as DocType;
      let cleaned = v || '';
      cleaned =
        tipo === 'PAS'
          ? cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '')
          : cleaned.replace(/[^\d]/g, '');
      cleaned = cleaned.slice(0, this.getDocMaxLen(tipo));
      if (cleaned !== v) {
        this.form.get('numeroDocumento')?.setValue(cleaned, {
          emitEvent: false,
        });
      }
    });

    this.applyDocRules('CC');
  }

  get f() {
    return this.form.controls;
  }

  get sedesPaginadas(): Proveedor[] {
    const start = (this.sedesCurrentPage - 1) * this.sedesPerPage;
    const end = start + this.sedesPerPage;
    return this.proveedores.slice(start, end);
  }

  get totalSedesPages(): number {
    return Math.ceil(this.proveedores.length / this.sedesPerPage);
  }

  get sedesPaginadasDesktop(): Proveedor[] {
    const start = (this.sedesDesktopCurrentPage - 1) * this.sedesDesktopPerPage;
    const end = start + this.sedesDesktopPerPage;
    return this.proveedores.slice(start, end);
  }

  get totalSedesPagesDesktop(): number {
    return Math.ceil(this.proveedores.length / this.sedesDesktopPerPage);
  }

  get tipoVehiculoNombre(): string {
    if (!this.selectedTipoVehiculo) return '';

    const tipo = this.tiposVehiculo.find(
      (t) => t.id === this.selectedTipoVehiculo
    );
    if (!tipo) return '';

    if (this.selectedTipoVehiculo === 'liviano' && this.selectedSubtipo) {
      const subtipo = this.subtiposLivianos.find(
        (s) => s.id === this.selectedSubtipo
      );
      return `${tipo.nombre} - ${subtipo?.nombre || ''}`;
    }

    return tipo.nombre;
  }

  private normalizeText(v: string): string {
    return (v || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private includesAny(text: string, words: string[]): boolean {
    return words.some((w) => text.includes(w));
  }

  private normalizeCityName(v: string): string {
    return this.normalizeText(v).replace(/\s+/g, ' ');
  }

  private getActionUrl(
    action: string,
    params: Record<string, string | number | boolean | null | undefined> = {}
  ): string {
    const searchParams = new URLSearchParams();
    searchParams.set('accion', action);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && `${value}` !== '') {
        searchParams.set(key, String(value));
      }
    });

    const query = searchParams.toString();

    return `${this.BASE_URL}wh/transversal/ejecutar-accion/?${query}`;
  }

  private getHeadersServicios(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Token ${this.TOKEN}`,
      'Content-Type': 'application/json',
    });
  }

  private obtenerTodasLasPaginasAccion(
    action: string,
    params: Record<string, string | number | boolean | null | undefined>,
    onComplete: (items: any[]) => void,
    onError: (err: any) => void
  ): void {
    const headers = this.getHeadersServicios();
    const acumulado: any[] = [];

    const cargarPagina = (page: number) => {
      const url = this.getActionUrl(action, { ...params, page });

      this.http.post<any>(url, {}, { headers }).subscribe({
        next: (response) => {
          const data = Array.isArray(response?.data) ? response.data : [];
          const metadata = response?.metadata || {};
          const currentPage = Number(
            metadata?.page ?? metadata?.current_page ?? metadata?.name ?? page
          ) || page;
          const pagesCount = Number(
            metadata?.pages_count ?? metadata?.total_pages ?? metadata?.last_page ?? 1
          ) || 1;

          acumulado.push(...data);

          console.log(`📄 [${action}] página ${currentPage} de ${pagesCount}`, {
            itemsPagina: data.length,
            acumulado: acumulado.length,
            params,
          });

          if (currentPage < pagesCount) {
            cargarPagina(currentPage + 1);
          } else {
            onComplete(acumulado);
          }
        },
        error: (err) => onError(err),
      });
    };

    cargarPagina(1);
  }

  private resolveTipoVehiculoFromRunt(): TipoVehiculoId {
    const raw = (
      this.datosRunt?.clase_vehiculo ||
      this.vehicleData.clasificacion ||
      ''
    )
      .toString()
      .trim();

    const upper = raw.toUpperCase();

    if (upper.includes('MOTO') || upper.includes('MOTOCICLETA')) return 'moto';

    if (
      upper.includes('CAMION') ||
      upper.includes('CAMIÓN') ||
      upper.includes('BUS') ||
      upper.includes('BUSETA') ||
      upper.includes('TRACTO') ||
      upper.includes('TRACTOCAMION') ||
      upper.includes('VOLQUETA') ||
      upper.includes('REMOLQUE') ||
      upper.includes('MAQUINARIA') ||
      upper.includes('PESADO')
    )
      return 'pesado';

    return 'liviano';
  }

  private resolveTipoVehiculoApi(): string {
    const tipo = this.resolveTipoVehiculoFromRunt();
    if (tipo === 'moto') return 'moto';
    if (tipo === 'pesado') return 'pesado';
    return 'liviano';
  }

  private resolveTipoServicioToken(): string {
    const raw =
      (this.datosRunt?.tipo_servicio ||
        this.vehicleData.tipoServicio ||
        '') as any;
    const t = this.normalizeText(raw);
    if (!t) return '';
    if (t.includes('public')) return 'publico';
    if (t.includes('partic')) return 'particular';
    return t;
  }

  private resolveCombustibleToken(): string {
    const raw =
      (this.datosRunt?.tipo_combustible ||
        this.vehicleData.tipoCombustible ||
        '') as any;
    const t = this.normalizeText(raw);
    if (!t) return '';
    if (t.includes('elect')) return 'electrico';
    if (t.includes('gasolina') || t === 'gas') return 'gasolina';
    if (t.includes('diesel')) return 'diesel';
    if (t.includes('gnv') || t.includes('natural')) return 'gnv';
    if (t.includes('hibrid') || t.includes('hybrid')) return 'hibrido';
    return t;
  }

  private obtenerServicioById(id: number) {
    const url = this.getActionUrl('obtener_servicios', { id });
    return this.http.post<any>(url, {}, { headers: this.getHeadersServicios() });
  }

  private servicioNameMatchesRunt(serviceName: string): boolean {
    const name = this.normalizeText(serviceName);

    const tipoVeh = this.resolveTipoVehiculoFromRunt();
    const tipoServ = this.resolveTipoServicioToken();
    const comb = this.resolveCombustibleToken();

    const isRTM =
      (name.includes('revision') || name.includes('revis')) &&
      (name.includes('tecnico') || name.includes('mecanica') || name.includes('mecanic'));
    if (!isRTM) return false;

    const hintsPesado = ['vehiculo pesado', 'pesado', 'camion', 'bus', 'tracto', 'volqueta'];
    const hintsMoto = ['moto', 'motoc'];
    const hintsLiviano = ['vehiculo liviano', 'liviano'];

    const nameIsPesado = this.includesAny(name, hintsPesado);
    const nameIsMoto = this.includesAny(name, hintsMoto);
    const nameIsLiviano = this.includesAny(name, hintsLiviano);
    const nameHasTipo = nameIsPesado || nameIsMoto || nameIsLiviano;

    const matchesTipo =
      !nameHasTipo ||
      (tipoVeh === 'pesado' && nameIsPesado) ||
      (tipoVeh === 'moto' && nameIsMoto) ||
      (tipoVeh === 'liviano' && nameIsLiviano);

    if (!matchesTipo) return false;

    const nameMentionsServicio = this.includesAny(name, ['public', 'partic']);
    if (nameMentionsServicio && tipoServ) {
      if (tipoServ === 'publico' && !name.includes('public')) return false;
      if (tipoServ === 'particular' && !name.includes('partic')) return false;
    }

    const combustiblesHints = ['diesel', 'gasolina', 'elect', 'hibrid', 'gnv', 'natural', 'gas'];
    const nameMentionsComb = this.includesAny(name, combustiblesHints);

    if (nameMentionsComb && comb) {
      if (comb === 'electrico' && !name.includes('elect')) return false;
      if (comb === 'diesel' && !name.includes('diesel')) return false;
      if ((comb === 'gasolina' || comb === 'gas') && !(name.includes('gasolina') || name.includes('gas'))) return false;
      if (comb === 'gnv' && !(name.includes('gnv') || name.includes('natural'))) return false;
      if (comb === 'hibrido' && !name.includes('hibrid')) return false;
    }

    return true;
  }

  private sedePareceRTM(raw: any): boolean {
    const name = this.normalizeText(raw?.name || '');
    const desc = this.normalizeText(raw?.description || '');
    const text = `${name} ${desc}`;

    const positiveHints = [
      'cda',
      'revision tecnico mecanica',
      'revision tecnico-mecanica',
      'revision tecnico mecánica',
      'rtm',
      'tecnico mecanica',
      'tecnicomecanica',
      'revision',
      'revisión',
    ];

    const negativeHints = [
      'tramites vehiculares',
      'trámites vehiculares',
    ];

    const hasPositive = this.includesAny(text, positiveHints);
    const hasNegative = this.includesAny(text, negativeHints);

    return hasPositive && !hasNegative;
  }

  private filtrarSedesPorServiciosExactos(sedes: Proveedor[]) {
    const lookups = sedes.map((sede) => {
      const ids: (string | number)[] = ((sede as any)?.services || []) as any[];

      if (!ids || ids.length === 0) {
        return of({ sede, ok: true });
      }

      const idsToCheck = ids.slice(0, 25).map((x) => Number(x)).filter(Boolean);

      const calls = idsToCheck.map((id) => {
        return this.obtenerServicioById(id).pipe(
          map((resp: any) => {
            const item = resp?.data?.[0] || resp?.data || resp;
            const name = item?.name || '';
            return { id, name };
          }),
          catchError(() => of({ id, name: '' }))
        );
      });

      return forkJoin(calls).pipe(
        map((servicesInfo: any[]) => {
          const match = servicesInfo.find(
            (x) => x?.name && this.servicioNameMatchesRunt(x.name)
          );

          if (match) {
            (sede as any).__matched_service_id = match.id;
            (sede as any).__matched_service_name = match.name;
            return { sede, ok: true };
          }

          return { sede, ok: false };
        }),
        catchError(() => of({ sede, ok: true }))
      );
    });

    if (lookups.length === 0) return of([]);

    return forkJoin(lookups).pipe(
      map((results: any[]) => results.filter((r) => r.ok).map((r) => r.sede))
    );
  }

  private buildCotizarExtra(): any {
    const tipoVehiculo = this.resolveTipoVehiculoApi();

    const claseVehiculo = (
      this.datosRunt?.clase_vehiculo ||
      this.vehicleData.clasificacion ||
      ''
    )
      .toString()
      .trim();
    const tipoServicio = (
      this.datosRunt?.tipo_servicio ||
      this.vehicleData.tipoServicio ||
      ''
    )
      .toString()
      .trim();
    const combustible = (
      this.datosRunt?.tipo_combustible ||
      this.vehicleData.tipoCombustible ||
      ''
    )
      .toString()
      .trim();
    const modelo = (this.datosRunt?.modelo || this.vehicleData.year || '')
      .toString()
      .trim();

    return {
      servicio_tipovehiculo: tipoVehiculo,
      servicio_clasevehiculo: claseVehiculo,
      servicio_tiposervicio: tipoServicio,
      servicio_combustible: combustible,
      servicio_modelo: modelo,
      from_runt: !!this.datosRunt?.fromRunt,
    };
  }

  private placaValidator(control: AbstractControl): ValidationErrors | null {
    const v = ((control.value as string) || '').toUpperCase();
    if (!v) return null;
    if (!/^[A-Z0-9]{6}$/.test(v)) return { placaFormato: true };
    const car = /^[A-Z]{3}\d{3}$/;
    const moto = /^[A-Z]{3}\d{2}[A-Z]$/;
    if (!car.test(v) && !moto.test(v)) return { placaTipo: true };
    return null;
  }

  private nombreValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value as string) || '';
    if (!v) return null;
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(v)) return { nombreFormato: true };
    if (v.trim().length < 2) return { nombreCorto: true };
    return null;
  }

  private docValidator(type: DocType) {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = (control.value as string) || '';
      if (!v) return null;
      if (type === 'CC' && !/^\d{6,10}$/.test(v)) return { docCC: true };
      if (type === 'CE' && !/^\d{6,12}$/.test(v)) return { docCE: true };
      if (type === 'NIT' && !/^\d{9,10}$/.test(v)) return { docNIT: true };
      if (type === 'PAS' && !/^[A-Z0-9]{6,12}$/.test(v.toUpperCase()))
        return { docPAS: true };
      return null;
    };
  }

  private applyDocRules(type: DocType): void {
    const control = this.form.get('numeroDocumento');
    if (control) {
      control.setValidators([Validators.required, this.docValidator(type)]);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private getDocMaxLen(type: DocType): number {
    const lens: Record<DocType, number> = { CC: 10, CE: 12, NIT: 10, PAS: 12 };
    return lens[type] || 12;
  }

  private updateDocLabels(type: DocType): void {
    if (type === 'CC') {
      this.docPlaceholder = 'Número de cédula (6 a 10 dígitos)';
      this.docHelper = 'Cédula 6-10 dígitos';
    } else if (type === 'CE') {
      this.docPlaceholder = 'Número de extranjería (6 a 12 dígitos)';
      this.docHelper = 'Extranjería 6-12 dígitos';
    } else if (type === 'NIT') {
      this.docPlaceholder = 'NIT (9 a 10 dígitos)';
      this.docHelper = 'NIT 9-10 dígitos';
    } else {
      this.docPlaceholder = 'Pasaporte (6 a 12 alfanum)';
      this.docHelper = 'Pasaporte 6-12 caracteres';
    }
  }

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  formatearFechaVencimiento(fecha: string | null): string {
    if (!fecha) return 'No disponible';

    if (fecha.includes('/')) {
      const [dia, mes, año] = fecha.split('/');
      const meses = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
      ];
      const mesNombre = meses[parseInt(mes) - 1];
      return `${parseInt(dia)} de ${mesNombre} de ${año}`;
    }

    return fecha;
  }

  onClose(): void {
    console.log('🚗 [Agendar RTM] Cerrando modal');
    this.currentStep = 1;
    this.step2SubStep = 1;
    this.step4SubStep = 1;
    this.step5SubStep = 1;
    this.step6SubStep = 1;
    this.isLoading = false;
    this.isActivatingLocation = false;
    this.isLoadingSedes = false;
    this.isLoadingHorarios = false;
    this.selectedSedeLoading = null;
    this.ciudades = [];
    this.proveedores = [];
    this.horariosDisponibles = [];
    this.selectedCiudad = null;
    this.selectedProveedor = null;
    this.selectedSede = null;
    this.cotizacionData = null;
    this.agendamientoData = null;
    this.codigoPromocional = '';
    this.aceptaCondicionesPago = false;
    this.selectedTipoVehiculo = null;
    this.selectedSubtipo = null;
    this.showSubtipos = false;
    this.sedesCurrentPage = 1;
    this.sedesDesktopCurrentPage = 1;
    this.precioEstimado = 0;
    this.datosRunt = null;
    this.consultaRuntExitosa = false;
    this.userLocation = null;

    this.vehicleData = {
      placa: '',
      marca: '',
      modelo: '',
      year: '',
      clasificacion: '',
      tipoVehiculo: '',
      claseVehiculo: '',
      tipoServicio: '',
      tipoCombustible: '',
      vencimiento: '',
    };

    this.form.reset({ tipoDocumento: 'CC', aceptaDatos: false });
    this.close.emit();
  }

  onBackdropClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.onClose();
  }

  submit(): void {
    console.log('🚗 [Agendar RTM] Submit formulario paso 1');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.warn('⚠️ [Agendar RTM] Formulario inválido');
      return;
    }

    console.log('📋 [Agendar RTM] Datos del formulario:', this.form.value);

    this.isLoading = true;

    const placa = this.form.get('placa')?.value;
    const tipoDoc = this.form.get('tipoDocumento')?.value;
    const numDoc = this.form.get('numeroDocumento')?.value;

    console.log('🔍 [Agendar RTM] Consultando RUNT...');

    this.rtmApiService.consultarRunt(placa, tipoDoc, numDoc).subscribe({
      next: (runtResponse) => {
        console.log('✅ [Agendar RTM] Respuesta RUNT completa:', runtResponse);

        const data = (runtResponse as any).data || runtResponse;

        const fechaVencimiento =
          (data as any).revisionRTMActual?.fecha_vencimiento || null;

        this.vehicleData.placa = placa;
        this.vehicleData.marca = (data as any).marca || '';
        this.vehicleData.modelo = (data as any).linea || '';
        this.vehicleData.year = (data as any).modelo || '';
        this.vehicleData.clasificacion = (data as any).claseVehiculo || '';
        this.vehicleData.tipoServicio = (data as any).tipoServicio || '';
        this.vehicleData.tipoCombustible = (data as any).tipoCombustible || '';
        this.vehicleData.vencimiento = fechaVencimiento || 'No disponible';

        this.datosRunt = {
          clase_vehiculo: (data as any).claseVehiculo || '',
          tipo_servicio: (data as any).tipoServicio || '',
          tipo_combustible: (data as any).tipoCombustible || '',
          modelo: (data as any).modelo || '',
          fecha_vencimiento_rtm: fechaVencimiento,
          fromRunt: true,
        };

        this.selectedTipoVehiculo = this.resolveTipoVehiculoFromRunt();
        this.showSubtipos = false;
        this.selectedSubtipo = null;

        this.consultaRuntExitosa = true;

        this.obtenerTodasLasPaginasAccion(
          'obtener_ciudades',
          {},
          (items) => {
            console.log('✅ [Agendar RTM] Ciudades cargadas (todas las páginas)');

            const ciudadesMap = new Map<number, Ciudad>();

            items.forEach((c: any) => {
              const id = Number(c.id);
              if (!id) return;

              if (!ciudadesMap.has(id)) {
                ciudadesMap.set(id, c);
              }
            });

            this.ciudades = Array.from(ciudadesMap.values());
            this.isLoading = false;
            this.currentStep = 2;
            this.step2SubStep = 1;
          },
          (error) => {
            console.error('❌ [Agendar RTM] Error al cargar ciudades:', error);
            this.isLoading = false;
            alert('Error al cargar las ciudades. Por favor intenta nuevamente.');
          }
        );
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error al consultar RUNT:', error);
        this.isLoading = false;
        alert(
          'Error al consultar los datos del vehículo. Por favor verifica la placa y documento.'
        );
      },
    });
  }

  selectCiudad(ciudad: Ciudad): void {
    console.log('📍 [Agendar RTM] Ciudad seleccionada:', ciudad.name);
    this.selectedCiudad = ciudad;
  }

  selectCityAndSede(): void {
    console.log('📍 [Agendar RTM] Iniciando selección de ciudad y sede');
    this.currentStep = 3;
  }

  selectManually(): void {
    console.log('✍️ [Agendar RTM] Usuario eligió ingresar datos manualmente');
    this.currentStep = 4;
    this.step4SubStep = 1;
  }

  activateLocation(): void {
    console.log('📍 [Agendar RTM] Activando geolocalización...');
    this.isActivatingLocation = true;

    if (!navigator.geolocation) {
      console.error('❌ [Agendar RTM] Geolocalización no soportada');
      alert('Tu navegador no soporta geolocalización');
      this.isActivatingLocation = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.userLocation = { lat, lng };

        const ciudadCercana = this.findClosestCity(lat, lng);

        if (ciudadCercana) {
          this.selectedCiudad = ciudadCercana;
          this.isActivatingLocation = false;
          this.currentStep = 4;
          this.step4SubStep = 1;
        } else {
          alert(
            'No se encontró una ciudad cercana. Por favor selecciona manualmente.'
          );
          this.isActivatingLocation = false;
        }
      },
      (error) => {
        console.error('❌ [Agendar RTM] Error al obtener ubicación:', error);
        alert('No se pudo obtener tu ubicación. Por favor selecciona manualmente.');
        this.isActivatingLocation = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  private findClosestCity(lat: number, lng: number): Ciudad | null {
    if (!this.ciudades || this.ciudades.length === 0) {
      return null;
    }

    let closestCity: Ciudad | null = null;
    let minDistance = Infinity;

    this.ciudades.forEach((ciudad) => {
      if (!ciudad || !(ciudad as any).name) return;

      let cityLat: number;
      let cityLng: number;

      const nombreCiudad = (ciudad as any).name.trim();
      const coords = this.coordenadasReales[nombreCiudad];

      if (coords) {
        cityLat = coords.lat;
        cityLng = coords.lng;
      } else {
        cityLat = parseFloat((ciudad as any).lat || '0');
        cityLng = parseFloat((ciudad as any).lng || '0');
      }

      const distance = this.calculateDistance(lat, lng, cityLat, cityLng);

      if (distance < minDistance) {
        minDistance = distance;
        closestCity = ciudad;
      }
    });

    return closestCity;
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private sortSedesByDistance(): void {
    if (!this.userLocation) return;

    this.proveedores.sort((a, b) => {
      const distA = this.getSedeDistance(a);
      const distB = this.getSedeDistance(b);
      return distA - distB;
    });
  }

  private getSedeDistance(sede: Proveedor): number {
    if (!this.userLocation) return Infinity;

    let sedeLat: number;
    let sedeLng: number;

    if ((sede as any).lat && (sede as any).lng) {
      sedeLat = parseFloat((sede as any).lat);
      sedeLng = parseFloat((sede as any).lng);
    } else if (this.selectedCiudad) {
      const coordsCiudad =
        this.coordenadasReales[this.selectedCiudad.name.trim()];
      if (coordsCiudad) {
        sedeLat = coordsCiudad.lat;
        sedeLng = coordsCiudad.lng;
      } else {
        sedeLat = parseFloat((this.selectedCiudad as any).lat || '0');
        sedeLng = parseFloat((this.selectedCiudad as any).lng || '0');
      }
    } else {
      return Infinity;
    }

    return this.calculateDistance(
      this.userLocation.lat,
      this.userLocation.lng,
      sedeLat,
      sedeLng
    );
  }

  selectTipoVehiculo(tipoId: string): void {
    console.log('🚗 [Agendar RTM] Tipo de vehículo seleccionado:', tipoId);
    this.selectedTipoVehiculo = tipoId;

    if (tipoId === 'liviano') {
      this.showSubtipos = true;
      this.selectedSubtipo = null;
    } else {
      this.showSubtipos = false;
      this.selectedSubtipo = null;
    }
  }

  selectSubtipo(subtipoId: string): void {
    console.log('🚗 [Agendar RTM] Subtipo seleccionado:', subtipoId);
    this.selectedSubtipo = subtipoId;
  }

  advanceToStep4_2(): void {
    if (!this.selectedCiudad) {
      alert('Por favor selecciona una ciudad');
      return;
    }

    console.log(
      '🏢 [Agendar RTM] Cargando proveedores para:',
      this.selectedCiudad.name
    );
    this.isLoadingSedes = true;

    this.obtenerTodasLasPaginasAccion(
      'obtener_proveedores',
      {
        ciudad: this.selectedCiudad.name,
        from_flow: 'rtm',
      },
      (items) => {
        const all: Proveedor[] = (items || []) as Proveedor[];

        console.log('✅ [Agendar RTM] Proveedores cargados (todas las páginas):', all.length);

        const visibles = all.filter((p: any) => p?.is_visible !== false);

        const filtradosBase = visibles.filter((p: any) => {
          const name = this.normalizeText((p as any)?.name || '');
          const desc = this.normalizeText((p as any)?.description || '');
          const text = `${name} ${desc}`;

          const isTramitesVehiculares =
            text.includes('tramites vehiculares') ||
            text.includes('trámites vehiculares');

          if (isTramitesVehiculares) return false;

          const hasServices = Array.isArray((p as any)?.services) && (p as any)?.services.length > 0;

          if (hasServices) return true;

          return this.sedePareceRTM(p);
        });

        this.filtrarSedesPorServiciosExactos(filtradosBase).subscribe({
          next: (filtradas: Proveedor[]) => {
            console.log(
              '✅ [Agendar RTM] Proveedores filtrados por servicios:',
              filtradas.length
            );

            const tipoVeh = this.resolveTipoVehiculoFromRunt();
            if (tipoVeh === 'pesado' && filtradas.length <= 1) {
              console.warn(
                '⚠️ [Agendar RTM] Filtro pesado devolvió muy pocas sedes. Activando fallback para mostrar base filtrada.'
              );
              this.proveedores = filtradosBase;
            } else {
              this.proveedores = filtradas;
            }

            this.sortSedesByDistance();

            this.isLoadingSedes = false;
            this.step4SubStep = 2;
            this.sedesCurrentPage = 1;
            this.sedesDesktopCurrentPage = 1;

            if (this.proveedores.length === 0) {
              alert(
                'No encontramos sedes disponibles para el tipo de vehículo/servicio en esta ciudad. Intenta con otra ciudad.'
              );
            }
          },
          error: (e) => {
            console.error('❌ [Agendar RTM] Error filtrando por servicios:', e);
            this.proveedores = filtradosBase;
            this.sortSedesByDistance();
            this.isLoadingSedes = false;
            this.step4SubStep = 2;
            this.sedesCurrentPage = 1;
            this.sedesDesktopCurrentPage = 1;
          },
        });
      },
      (error) => {
        console.error('❌ [Agendar RTM] Error al cargar proveedores:', error);
        this.isLoadingSedes = false;
        alert('Error al cargar las sedes. Por favor intenta nuevamente.');
      }
    );
  }

  openGoogleMaps(sede: Proveedor): void {
    const mapaUrl = this.extractMapaUrl((sede as any).description || '');

    if (mapaUrl) {
      window.open(mapaUrl, '_blank');
      return;
    }

    if ((sede as any).lat && (sede as any).lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${(sede as any).lat},${
        (sede as any).lng
      }`;
      window.open(url, '_blank');
      return;
    }

    alert('Ubicación no disponible para esta sede');
  }

  prevSedesPage(): void {
    if (this.sedesCurrentPage > 1) this.sedesCurrentPage--;
  }

  nextSedesPage(): void {
    if (this.sedesCurrentPage < this.totalSedesPages) this.sedesCurrentPage++;
  }

  prevSedesPageDesktop(): void {
    if (this.sedesDesktopCurrentPage > 1) this.sedesDesktopCurrentPage--;
  }

  nextSedesPageDesktop(): void {
    if (this.sedesDesktopCurrentPage < this.totalSedesPagesDesktop)
      this.sedesDesktopCurrentPage++;
  }

  selectSedeStep4(sede: Proveedor): void {
    console.log(
      '🏢 [Agendar RTM] Sede seleccionada en paso 4:',
      (sede as any).name
    );

    this.selectedSede = sede;
    this.selectedProveedor = sede;
    this.selectedSedeLoading = (sede as any).id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = tomorrow.getMonth() + 1;
    const day = tomorrow.getDate();

    const baseRequest: CotizarRequest = {
      cliente: 'pagina_web',
      placa: this.form.get('placa')?.value,
      fecha_agenda: { day, month, year },
      franja: '10:00 AM',
      ciudad: this.selectedCiudad!.name,
      sede: (sede as any).name,
      celular: this.form.get('telefono')?.value,
      correo: 'cotizacion@automas.com.co',
      nombres: this.form.get('nombre')?.value,
      from_flow: 'rtm',
      tipo_identificacion: this.form.get('tipoDocumento')?.value,
      identificacion: this.form.get('numeroDocumento')?.value,
    };

    const cotizarRequest: any = {
      ...baseRequest,
      ...this.buildCotizarExtra(),
    };

    console.log(
      '💰 [Agendar RTM] Consultando precio en paso 4 (con extra):',
      cotizarRequest
    );

    this.rtmApiService.cotizar(cotizarRequest).subscribe({
      next: (response) => {
        console.log('✅ [Agendar RTM] Precio obtenido:', response);
        this.precioEstimado = (response as any).price || 0;
        this.cotizacionData = response;
        this.selectedSedeLoading = null;
        this.step4SubStep = 3;
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error al obtener precio:', error);
        this.selectedSedeLoading = null;

        this.precioEstimado = 318493;
        this.step4SubStep = 3;

        alert(
          'No se pudo obtener el precio exacto. Se muestra un valor estimado.'
        );
      },
    });
  }

  private cargarHorariosDisponibles(fechaISO: string): void {
    if (!this.selectedSede) {
      console.error('❌ [Agendar RTM] No hay sede seleccionada');
      return;
    }

    const [year, month, day] = fechaISO.split('-').map(Number);

    const request: ObtenerHorariosRequest = {
      sede: (this.selectedSede as any).name,
      fecha_agenda: { day, month, year },
      from_flow: 'rtm',
    };

    console.log('📅 [Agendar RTM] Cargando horarios disponibles:', request);
    this.isLoadingHorarios = true;
    this.step5Form.patchValue({ horaRevision: '' });

    this.rtmApiService.obtenerHorariosDisponibles(request).subscribe({
      next: (response: any) => {
        this.horariosDisponibles = [];

        if (Array.isArray(response) && response.length > 0) {
          const firstElement = response[0];
          if (
            firstElement &&
            typeof firstElement === 'object' &&
            'slots' in firstElement
          ) {
            const slots = firstElement.slots;
            if (Array.isArray(slots)) {
              this.horariosDisponibles = slots
                .filter(
                  (slot: any) =>
                    slot &&
                    typeof slot === 'object' &&
                    'time' in slot
                )
                .map((slot: any) => slot.time);
            }
          }
        } else if (response && typeof response === 'object' && 'slots' in response) {
          const slots = response.slots;
          if (Array.isArray(slots)) {
            this.horariosDisponibles = slots
              .filter(
                (slot: any) =>
                  slot && typeof slot === 'object' && 'time' in slot
              )
              .map((slot: any) => slot.time);
          }
        }

        this.isLoadingHorarios = false;

        if (this.horariosDisponibles.length === 0) {
          alert(
            'No hay horarios disponibles para esta fecha. Por favor selecciona otra fecha.'
          );
        }
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error al cargar horarios:', error);
        this.isLoadingHorarios = false;
        this.horariosDisponibles = [];
        alert(
          'Error al cargar los horarios disponibles. Por favor intenta con otra fecha.'
        );
      },
    });
  }

  finalizarAgendamiento(): void {
    console.log('✅ [Agendar RTM] Finalizando agendamiento desde paso 4');

    this.step5Form.patchValue({
      placa: this.form.get('placa')?.value,
      nombre: this.form.get('nombre')?.value,
      telefono: this.form.get('telefono')?.value,
      tipoDocumento: this.form.get('tipoDocumento')?.value,
      numeroDocumento: this.form.get('numeroDocumento')?.value,
    });

    this.step5Form.patchValue(
      { fechaRevision: '', horaRevision: '' },
      { emitEvent: false }
    );

    this.horariosDisponibles = [];
    this.isLoadingHorarios = false;

    this.currentStep = 5;
    this.step5SubStep = 1;
  }

  canAdvanceToStep5_2(): boolean {
    const fechaControl = this.step5Form.get('fechaRevision');
    const horaControl = this.step5Form.get('horaRevision');
    return !!(fechaControl?.value && horaControl?.value);
  }

  advanceToStep5_2(): void {
    if (!this.canAdvanceToStep5_2()) {
      alert('Por favor selecciona fecha y hora');
      return;
    }
    this.step5SubStep = 2;
  }

  advanceToStep5_3(): void {
    this.step5SubStep = 3;
  }

  goBackStep5(): void {
    if (this.step5SubStep > 1) this.step5SubStep--;
    else this.goBack();
  }

  continuarAlPago(): void {
    console.log('💰 [Agendar RTM] Iniciando cotización final');

    if (this.step5Form.invalid) {
      this.step5Form.markAllAsTouched();
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    this.isLoading = true;

    const fechaValue = this.step5Form.get('fechaRevision')?.value;
    const [year, month, day] = fechaValue.split('-').map(Number);

    const baseRequest: CotizarRequest = {
      cliente: 'pagina_web',
      placa:
        this.step5Form.get('placa')?.value || this.form.get('placa')?.value,
      fecha_agenda: { day, month, year },
      franja: this.step5Form.get('horaRevision')?.value,
      ciudad: this.selectedCiudad!.name,
      sede: (this.selectedSede as any).name,
      celular: this.step5Form.get('telefono')?.value,
      correo: this.step5Form.get('correo')?.value,
      nombres: this.step5Form.get('nombre')?.value,
      from_flow: 'rtm',
      tipo_identificacion:
        this.step5Form.get('tipoDocumento')?.value ||
        this.form.get('tipoDocumento')?.value,
      identificacion:
        this.step5Form.get('numeroDocumento')?.value ||
        this.form.get('numeroDocumento')?.value,
    };

    const cotizarRequest: any = {
      ...baseRequest,
      ...this.buildCotizarExtra(),
    };

    this.rtmApiService.cotizar(cotizarRequest).subscribe({
      next: (response) => {
        this.cotizacionData = response;
        this.precioEstimado = (response as any).price || 0;

        this.isLoading = false;
        this.currentStep = 6;
        this.step6SubStep = 1;
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error en cotización final:', error);
        this.isLoading = false;
        alert('Error al procesar la cotización. Por favor intenta nuevamente.');
      },
    });
  }

  aplicarCodigo(): void {
    if (!this.codigoPromocional.trim()) {
      alert('Por favor ingresa un código promocional');
      return;
    }

    if (this.codigoPromocional.toUpperCase() === 'AUTOMAS10') {
      alert('¡Código aplicado! Descuento del 10%');
    } else {
      alert('Código inválido');
    }
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

    console.log('📅 [Agendar RTM] Confirmando agendamiento');
    this.isLoading = true;

    const fechaValue = this.step5Form.get('fechaRevision')?.value;
    const [year, month, day] = fechaValue.split('-').map(Number);

    const agendarRequest: AgendarRequest = {
      cliente: 'pagina_web',
      placa:
        this.step5Form.get('placa')?.value || this.form.get('placa')?.value,
      fecha_agenda: { day, month, year },
      franja: this.step5Form.get('horaRevision')?.value,
      ciudad: this.selectedCiudad!.name,
      sede: (this.selectedSede as any).name,
      celular: this.step5Form.get('telefono')?.value,
      correo: this.step5Form.get('correo')?.value,
      nombres: this.step5Form.get('nombre')?.value,
      from_flow: 'rtm',
      tipo_identificacion:
        this.step5Form.get('tipoDocumento')?.value ||
        this.form.get('tipoDocumento')?.value,
      identificacion:
        this.step5Form.get('numeroDocumento')?.value ||
        this.form.get('numeroDocumento')?.value,
    };

    this.rtmApiService.agendar(agendarRequest).subscribe({
      next: (response) => {
        this.agendamientoData = response;

        const servicioLabel = this.construirServicioLabel(response);

        const pagoRequest: GenerarLinkPagoRequest = {
          proyecto: 'pagina_web',
          medio_pago: 'mercadopago',
          servicio_label: servicioLabel,
          valor: (response as any).price || this.precioEstimado,
          placa_vehiculo: agendarRequest.placa,
          sede: null,
          servicio_tipovehiculo: null,
          urls: {
            success: `${window.location.origin}/pago-exitoso`,
            failure: `${window.location.origin}/pago-fallido`,
            pending: `${window.location.origin}/pago-pendiente`,
          },
        };

        this.pagosApiService.generarLinkPago(pagoRequest).subscribe({
          next: (pagoResponse) => {
            if ((pagoResponse as any).payment_link) {
              localStorage.setItem(
                'ultimo_pago_id',
                (pagoResponse as any).pago_id
              );
              localStorage.setItem(
                'ultimo_codigo_reserva',
                (response as any).codeBooking
              );
              window.location.href = (pagoResponse as any).payment_link;
            } else {
              this.isLoading = false;
              alert(
                'Error: No se pudo generar el link de pago. Por favor intenta nuevamente.'
              );
            }
          },
          error: (error) => {
            console.error('❌ [Agendar RTM] Error al generar link de pago:', error);
            this.isLoading = false;
            alert('Error al generar el link de pago. Por favor intenta nuevamente.');
          },
        });
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error en agendamiento:', error);
        this.isLoading = false;
        alert('Error al confirmar el agendamiento. Por favor intenta nuevamente.');
      },
    });
  }

  private construirServicioLabel(agendamientoData: any): string {
    const placa = agendamientoData?.placa || this.form.get('placa')?.value || '';
    const sede = agendamientoData?.sede || (this.selectedSede as any)?.name || '';
    const codigoReserva = agendamientoData?.codeBooking || '';

    const nombreServicio = this.getNombreServicioCompleto();
    const partes = [
      sede,
      nombreServicio,
      placa ? `placa ${placa}` : '',
      codigoReserva ? `(Reserva número ${codigoReserva})` : '',
    ].filter(Boolean);

    return partes.join(' ');
  }

  goBack(): void {
    if (this.currentStep === 2 && this.step2SubStep > 1) {
      this.step2SubStep--;
    } else if (this.currentStep === 4 && this.step4SubStep > 1) {
      this.step4SubStep--;
    } else if (this.currentStep === 5 && this.step5SubStep > 1) {
      this.step5SubStep--;
    } else if (this.currentStep === 6 && this.step6SubStep > 1) {
      this.step6SubStep--;
    } else if (this.currentStep > 1) {
      this.currentStep--;
      this.step2SubStep = 1;
      this.step4SubStep = 1;
      this.step5SubStep = 1;
      this.step6SubStep = 1;
    }
  }

  extractHorarios(description: string): string {
    if (!description) return 'No disponible';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description;
    const textoPlano = tempDiv.textContent || tempDiv.innerText || '';

    const match = textoPlano.match(/@Horarios?:\s*([^@]+)/i);

    if (match && match[1]) {
      return match[1].trim().replace(/&nbsp;/g, ' ');
    }

    return 'No disponible';
  }

  extractMapaUrl(description: string): string {
    if (!description) return '';

    const urlPatterns = [
      /https?:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9]+/,
      /https?:\/\/goo\.gl\/maps\/[A-Za-z0-9]+/,
      /https?:\/\/www\.google\.com\/maps[^\s<"]+/,
    ];

    for (const pattern of urlPatterns) {
      const match = description.match(pattern);
      if (match) return match[0];
    }

    return '';
  }

  extractDireccion(description: string): string {
    if (!description) return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description;
    const textoPlano = tempDiv.textContent || tempDiv.innerText || '';

    const match = textoPlano.match(/@Direcci[oó]n?:\s*([^@]+)/i);

    if (match && match[1]) return match[1].trim();

    return '';
  }

  extractTelefono(description: string): string {
    if (!description) return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description;
    const textoPlano = tempDiv.textContent || tempDiv.innerText || '';

    const match = textoPlano.match(/@Tel[eé]fono?:\s*([^@]+)/i);

    if (match && match[1]) return match[1].trim();

    return '';
  }

  getTodayDate(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  getFechaTransaccion(): string {
    const fecha = this.step5Form.get('fechaRevision')?.value;
    const hora = this.step5Form.get('horaRevision')?.value;
    if (!fecha || !hora) return '';

    const date = new Date(fecha + 'T00:00:00');
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    const año = date.getFullYear();

    return `${dia} de ${mes} de ${año} a las ${hora}`;
  }

  getPrecioTotal(): number {
    return (this.cotizacionData as any)?.price || this.precioEstimado || 0;
  }

  getCodigoReserva(): string {
    return (this.agendamientoData as any)?.codeBooking || '';
  }

  openConditions(): void {
    alert('Condiciones del servicio...');
  }

  getNombreServicioCompleto(): string {
    const base = 'Revisión Técnico-Mecánica';

    const claseRaw = (
      this.datosRunt?.clase_vehiculo ||
      this.vehicleData.clasificacion ||
      ''
    )
      .toString()
      .trim();

    const claseUpper = claseRaw.toUpperCase();

    let tipoVehiculo = '';
    if (claseUpper.includes('MOTO')) tipoVehiculo = 'moto';
    else if (
      claseUpper.includes('CAMION') ||
      claseUpper.includes('CAMIÓN') ||
      claseUpper.includes('BUS') ||
      claseUpper.includes('TRACTO') ||
      claseUpper.includes('VOLQUETA') ||
      claseUpper.includes('MAQUINARIA') ||
      claseUpper.includes('PESADO')
    ) {
      tipoVehiculo = 'vehículo pesado';
    } else if (claseRaw) {
      tipoVehiculo = 'vehículo liviano';
    }

    const tipoServicio = (
      this.datosRunt?.tipo_servicio ||
      (this as any)?.cotizacionData?.tipoServicioNombre ||
      (this as any)?.cotizacionData?.tipoServicio ||
      this.vehicleData.tipoServicio ||
      ''
    )
      .toString()
      .trim();

    const anio =
      (this.vehicleData.year || '').toString().trim() ||
      (this.datosRunt?.modelo || '').toString().trim();

    const tipoCombustible = (
      this.datosRunt?.tipo_combustible ||
      this.vehicleData.tipoCombustible ||
      ''
    )
      .toString()
      .trim();

    const partes = [
      base,
      tipoVehiculo,
      tipoServicio ? tipoServicio.toLowerCase() : '',
      anio ? `año ${anio}` : '',
      tipoCombustible ? tipoCombustible.toLowerCase() : '',
    ].filter(Boolean);

    return partes.join(' ');
  }
}