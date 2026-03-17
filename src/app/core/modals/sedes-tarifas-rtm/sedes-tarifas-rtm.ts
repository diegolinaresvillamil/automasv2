import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Pipe, PipeTransform } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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

interface Sede {
  id: number;
  nombre: string;
  direccion: string;
  horario: string;
  lat: number;
  lng: number;
  telefono?: string;

  services?: (string | number)[];
  __matched_service_id?: number;
  __matched_service_name?: string;
}

interface Ciudad {
  id: number;
  nombre: string;
  providers?: number[];
}

@Component({
  selector: 'app-sedes-tarifas-rtm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SanitizeUrlPipe],
  templateUrl: './sedes-tarifas-rtm.html',
  styleUrl: './sedes-tarifas-rtm.scss',
})
export class SedesTarifasRtmComponent {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Input() imageSrc = 'assets/servicio.png';
  @Input() imageAlt = 'Servicio';

  private readonly IS_LOCALHOST = window.location.hostname === 'localhost';

  private readonly API_CONFIG = {
    rtm: this.IS_LOCALHOST ? '/rtm-api' : '/api-proxy.php?api=rtm',
    runt: this.IS_LOCALHOST ? '/runt-api' : '/api-proxy.php?api=runt',
    pagos: this.IS_LOCALHOST ? '/pagos-api' : '/api-proxy.php?api=pagos',
  };

  private readonly TOKENS = {
    rtm: '2c632158202204ad6d69a9e0e2735a26268ebc3d',
    runt: '4a5f2cb839a47fd6e5ed25a22ba8fdc3dd64da12',
    pagos: '6a306298eb5158f81a37663fefcd13369f99f7aa',
  };

  currentStep = 3;
  isLoading = false;
  isActivatingLocation = false;
  step4SubStep = 1;
  step5SubStep = 1;
  step6SubStep = 1;

  selectedCiudad = 'Bogotá';
  selectedTipoVehiculo = '';
  selectedSubtipo = '';
  selectedSede: Sede | null = null;
  precioEstimado = 0;
  precioReal = 0;
  showSubtipos = false;
  tipoVehiculoNombre = '';

  ciudades: Ciudad[] = [];
  sedes: Sede[] = [];
  sedesPaginadas: Sede[] = [];
  horariosDisponibles: string[] = [];

  userLat: number = 4.7110;
  userLng: number = -74.0721;

  sedesCurrentPage = 1;
  sedesPerPage = 2;
  totalSedesPages = 1;

  codigoPromocional = '';
  aceptaCondicionesPago = false;
  invoiceId: number | null = null;
  codeBooking = '';
  agendamientoResponse: any = null;

  cotizacionResponse: any = null;
  modeloVehiculoCache = '';

  isLoadingSedes = false;

  private sedesRequestSeq = 0;

  tiposVehiculo = [
    { id: 'livianos', nombre: 'Livianos', iconSvg: 'livianos.svg' },
    { id: 'motocicletas', nombre: 'Motocicletas', iconSvg: 'motocicletas.svg' },
    { id: 'Pesados', nombre: 'Pesados', iconSvg: 'pesado2.png' },
    { id: 'cuadriciclos', nombre: 'Cuadriciclos', iconSvg: 'cuadriciclos.svg' },
    { id: 'ciclomotores', nombre: 'Ciclomotores', iconSvg: 'ciclomotores.svg' },
  ];

  subtiposLivianos = [
    { id: 'particular', nombre: 'Particular' },
    { id: 'publico', nombre: 'Público' },
    { id: 'electrico', nombre: 'Eléctrico' },
  ];

