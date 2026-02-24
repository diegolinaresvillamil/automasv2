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

@Pipe({
  name: 'sanitizeUrl',
  standalone: true
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
}

interface Ciudad {
  id: number;
  nombre: string;
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

  // 🔧 URLs según entorno
  private readonly IS_LOCALHOST = window.location.hostname === 'localhost';
  
  private readonly API_CONFIG = {
    rtm: this.IS_LOCALHOST 
      ? '/rtm-api'
      : '/api-proxy.php?api=rtm',
    
    runt: this.IS_LOCALHOST 
      ? '/runt-api'
      : '/api-proxy.php?api=runt',
    
    pagos: this.IS_LOCALHOST 
      ? '/pagos-api'
      : '/api-proxy.php?api=pagos'
  };

  // 🔑 Tokens para localhost
  private readonly TOKENS = {
    rtm: '2c632158202204ad6d69a9e0e2735a26268ebc3d',
    runt: '4a5f2cb839a47fd6e5ed25a22ba8fdc3dd64da12',
    pagos: '6a306298eb5158f81a37663fefcd13369f99f7aa'
  };

  // Estado del wizard
  currentStep = 3;
  isLoading = false;
  isActivatingLocation = false;
  step4SubStep = 1;
  step5SubStep = 1;
  step6SubStep = 1;

  // Datos de selección
  selectedCiudad = 'Bogotá';
  selectedTipoVehiculo = '';
  selectedSubtipo = '';
  selectedSede: Sede | null = null;
  precioEstimado = 0;
  precioReal = 0;
  showSubtipos = false;
  tipoVehiculoNombre = '';
  
  // Datos de API
  ciudades: Ciudad[] = [];
  sedes: Sede[] = [];
  sedesPaginadas: Sede[] = [];
  horariosDisponibles: string[] = [];

  // ✅ Ubicación del usuario
  userLat: number = 4.7110; // Bogotá por defecto
  userLng: number = -74.0721;

  // Paginación
  sedesCurrentPage = 1;
  sedesPerPage = 2;
  totalSedesPages = 1;

  // Pago
  codigoPromocional = '';
  aceptaCondicionesPago = false;
  invoiceId: number | null = null;
  codeBooking = '';
  agendamientoResponse: any = null;

  tiposVehiculo = [
    { id: 'cuadriciclos', nombre: 'Cuadriciclos', iconSvg: 'cuadriciclos.svg' },
    { id: 'motocicletas', nombre: 'Motocicletas', iconSvg: 'motocicletas.svg' },
    { id: 'ciclomotores', nombre: 'Ciclomotores', iconSvg: 'ciclomotores.svg' },
    { id: 'livianos', nombre: 'Livianos', iconSvg: 'livianos.svg' },
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
      aceptaTerminos: [false, Validators.requiredTrue]
    });

    this.setupFormValidations();
    this.cargarCiudades();
  }

  // 🔑 Método helper para crear headers
  private getHeaders(api: 'rtm' | 'runt' | 'pagos'): HttpHeaders {
    if (!this.IS_LOCALHOST) {
      return new HttpHeaders();
    }
    
    return new HttpHeaders({
      'Authorization': `Token ${this.TOKENS[api]}`
    });
  }

  private setupFormValidations(): void {
    this.step5Form.get('telefono')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').replace(/[^\d]/g, '').slice(0, 10);
      if (cleaned !== v) {
        this.step5Form.get('telefono')?.setValue(cleaned, { emitEvent: false });
      }
    });

    this.step5Form.get('placa')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (cleaned !== v) {
        this.step5Form.get('placa')?.setValue(cleaned, { emitEvent: false });
      }
    });

    this.step5Form.get('numeroDocumento')?.valueChanges.subscribe((v: string) => {
      const tipo = this.step5Form.get('tipoDocumento')?.value as DocType;
      let cleaned = v || '';
      cleaned = tipo === 'PAS' 
        ? cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '') 
        : cleaned.replace(/[^\d]/g, '');
      cleaned = cleaned.slice(0, this.getDocMaxLen(tipo));
      if (cleaned !== v) {
        this.step5Form.get('numeroDocumento')?.setValue(cleaned, { emitEvent: false });
      }
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
  // 🌍 GEOLOCALIZACIÓN REAL
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

    ciudadesCoordenadas.forEach(ciudad => {
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
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
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
    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.rtm}/wh/transversal/ejecutar-accion/?accion=obtener_ciudades`
      : `${this.API_CONFIG.rtm}&path=wh/transversal/ejecutar-accion/&accion=obtener_ciudades`;

    const headers = this.getHeaders('rtm');

    this.http.post<any>(url, {}, { headers }).subscribe({
      next: (response) => {
        console.log('📍 Ciudades obtenidas:', response);
        
        const ciudadesData = response.data || [];
        this.ciudades = ciudadesData.map((c: any) => ({
          id: c.id,
          nombre: c.name
        }));

        console.log('✅ Ciudades procesadas:', this.ciudades);
      },
      error: (err) => {
        console.error('❌ Error al cargar ciudades:', err);
      }
    });
  }

  // ========================================
  // 🔧 HELPERS PARA EXTRAER DATOS
  // ========================================
  private extraerHorario(description: string): string {
    if (!description) return 'Consultar horarios';
    
    const cleanText = description.replace(/<[^>]*>/g, '');
    const horarioMatch = cleanText.match(/@Horarios:\s*(.+?)@/);
    
    if (horarioMatch && horarioMatch[1]) {
      return horarioMatch[1].trim().replace(/&nbsp;/g, ' ');
    }
    
    return 'Consultar horarios';
  }

  private extraerDireccion(description: string): string {
    if (!description) return 'Dirección no disponible';
    
    const cleanText = description.replace(/<[^>]*>/g, '');
    const direccionMatch = cleanText.match(/@Dirección:\s*(.+?)@/);
    
    if (direccionMatch && direccionMatch[1]) {
      return direccionMatch[1].trim().replace(/&nbsp;/g, ' ');
    }
    
    return 'Dirección no disponible';
  }

  // ========================================
  // API: CARGAR SEDES
  // ========================================
  private cargarSedes(): void {
    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.rtm}/wh/transversal/ejecutar-accion/?accion=obtener_proveedores&ciudad=${this.selectedCiudad}&from_flow=rtm`
      : `${this.API_CONFIG.rtm}&path=wh/transversal/ejecutar-accion/&accion=obtener_proveedores&ciudad=${this.selectedCiudad}&from_flow=rtm`;

    const headers = this.getHeaders('rtm');

    this.http.post<any>(url, {}, { headers }).subscribe({
      next: (response) => {
        console.log('🏢 Sedes obtenidas:', response);
        
        const sedesData = response.data || [];
        this.sedes = sedesData
          .filter((s: any) => s.is_visible)
          .map((s: any) => ({
            id: s.id,
            nombre: s.name,
            direccion: this.extraerDireccion(s.description) || s.address1 || 'Dirección no disponible',
            horario: this.extraerHorario(s.description),
            lat: parseFloat(s.lat) || 4.6097,
            lng: parseFloat(s.lng) || -74.0817,
            telefono: s.phone || ''
          }));

        this.sedes.sort((a, b) => {
          const distA = this.calcularDistancia(this.userLat, this.userLng, a.lat, a.lng);
          const distB = this.calcularDistancia(this.userLat, this.userLng, b.lat, b.lng);
          return distA - distB;
        });

        console.log('✅ Sedes procesadas y ordenadas por proximidad:', this.sedes);
        this.updateSedesPaginadas();
      },
      error: (err) => {
        console.error('❌ Error al cargar sedes:', err);
      }
    });
  }

  // ========================================
  // PRECIO BASE (SIN API)
  // ========================================
  private obtenerClaseVehiculo(): string {
    const tipo = this.selectedTipoVehiculo;
    if (tipo === 'livianos') return 'AUTOMOVIL';
    if (tipo === 'motocicletas') return 'MOTOCICLETA';
    if (tipo === 'cuadriciclos') return 'CUADRICICLO';
    if (tipo === 'ciclomotores') return 'CICLOMOTOR';
    return 'AUTOMOVIL';
  }

  private obtenerPrecioBase(): number {
    const tipo = this.selectedTipoVehiculo;
    const subtipo = this.selectedSubtipo;

    if (tipo === 'livianos') {
      if (subtipo === 'electrico') {
        return 243897;
      }
      return 326379;
    }

    if (tipo === 'motocicletas') {
      return 227231;
    }

    if (tipo === 'ciclomotores') {
      return 166163;
    }

    return 326379;
  }

  // ========================================
  // ✅ API: COTIZAR CON DATOS REALES (RUNT INCLUIDO)
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
      identificacion: formData.numeroDocumento
    };

    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.rtm}/wh/transversal/ejecutar-accion/?accion=cotizar`
      : `${this.API_CONFIG.rtm}&path=wh/transversal/ejecutar-accion/&accion=cotizar`;

    const headers = this.getHeaders('rtm');

    console.log('💰 Consultando precio real (con RUNT)...', body);

    this.http.post<any>(url, body, { headers }).subscribe({
      next: (response) => {
        console.log('✅ Precio real obtenido:', response);
        
        this.precioReal = response.price || this.precioEstimado;
        
        console.log(`💵 Precio real: $${this.precioReal}`);
        
        this.isLoading = false;
        this.currentStep = 6;
      },
      error: (err) => {
        console.error('❌ Error al cotizar:', err);
        this.isLoading = false;
        
        this.precioReal = this.precioEstimado;
        this.currentStep = 6;
        
        alert('No se pudo consultar el vehículo, pero puedes continuar con el precio estimado.');
      }
    });
  }

  // ========================================
  // API: HORARIOS
  // ========================================
  private cargarHorariosDisponibles(): void {
    const fecha = this.step5Form.get('fechaRevision')?.value;
    const sede = this.selectedSede;

    if (!fecha || !sede) return;

    const body = {
      sede: sede.nombre,
      fecha_agenda: this.parseFechaAgenda(fecha),
      from_flow: 'rtm'
    };

    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.rtm}/wh/transversal/ejecutar-accion/?accion=obtener_horarios_disponibles`
      : `${this.API_CONFIG.rtm}&path=wh/transversal/ejecutar-accion/&accion=obtener_horarios_disponibles`;

    const headers = this.getHeaders('rtm');

    this.http.post<any>(url, body, { headers }).subscribe({
      next: (response) => {
        console.log('⏰ Horarios disponibles:', response);
        
        if (Array.isArray(response) && response.length > 0) {
          const slots = response[0].slots || [];
          this.horariosDisponibles = slots.map((s: any) => s.time);
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar horarios:', err);
        this.horariosDisponibles = [
          '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
          '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
        ];
      }
    });
  }

  // ========================================
  // ✅ API: AGENDAR
  // ========================================
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
      identificacion: formData.numeroDocumento
    };

    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.rtm}/wh/transversal/ejecutar-accion/?accion=agendar`
      : `${this.API_CONFIG.rtm}&path=wh/transversal/ejecutar-accion/&accion=agendar`;

    const headers = this.getHeaders('rtm');

    console.log('📅 Agendando...', body);

    this.http.post<any>(url, body, { headers }).subscribe({
      next: (response) => {
        console.log('✅ Agendamiento exitoso:', response);
        
        this.agendamientoResponse = response;
        this.invoiceId = response.invoice_id;
        this.codeBooking = response.codeBooking;
        
        console.log('📦 Datos guardados:', {
          invoiceId: this.invoiceId,
          codeBooking: this.codeBooking,
          sede: response.sede,
          proveedor_sbm_id: response.proveedor_sbm_id
        });
        
        this.generarLinkPago();
      },
      error: (err) => {
        console.error('❌ Error al agendar:', err);
        this.isLoading = false;
        alert('Error al agendar. Por favor intenta nuevamente.');
      }
    });
  }

  // ========================================
  // ✅ API: GENERAR LINK PAGO (SEDE Y TIPO NULL)
  // ========================================
  private generarLinkPago(): void {
    const formData = this.step5Form.value;

    // ✅ Construir servicio_label con todos los detalles
    const sedeNombre = this.agendamientoResponse?.sede || this.selectedSede?.nombre || '';
    const fechaAgenda = this.getFechaTransaccion();
    const servicioLabel = `Agendamiento RTM placa ${formData.placa}, en la sede ${sedeNombre} con agenda ${fechaAgenda}`;

    const body = {
      proyecto: 'pagina_web',
      medio_pago: 'mercadopago',
      servicio_label: servicioLabel,
      valor: this.precioReal,
      placa_vehiculo: formData.placa.toUpperCase(),
      sede: null, // ✅ SIEMPRE NULL
      servicio_tipovehiculo: null, // ✅ SIEMPRE NULL
      urls: {
        success: `${window.location.origin}/pago-exitoso`,
        failure: `${window.location.origin}/pago-fallido`,
        pending: `${window.location.origin}/pago-pendiente`
      }
    };

    const url = this.IS_LOCALHOST
      ? `${this.API_CONFIG.pagos}/pagos/generar-link/`
      : `${this.API_CONFIG.pagos}&path=pagos/generar-link/`;

    const headers = this.getHeaders('pagos');

    console.log('💳 Generando link de pago...', body);

    this.http.post<any>(url, body, { headers }).subscribe({
      next: (response) => {
        console.log('✅ Link de pago generado:', response);
        
        this.guardarDatosReserva();
        
        if (response.payment_link) {
          window.location.href = response.payment_link;
        } else {
          console.error('❌ No se recibió payment_link');
          this.isLoading = false;
          alert('Error al generar el link de pago');
        }
      },
      error: (err) => {
        console.error('❌ Error al generar link de pago:', err);
        console.error('📄 Detalles del error:', err.error);
        this.isLoading = false;
        alert('Error al generar el link de pago. Verifica los datos.');
      }
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
      placa: formData.placa.toUpperCase()
    };

    localStorage.setItem('ultima_reserva', JSON.stringify(reserva));
    console.log('💾 Datos guardados en localStorage:', reserva);
  }

  private parseFechaAgenda(fecha: string): any {
    const [year, month, day] = fecha.split('-');
    return {
      day: parseInt(day, 10),
      month: parseInt(month, 10),
      year: parseInt(year, 10)
    };
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
    const tipo = this.tiposVehiculo.find(t => t.id === this.selectedTipoVehiculo);
    if (!tipo) {
      this.tipoVehiculoNombre = '';
      return;
    }
    if (this.selectedSubtipo) {
      const subtipo = this.subtiposLivianos.find(s => s.id === this.selectedSubtipo);
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
    if (this.canAdvanceStep4_1()) {
      this.step4SubStep = 2;
      this.sedesCurrentPage = 1;
      this.cargarSedes();
    }
  }

  selectSede(sede: Sede): void {
    this.selectedSede = sede;
    this.precioEstimado = this.obtenerPrecioBase();
    console.log('💰 Precio base asignado:', this.precioEstimado);
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
    this.totalSedesPages = Math.ceil(this.sedes.length / this.sedesPerPage);
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
    if (this.canAdvanceToStep5_2()) {
      this.step5SubStep = 2;
    }
  }

  advanceToStep5_3(): void {
    this.step5SubStep = 3;
  }

  goBackStep5(): void {
    if (this.step5SubStep > 1) {
      this.step5SubStep--;
    } else {
      this.goBack();
    }
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