  docTypes = [
    { value: 'CC', label: 'Cédula de ciudadanía' },
    { value: 'CE', label: 'Cédula de extranjería' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PAS', label: 'Pasaporte' },
  ];

  step5Form: FormGroup;

  constructor() {
    console.log('🌍 Entorno:', this.IS_LOCALHOST ? 'DESARROLLO' : 'PRODUCCIÓN');
    console.log('🔗 URLs configuradas:', this.API_CONFIG);

    this.step5Form = this.fb.group({
      fechaRevision: ['', Validators.required],
      horaRevision: ['', Validators.required],
      placa: ['', [Validators.required, Validators.minLength(6)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      tipoDocumento: ['CC'],
      numeroDocumento: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      aceptaTerminos: [false, Validators.requiredTrue],
    });

    this.setupFormValidations();
    this.cargarCiudades();
  }

  private getHeaders(api: 'rtm' | 'runt' | 'pagos'): HttpHeaders {
    if (!this.IS_LOCALHOST) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Token ${this.TOKENS[api]}` });
  }

  private setupFormValidations(): void {
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
      if (cleaned !== v) this.step5Form.get('numeroDocumento')?.setValue(cleaned, { emitEvent: false });
    });

    this.step5Form.get('tipoDocumento')?.valueChanges.subscribe(() => {
      this.step5Form.get('numeroDocumento')?.setValue('');
    });

    this.step5Form.get('fechaRevision')?.valueChanges.subscribe(() => {
      this.cargarHorariosDisponibles();
    });
  }

  private getDocMaxLen(type: DocType): number {
    const lens: Record<DocType, number> = { CC: 10, CE: 12, NIT: 10, PAS: 12 };
    return lens[type] || 12;
  }

  // ========================================
  // HELPERS GENERALES
  // ========================================
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

    return this.IS_LOCALHOST
      ? `${this.API_CONFIG.rtm}/wh/transversal/ejecutar-accion/?${query}`
      : `${this.API_CONFIG.rtm}&path=wh/transversal/ejecutar-accion/&${query}`;
  }

  private obtenerTodasLasPaginasAccion(
    action: string,
    params: Record<string, string | number | boolean | null | undefined>,
    onComplete: (items: any[]) => void,
    onError: (err: any) => void
  ): void {
    const headers = this.getHeaders('rtm');
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

  private resolveTipoVehiculoToken(): string {
    const t = (this.selectedTipoVehiculo || '').toString().trim();
    if (t === 'livianos') return 'liviano';
    if (t === 'motocicletas') return 'moto';
    if (t === 'Pesados' || t === 'pesados') return 'pesado';
    if (t === 'cuadriciclos') return 'cuadriciclo';
    if (t === 'ciclomotores') return 'ciclomotor';
    return '';
  }

  private resolveTipoServicioToken(): string {
    if (this.selectedTipoVehiculo !== 'livianos') return '';
    const s = (this.selectedSubtipo || '').toString().trim().toLowerCase();
    if (s.includes('public')) return 'publico';
    if (s.includes('partic')) return 'particular';
    if (s.includes('elect')) return 'electrico';
    return s;
  }

  private sedePareceRTM(raw: any): boolean {
    const name = this.normalizeText(raw?.name || raw?.nombre || '');
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

  private mapApiSedeToSede(s: any): Sede {
    return {
      id: s.id,
      nombre: s.name,
      direccion: this.extraerDireccion(s.description) || s.address1 || 'Dirección no disponible',
      horario: this.extraerHorario(s.description),
      lat: parseFloat(s.lat) || 4.6097,
      lng: parseFloat(s.lng) || -74.0817,
      telefono: s.phone || '',
      services: (s.services || []) as any[],
    };
  }

  private getObtenerServiciosUrl(id: number): string {
    return this.getActionUrl('obtener_servicios', { id });
  }

  private getObtenerProveedorPorIdUrl(id: number): string {
    return this.getActionUrl('obtener_proveedores', {
      id,
      ciudad: this.selectedCiudad,
      from_flow: 'rtm',
    });
  }

  private obtenerServicioById(id: number) {
    const url = this.getObtenerServiciosUrl(id);
    const headers = this.getHeaders('rtm');
    return this.http.post<any>(url, {}, { headers });
  }

  private obtenerProveedorById(id: number) {
    const url = this.getObtenerProveedorPorIdUrl(id);
    const headers = this.getHeaders('rtm');
    return this.http.post<any>(url, {}, { headers });
  }

  private servicioNameMatchesSeleccion(serviceName: string): boolean {
    const name = this.normalizeText(serviceName);

    const isRTM =
      (name.includes('revision') || name.includes('revis')) &&
      (name.includes('tecnico') || name.includes('mecanica') || name.includes('mecanic'));
    if (!isRTM) return false;

    const tipoVeh = this.resolveTipoVehiculoToken();
    const tipoServ = this.resolveTipoServicioToken();

    const hintsPesado = ['vehiculo pesado', 'pesado', 'camion', 'camión', 'bus', 'tracto', 'volqueta'];
    const hintsMoto = ['moto', 'motoc'];
    const hintsLiviano = ['vehiculo liviano', 'liviano'];
    const hintsCuadri = ['cuadric', 'cuatri'];
    const hintsCiclo = ['ciclomotor', 'ciclo motor', 'ciclomot'];

    const nameIsPesado = this.includesAny(name, hintsPesado);
    const nameIsMoto = this.includesAny(name, hintsMoto);
    const nameIsLiviano = this.includesAny(name, hintsLiviano);
    const nameIsCuadri = this.includesAny(name, hintsCuadri);
    const nameIsCiclo = this.includesAny(name, hintsCiclo);

    const nameHasTipo = nameIsPesado || nameIsMoto || nameIsLiviano || nameIsCuadri || nameIsCiclo;

    const matchesTipo =
      !nameHasTipo ||
      (tipoVeh === 'pesado' && nameIsPesado) ||
      (tipoVeh === 'moto' && nameIsMoto) ||
      (tipoVeh === 'liviano' && nameIsLiviano) ||
      (tipoVeh === 'cuadriciclo' && nameIsCuadri) ||
      (tipoVeh === 'ciclomotor' && nameIsCiclo);

    if (!matchesTipo) return false;

    const nameMentionsServicio = this.includesAny(name, ['public', 'partic', 'elect']);
    if (nameMentionsServicio && tipoServ) {
      if (tipoServ === 'publico' && !name.includes('public')) return false;
      if (tipoServ === 'particular' && !name.includes('partic')) return false;
      if (tipoServ === 'electrico' && !name.includes('elect')) return false;
    }

    return true;
  }

  private filtrarSedesPorServiciosExactos(sedes: Sede[]) {
    const lookups = sedes.map((sede) => {
      const ids: (string | number)[] = ((sede as any)?.services || []) as any[];

      if (!ids || ids.length === 0) return of({ sede, ok: false });

      const idsToCheck = ids.slice(0, 25).map((x) => Number(x)).filter(Boolean);

      const calls = idsToCheck.map((id) =>
        this.obtenerServicioById(id).pipe(
          map((resp: any) => {
            const item = resp?.data?.[0] || resp?.data || resp;
            const name = item?.name || '';
            return { id, name };
          }),
          catchError(() => of({ id, name: '' }))
        )
      );

      return forkJoin(calls).pipe(
        map((servicesInfo: any[]) => {
          const match = servicesInfo.find((x) => x?.name && this.servicioNameMatchesSeleccion(x.name));
          if (match) {
            (sede as any).__matched_service_id = match.id;
            (sede as any).__matched_service_name = match.name;
            return { sede, ok: true };
          }
          return { sede, ok: false };
        }),
        catchError(() => of({ sede, ok: false }))
      );
    });

    if (lookups.length === 0) return of([] as Sede[]);

    return forkJoin(lookups).pipe(
      map((results: any[]) => results.filter((r) => r.ok).map((r) => r.sede))
    );
  }

  // ========================================
  // GEOLOCALIZACIÓN
  // ========================================
  activateLocation(): void {
    this.isActivatingLocation = true;

    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      this.isActivatingLocation = false;
      this.selectManually();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        console.log('📍 Ubicación obtenida:', { lat, lng });
        this.detectarCiudad(lat, lng);
      },
      (error) => {
        console.error('❌ Error de geolocalización:', error);
        alert('No se pudo obtener tu ubicación. Por favor selecciona manualmente.');
        this.isActivatingLocation = false;
        this.selectManually();
      }
    );
  }

  private detectarCiudad(lat: number, lng: number): void {
    const ciudadesCoordenadas = [
      { nombre: 'Bogotá', lat: 4.7110, lng: -74.0721, radio: 50 },
      { nombre: 'Medellín', lat: 6.2442, lng: -75.5812, radio: 40 },
      { nombre: 'Cali', lat: 3.4516, lng: -76.5320, radio: 40 },
      { nombre: 'Barranquilla', lat: 10.9639, lng: -74.7964, radio: 30 },
      { nombre: 'Cartagena', lat: 10.3910, lng: -75.4794, radio: 30 },
    ];

    let ciudadMasCercana = 'Bogotá';
    let menorDistancia = Infinity;

    ciudadesCoordenadas.forEach((ciudad) => {
      const distancia = this.calcularDistancia(lat, lng, ciudad.lat, ciudad.lng);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        ciudadMasCercana = ciudad.nombre;
      }
    });

    console.log(`📍 Ciudad detectada: ${ciudadMasCercana} (${menorDistancia.toFixed(2)} km)`);

    this.userLat = lat;
    this.userLng = lng;

    this.selectedCiudad = ciudadMasCercana;
    this.isActivatingLocation = false;
    this.currentStep = 4;
    this.step4SubStep = 1;
  }

  private calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  selectManually(): void {
    this.currentStep = 4;
    this.step4SubStep = 1;
  }

  // ========================================
  // API: CARGAR CIUDADES
  // ========================================
  private cargarCiudades(): void {
    this.obtenerTodasLasPaginasAccion(
      'obtener_ciudades',
      {},
      (items) => {
        console.log('📍 Ciudades obtenidas (todas las páginas):', items);

        const ciudadesMap = new Map<number, Ciudad>();

        items.forEach((c: any) => {
          const id = Number(c.id);
          if (!id) return;

          const providers = Array.isArray(c.providers)
            ? c.providers.map((p: any) => Number(p)).filter(Boolean)
            : [];

          if (!ciudadesMap.has(id)) {
            ciudadesMap.set(id, {
              id,
              nombre: c.name,
              providers: providers,
            });
          } else {
            const actual = ciudadesMap.get(id)!;
            actual.providers = Array.from(
              new Set([...(actual.providers || []), ...providers])
            );
          }
        });

        this.ciudades = Array.from(ciudadesMap.values());

        console.log('✅ Ciudades procesadas:', this.ciudades);
      },
      (err) => {
        console.error('❌ Error al cargar ciudades:', err);
      }
    );
  }

  private extraerHorario(description: string): string {
    if (!description) return 'Consultar horarios';
    const cleanText = description.replace(/<[^>]*>/g, '');
    const horarioMatch = cleanText.match(/@Horarios:\s*(.+?)@/);
    if (horarioMatch && horarioMatch[1]) return horarioMatch[1].trim().replace(/&nbsp;/g, ' ');
    return 'Consultar horarios';
  }

  private extraerDireccion(description: string): string {
    if (!description) return 'Dirección no disponible';
    const cleanText = description.replace(/<[^>]*>/g, '');
    const direccionMatch = cleanText.match(/@Dirección:\s*(.+?)@/);
    if (direccionMatch && direccionMatch[1]) return direccionMatch[1].trim().replace(/&nbsp;/g, ' ');
    return 'Dirección no disponible';
  }

  // ========================================
  // CARGAR SEDES RTM CORRECTAS
  // ========================================
  private cargarSedesFallbackPorCiudad(reqId: number): void {
    this.obtenerTodasLasPaginasAccion(
      'obtener_proveedores',
      {
        ciudad: this.selectedCiudad,
        from_flow: 'rtm',
      },
      (items) => {
        if (reqId !== this.sedesRequestSeq) return;

        const raw = items.filter((s: any) => s?.is_visible);

        const mapped = raw.map((s: any) => this.mapApiSedeToSede(s));
        this.procesarSedesCargadas(reqId, mapped);
      },
      (err) => {
        if (reqId !== this.sedesRequestSeq) return;
        console.error('❌ Error al cargar sedes por ciudad:', err);
        this.isLoadingSedes = false;
        this.sedes = [];
        this.updateSedesPaginadas();
        this.step4SubStep = 2;
        alert('Error al cargar sedes. Por favor intenta nuevamente.');
      }
    );
  }

  private procesarSedesCargadas(reqId: number, sedesEntrada: Sede[]): void {
    if (reqId !== this.sedesRequestSeq) return;

    const dedupMap = new Map<number, Sede>();
    sedesEntrada.forEach((s) => {
      if (!dedupMap.has(s.id)) dedupMap.set(s.id, s);
    });

    let all = Array.from(dedupMap.values());

    const withServices = all.filter((s) => Array.isArray(s.services) && s.services.length > 0);
    const withoutServices = all.filter((s) => !Array.isArray(s.services) || s.services.length === 0);

    if (withServices.length > 0) {
      all = [
        ...withServices.filter((s) => this.normalizeText(s.nombre) !== 'tramites vehiculares' && this.normalizeText(s.nombre) !== 'trámites vehiculares'),
        ...withoutServices.filter((s) => this.sedePareceRTM({ name: s.nombre })),
      ];
    } else {
      all = all.filter((s) => this.sedePareceRTM({ name: s.nombre }));
    }

    const hasAnyServices = all.some((x) => Array.isArray(x.services) && x.services.length > 0);

    console.log('✅ [SEDES] Procesadas:', {
      total: sedesEntrada.length,
      luegoDedup: dedupMap.size,
      luegoFiltroRTM: all.length,
      hasAnyServices,
    });

    if (!hasAnyServices) {
      const finalList = [...all].sort((a, b) => {
        const distA = this.calcularDistancia(this.userLat, this.userLng, a.lat, a.lng);
        const distB = this.calcularDistancia(this.userLat, this.userLng, b.lat, b.lng);
        return distA - distB;
      });

      this.sedes = finalList;
      this.isLoadingSedes = false;
      this.updateSedesPaginadas();
      this.step4SubStep = 2;

      if (this.sedes.length === 0) {
        alert('No encontramos sedes RTM habilitadas para esta ciudad.');
      }
      return;
    }

    this.filtrarSedesPorServiciosExactos(all).subscribe({
      next: (filtradas: Sede[]) => {
        if (reqId !== this.sedesRequestSeq) return;

        const finalList = [...filtradas].sort((a, b) => {
          const distA = this.calcularDistancia(this.userLat, this.userLng, a.lat, a.lng);
          const distB = this.calcularDistancia(this.userLat, this.userLng, b.lat, b.lng);
          return distA - distB;
        });

        this.sedes = finalList;
        this.isLoadingSedes = false;
        this.updateSedesPaginadas();
        this.step4SubStep = 2;

        console.log('✅ [SEDES] Filtradas:', this.sedes.length, this.sedes);

        if (this.sedes.length === 0) {
          alert('No encontramos sedes habilitadas para ese tipo de vehículo en esta ciudad.');
        }
      },
      error: (e) => {
        if (reqId !== this.sedesRequestSeq) return;
        console.error('❌ Error filtrando sedes por servicios:', e);
        this.isLoadingSedes = false;
        this.sedes = [];
        this.updateSedesPaginadas();
        this.step4SubStep = 2;
        alert('Error consultando servicios de sedes. Intenta nuevamente.');
      },
    });
  }

  private cargarSedes(): void {
    const reqId = ++this.sedesRequestSeq;

    this.isLoadingSedes = true;
    this.sedes = [];
    this.sedesPaginadas = [];
    this.totalSedesPages = 1;

    console.log('🏢 [SEDES] Cargando sedes RTM para:', {
      ciudad: this.selectedCiudad,
      tipo: this.selectedTipoVehiculo,
      subtipo: this.selectedSubtipo,
      reqId,
    });

    const ciudadSeleccionada = this.ciudades.find(
      (c) => this.normalizeCityName(c.nombre) === this.normalizeCityName(this.selectedCiudad)
    );

    const providerIds = Array.from(
      new Set((ciudadSeleccionada?.providers || []).map((id) => Number(id)).filter(Boolean))
    );

    console.log('🏢 [SEDES] Providers detectados para ciudad:', providerIds);

    if (!providerIds.length) {
      console.warn('⚠️ No se encontraron provider IDs en la ciudad, usando fallback por ciudad paginado.');
      this.cargarSedesFallbackPorCiudad(reqId);
      return;
    }

    const lookups = providerIds.map((id) =>
      this.obtenerProveedorById(id).pipe(
        map((resp: any) => {
          const data = Array.isArray(resp?.data) ? resp.data : resp?.data ? [resp.data] : [];
          return data;
        }),
        catchError((err) => {
          console.warn(`⚠️ Error obteniendo proveedor ${id}:`, err);
          return of([]);
        })
      )
    );

    forkJoin(lookups).subscribe({
      next: (results: any[][]) => {
        if (reqId !== this.sedesRequestSeq) return;

        const rawProviders = results
          .flat()
          .filter((s: any) => s && s.is_visible);

        const mapped = rawProviders.map((s: any) => this.mapApiSedeToSede(s));

        console.log('🏢 [SEDES] Proveedores consultados por ID:', rawProviders);

        if (!mapped.length) {
          console.warn('⚠️ Consulta por providers no devolvió sedes visibles, usando fallback por ciudad paginado.');
          this.cargarSedesFallbackPorCiudad(reqId);
          return;
        }

        this.procesarSedesCargadas(reqId, mapped);
      },
      error: (err) => {
        if (reqId !== this.sedesRequestSeq) return;
        console.error('❌ Error cargando sedes por provider IDs:', err);
        this.cargarSedesFallbackPorCiudad(reqId);
      },
    });
  }

  // ========================================
  // BOTÓN CONTINUAR
  // ========================================
  getContinuarStep4Label(): string {
    return this.isLoadingSedes ? 'Cargando sedes...' : 'Continuar';
  }

  private obtenerPrecioBase(): number {
    const tipo = this.selectedTipoVehiculo;
    const subtipo = this.selectedSubtipo;

    if (tipo === 'livianos') {
      if (subtipo === 'electrico') return 243897;
      return 326379;
    }

    if (tipo === 'motocicletas') return 227231;
    if (tipo === 'Pesados' || tipo === 'pesados') return 503900;
    if (tipo === 'ciclomotores') return 166163;

    return 326379;
  }

  // ========================================
  // MODELO/AÑO DESDE RESPUESTA
  // ========================================
  private extraerModeloDesdeRespuesta(resp: any): string {
    if (!resp) return '';

    const direct =
      resp?.modelo ??
      resp?.model ??
      resp?.anio ??
      resp?.año ??
      resp?.year ??
      resp?.vehicle_year ??
      resp?.model_year ??
      resp?.anio_modelo ??
      resp?.year_model ??
      '';

    if (direct !== null && direct !== undefined && `${direct}`.trim() !== '') return `${direct}`.trim();

    const data =
      resp?.data?.modelo ??
      resp?.data?.model ??
      resp?.data?.anio ??
      resp?.data?.year ??
      resp?.data?.anio_modelo ??
      resp?.data?.vehicle_year ??
      '';

    if (data !== null && data !== undefined && `${data}`.trim() !== '') return `${data}`.trim();

    const nested =
      resp?.runt?.anio_modelo ??
      resp?.runt?.year ??
      resp?.vehicle?.year ??
      resp?.vehicle?.model_year ??
      resp?.info?.year ??
      resp?.info?.anio_modelo ??
      '';

    if (nested !== null && nested !== undefined && `${nested}`.trim() !== '') return `${nested}`.trim();

    return '';
  }

  private getServicioLabelData(): any {
    const formData = this.step5Form.value;
    const sedeNombre = this.agendamientoResponse?.sede || this.selectedSede?.nombre || '';

    const modelo =
      (this.agendamientoResponse?.modelo ||
        this.cotizacionResponse?.modelo ||
        this.extraerModeloDesdeRespuesta(this.agendamientoResponse) ||
        this.extraerModeloDesdeRespuesta(this.cotizacionResponse) ||
        this.modeloVehiculoCache ||
        '')
        .toString()
        .trim();

    const placa = (formData.placa || '').toString().toUpperCase().trim();

    return {
      ...(this.cotizacionResponse || {}),
      ...(this.agendamientoResponse || {}),
      placa,
      sede: sedeNombre,
      modelo,
      codeBooking: (this.codeBooking || this.agendamientoResponse?.codeBooking || '').toString().trim(),
    };
  }

  private construirServicioLabel(agendamientoData: any): string {
    const placa = (agendamientoData?.placa || '').toString().trim();

    const tipoVehiculo =
      (agendamientoData?.tipo_vehiculo || this.getTipoVehiculoParaLabel() || 'vehículo liviano')
        .toString()
        .trim();

    const tipoServicio =
      (agendamientoData?.tipo_servicio || this.getTipoServicioParaLabel() || 'Particular')
        .toString()
        .trim();

    const sede = (agendamientoData?.sede || this.selectedSede?.nombre || '').toString().trim();
    const modelo = (agendamientoData?.modelo || '').toString().trim();

    const codigoReserva = (agendamientoData?.codeBooking || this.codeBooking || '').toString().trim();

    const partes = [
      placa,
      `Revisión Técnico Mecánica ${tipoVehiculo} ${tipoServicio} ${sede.split(' ').pop() || ''}`,
      modelo ? `${modelo}` : '',
      codigoReserva ? `(Reserva número ${codigoReserva})` : '',
      sede,
    ].filter((parte: string) => !!parte);

    return partes.join(' ,');
  }

  private getTipoVehiculoParaLabel(): string {
    const tipo = (this.selectedTipoVehiculo || '').toString();
    if (tipo === 'livianos') return 'vehículo liviano';
    if (tipo === 'motocicletas') return 'moto';
    if (tipo === 'Pesados' || tipo === 'pesados') return 'vehículo pesado';
    if (tipo === 'cuadriciclos') return 'cuadriciclo';
    if (tipo === 'ciclomotores') return 'ciclomotor';
    return '';
  }

  private getTipoServicioParaLabel(): string {
    if (this.selectedTipoVehiculo === 'livianos') {
      const subtipo = this.subtiposLivianos.find((s) => s.id === this.selectedSubtipo);
      return (subtipo?.nombre || 'Particular').toString().trim();
    }
    return 'Particular';
  }

  getServicioLabelPago(): string {
    const data = this.getServicioLabelData();
    return this.construirServicioLabel(data);
  }

  // ========================================
  // CARGAR HORARIOS / COTIZAR / AGENDAR / PAGAR
  // ========================================
  private consultarYCotizar(): void {
    const formData = this.step5Form.value;

    if (!formData.placa || !formData.numeroDocumento) {
      console.warn('⚠️ Faltan datos para cotizar');
      return;
    }

    this.isLoading = true;

    const body = {
      cliente: 'pagina_web',
      placa: formData.placa.toUpperCase(),
      fecha_agenda: this.parseFechaAgenda(formData.fechaRevision),
      franja: formData.horaRevision,
      ciudad: this.selectedCiudad,
      sede: this.selectedSede?.nombre || '',
      celular: formData.telefono,
      correo: formData.correo,
      nombres: formData.nombre,
      from_flow: 'rtm',
      tipo_identificacion: formData.tipoDocumento,
      identificacion: formData.numeroDocumento,
    };

    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.rtm}/wh/transversal/ejecutar-accion/?accion=cotizar`
      : `${this.API_CONFIG.rtm}&path=wh/transversal/ejecutar-accion/&accion=cotizar`;

    const headers = this.getHeaders('rtm');

    console.log('💰 Consultando precio real (con RUNT)...', body);

    this.http.post<any>(url, body, { headers }).subscribe({
      next: (response) => {
        console.log('✅ Precio real obtenido:', response);

        this.cotizacionResponse = response;

        const modelo = this.extraerModeloDesdeRespuesta(response);
        if (modelo) this.modeloVehiculoCache = modelo;

        this.precioReal = response.price || this.precioEstimado;

        this.isLoading = false;
        this.currentStep = 6;
      },
      error: (err) => {
        console.error('❌ Error al cotizar:', err);
        this.isLoading = false;
        this.precioReal = this.precioEstimado;
        this.currentStep = 6;
        alert('No se pudo consultar el vehículo, pero puedes continuar con el precio estimado.');
      },
    });
  }

  private cargarHorariosDisponibles(): void {
    const fecha = this.step5Form.get('fechaRevision')?.value;
    const sede = this.selectedSede;
    if (!fecha || !sede) return;

    const body = { sede: sede.nombre, fecha_agenda: this.parseFechaAgenda(fecha), from_flow: 'rtm' };

    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.rtm}/wh/transversal/ejecutar-accion/?accion=obtener_horarios_disponibles`
      : `${this.API_CONFIG.rtm}&path=wh/transversal/ejecutar-accion/&accion=obtener_horarios_disponibles`;

    const headers = this.getHeaders('rtm');

    this.http.post<any>(url, body, { headers }).subscribe({
      next: (response) => {
        if (Array.isArray(response) && response.length > 0) {
          const slots = response[0].slots || [];
          this.horariosDisponibles = slots.map((s: any) => s.time);
        }
      },
      error: () => {
        this.horariosDisponibles = [
          '07:00 AM','08:00 AM','09:00 AM','10:00 AM','11:00 AM',
          '12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM',
        ];
      },
    });
  }

  private agendar(): void {
    const formData = this.step5Form.value;

    const body = {
      cliente: 'pagina_web',
      placa: formData.placa.toUpperCase(),
      fecha_agenda: this.parseFechaAgenda(formData.fechaRevision),
      franja: formData.horaRevision,
      ciudad: this.selectedCiudad,
      sede: this.selectedSede?.nombre || '',
      celular: formData.telefono,
      correo: formData.correo,
      nombres: formData.nombre,
      from_flow: 'rtm',
      tipo_identificacion: formData.tipoDocumento,
      identificacion: formData.numeroDocumento,
    };

    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.rtm}/wh/transversal/ejecutar-accion/?accion=agendar`
      : `${this.API_CONFIG.rtm}&path=wh/transversal/ejecutar-accion/&accion=agendar`;

    const headers = this.getHeaders('rtm');

    this.http.post<any>(url, body, { headers }).subscribe({
      next: (response) => {
        this.agendamientoResponse = response;
        this.invoiceId = response.invoice_id;
        this.codeBooking = response.codeBooking;

        const modelo = this.extraerModeloDesdeRespuesta(response);
        if (modelo) this.modeloVehiculoCache = modelo;

        this.generarLinkPago();
      },
      error: () => {
        this.isLoading = false;
        alert('Error al agendar. Por favor intenta nuevamente.');
      },
    });
  }

  private generarLinkPago(): void {
    const data = this.getServicioLabelData();
    const servicioLabel = this.construirServicioLabel(data);

    const body = {
      proyecto: 'pagina_web',
      medio_pago: 'mercadopago',
      servicio_label: servicioLabel,
      valor: this.precioReal,
      placa_vehiculo: (data?.placa || '').toString().toUpperCase(),
      sede: null,
      servicio_tipovehiculo: null,
      urls: {
        success: `${window.location.origin}/pago-exitoso`,
        failure: `${window.location.origin}/pago-fallido`,
        pending: `${window.location.origin}/pago-pendiente`,
      },
    };

    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.pagos}/pagos/generar-link/`
      : `${this.API_CONFIG.pagos}&path=pagos/generar-link/`;

    const headers = this.getHeaders('pagos');

    this.http.post<any>(url, body, { headers }).subscribe({
      next: (response) => {
        this.guardarDatosReserva();

        if (response.payment_link) window.location.href = response.payment_link;
        else {
          this.isLoading = false;
          alert('Error al generar el link de pago');
        }
      },
      error: () => {
        this.isLoading = false;
        alert('Error al generar el link de pago. Verifica los datos.');
      },
    });
  }

  private guardarDatosReserva(): void {
    const formData = this.step5Form.value;

    const reserva = {
      tipo: 'rtm',
      invoiceId: this.invoiceId,
      codeBooking: this.codeBooking,
      monto: this.precioReal,
      nombreServicio: `Revisión Técnico Mecánica - ${this.tipoVehiculoNombre}`,
      sede: this.agendamientoResponse?.sede || this.selectedSede?.nombre || '',
      fecha: this.getFechaTransaccion(),
      placa: (formData.placa || '').toString().toUpperCase(),
      modelo: this.modeloVehiculoCache,
    };

    localStorage.setItem('ultima_reserva', JSON.stringify(reserva));
  }

  private parseFechaAgenda(fecha: string): any {
    const [year, month, day] = fecha.split('-');
    return { day: parseInt(day, 10), month: parseInt(month, 10), year: parseInt(year, 10) };
  }

  // ========================================
  // NAVEGACIÓN
  // ========================================
  onClose(): void {
    this.currentStep = 3;
    this.step4SubStep = 1;
    this.step5SubStep = 1;
    this.step6SubStep = 1;
    this.isLoading = false;
    this.isLoadingSedes = false;

    this.selectedTipoVehiculo = '';
    this.selectedSubtipo = '';
    this.selectedSede = null;
    this.showSubtipos = false;
    this.tipoVehiculoNombre = '';
    this.codigoPromocional = '';
    this.aceptaCondicionesPago = false;
    this.precioEstimado = 0;
    this.precioReal = 0;

    this.agendamientoResponse = null;
    this.cotizacionResponse = null;
    this.modeloVehiculoCache = '';

    this.sedes = [];
    this.sedesPaginadas = [];
    this.totalSedesPages = 1;
    this.sedesCurrentPage = 1;

    this.step5Form.reset({ tipoDocumento: 'CC', aceptaTerminos: false });
    this.close.emit();
  }

  onBackdropClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.onClose();
  }

  goBack(): void {
    if (this.currentStep === 6 && this.step6SubStep > 1) {
      this.step6SubStep--;
    } else if (this.currentStep === 4 && this.step4SubStep > 1) {
      this.step4SubStep--;
    } else if (this.currentStep > 3) {
      this.currentStep--;
      this.step4SubStep = 1;
      this.step6SubStep = 1;
    }
  }

  selectTipoVehiculo(tipo: string): void {
    this.selectedTipoVehiculo = tipo;
    this.showSubtipos = tipo === 'livianos';
    if (tipo !== 'livianos') this.selectedSubtipo = '';
    this.updateTipoVehiculoNombre();
  }

  selectSubtipo(subtipo: string): void {
    this.selectedSubtipo = subtipo;
    this.updateTipoVehiculoNombre();
  }

  updateTipoVehiculoNombre(): void {
    const tipo = this.tiposVehiculo.find((t) => t.id === this.selectedTipoVehiculo);
    if (!tipo) {
      this.tipoVehiculoNombre = '';
      return;
    }
    if (this.selectedSubtipo) {
      const subtipo = this.subtiposLivianos.find((s) => s.id === this.selectedSubtipo);
      this.tipoVehiculoNombre = `${tipo.nombre} ${subtipo?.nombre || ''}`;
    } else {
      this.tipoVehiculoNombre = tipo.nombre;
    }
  }

  canAdvanceStep4_1(): boolean {
    return this.selectedTipoVehiculo === 'livianos'
      ? this.selectedSubtipo !== ''
      : this.selectedTipoVehiculo !== '';
  }

  advanceToStep4_2(): void {
    if (!this.canAdvanceStep4_1()) return;
    if (this.isLoadingSedes) return;

    this.sedesCurrentPage = 1;
    this.cargarSedes();
  }

  selectSede(sede: Sede): void {
    this.selectedSede = sede;
    this.precioEstimado = this.obtenerPrecioBase();
    this.step4SubStep = 3;
  }

  openGoogleMaps(sede: Sede): void {
    window.open(`https://www.google.com/maps/search/?api=1&query=${sede.lat},${sede.lng}`, '_blank');
  }

  finalizarAgendamiento(): void {
    this.currentStep = 5;
    this.step5SubStep = 1;
  }

  updateSedesPaginadas(): void {
    const start = (this.sedesCurrentPage - 1) * this.sedesPerPage;
    this.sedesPaginadas = this.sedes.slice(start, start + this.sedesPerPage);
    this.totalSedesPages = Math.ceil(this.sedes.length / this.sedesPerPage) || 1;
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

  goToSedesPage(page: number): void {
    if (page >= 1 && page <= this.totalSedesPages) {
      this.sedesCurrentPage = page;
      this.updateSedesPaginadas();
    }
  }

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
    this.consultarYCotizar();
  }

  getFechaTransaccion(): string {
    const fecha = this.step5Form.get('fechaRevision')?.value || '';
    const hora = this.step5Form.get('horaRevision')?.value || '';
    if (!fecha || !hora) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year} - ${hora}`;
  }

  aplicarCodigo(): void {
    alert('Funcionalidad de códigos promocionales en desarrollo');
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
    this.isLoading = true;
    this.agendar();
  }

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