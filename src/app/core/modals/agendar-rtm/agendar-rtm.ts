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
import { RtmApiService, ObtenerHorariosRequest } from '../../services/rtm-api.service';
import { PagosApiService } from '../../services/pagos-api.service';
import { 
  Ciudad, 
  Proveedor, 
  CotizarRequest, 
  AgendarRequest
} from '../../../shared/models/rtm.models';
import { GenerarLinkPagoRequest } from '../../../shared/models/pagos.models';

type DocType = 'CC' | 'CE' | 'NIT' | 'PAS';

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

  // ========================================
  // VARIABLES DE ESTADO
  // ========================================
  currentStep = 1;
  step2SubStep = 1;
  step4SubStep = 1;
  step5SubStep = 1;
  step6SubStep = 1;
  isLoading = false;
  isActivatingLocation = false;
  isLoadingHorarios = false;
  
  // ========================================
  // ✅ ESTADO DE CARGA PARA SEDES
  // ========================================
  isLoadingSedes = false;
  selectedSedeLoading: number | null = null;
  
  // ========================================
  // DATOS DE LA API
  // ========================================
  ciudades: Ciudad[] = [];
  proveedores: Proveedor[] = [];
  horariosDisponibles: string[] = [];
  selectedCiudad: Ciudad | null = null;
  selectedProveedor: Proveedor | null = null;
  selectedSede: Proveedor | null = null;
  cotizacionData: any = null;
  agendamientoData: any = null;
  
  // ========================================
  // ✅ UBICACIÓN DEL USUARIO (PARA ORDENAR SEDES)
  // ========================================
  userLocation: { lat: number, lng: number } | null = null;
  
  // ========================================
  // ✅ DATOS DEL RUNT
  // ========================================
  datosRunt: {
    clase_vehiculo: string;
    tipo_servicio: string;
    tipo_combustible: string;
    modelo: string;
    fecha_vencimiento_rtm: string | null;
    fromRunt: boolean;
  } | null = null;

  consultaRuntExitosa = false;
  
  // ========================================
  // DATOS DEL VEHÍCULO
  // ========================================
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
    vencimiento: ''
  };

  // ========================================
  // TIPOS DE VEHÍCULO PARA PASO 4
  // ========================================
  tiposVehiculo = [
    { id: 'liviano', nombre: 'Vehículos Livianos' },
    { id: 'moto', nombre: 'Motos' },
    { id: 'pesado', nombre: 'Vehículos Pesados' }
  ];

  subtiposLivianos = [
    { id: 'particular', nombre: 'Particular' },
    { id: 'publico', nombre: 'Público' }
  ];

  selectedTipoVehiculo: string | null = null;
  selectedSubtipo: string | null = null;
  showSubtipos = false;

  // ========================================
  // ✅ PAGINACIÓN SEDES (SEPARADA PC/MOBILE)
  // ========================================
  sedesCurrentPage = 1;
  sedesPerPage = 3;

  sedesDesktopCurrentPage = 1;
  sedesDesktopPerPage = 2;

  // ========================================
  // PRECIOS
  // ========================================
  precioEstimado = 0;
  
  // ========================================
  // VARIABLES DE PAGO
  // ========================================
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

  // ========================================
  // 📍 COORDENADAS REALES DE CIUDADES
  // ========================================
  private coordenadasReales: Record<string, { lat: number, lng: number }> = {
    'Bogotá': { lat: 4.7110, lng: -74.0721 },
    'Medellín': { lat: 6.2476, lng: -75.5658 },
    'Cali': { lat: 3.4516, lng: -76.5320 },
    'Barranquilla': { lat: 10.9639, lng: -74.7964 },
    'Cartagena': { lat: 10.3910, lng: -75.4794 },
    'Barbosa Antioquia': { lat: 6.4386, lng: -75.3314 },
    'Popayán': { lat: 2.4419, lng: -76.6063 },
    'Cajicá': { lat: 4.9186, lng: -74.0267 },
    'Armenia': { lat: 4.5389, lng: -75.6811 },
    'Armenia Quindío': { lat: 4.5389, lng: -75.6811 },
    ' Armenia  Quindío ': { lat: 4.5389, lng: -75.6811 },
    'Neiva': { lat: 2.9273, lng: -75.2819 },
    'El Carmen de Viboral': { lat: 6.0800, lng: -75.3350 }
  };

  constructor(
    private fb: FormBuilder,
    private rtmApiService: RtmApiService,
    private pagosApiService: PagosApiService,
    private sanitizer: DomSanitizer
  ) {
    console.log('🚗 [Agendar RTM] Componente inicializado');
    
    // ========================================
    // FORMULARIO PASO 1
    // ========================================
    this.form = this.fb.group({
      placa: ['', [Validators.required, this.placaValidator.bind(this)]],
      nombre: ['', [Validators.required, this.nombreValidator.bind(this)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      tipoDocumento: ['CC', Validators.required],
      numeroDocumento: ['', Validators.required],
      aceptaDatos: [false, Validators.requiredTrue],
    });

    // ========================================
    // FORMULARIO PASO 5
    // ========================================
    this.step5Form = this.fb.group({
      fechaRevision: ['', Validators.required],
      horaRevision: ['', Validators.required],
      placa: [''],
      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      tipoDocumento: ['CC'],
      numeroDocumento: ['', Validators.required],
      aceptaTerminos: [false, Validators.requiredTrue]
    });

    // ✅ VALUE CHANGES: Cuando cambia la fecha, recargar horarios
    this.step5Form.get('fechaRevision')?.valueChanges.subscribe((fecha) => {
      if (fecha && this.selectedSede) {
        console.log('📅 [Agendar RTM] Fecha cambiada, recargando horarios:', fecha);
        this.cargarHorariosDisponibles(fecha);
      }
    });

    // Value changes handlers
    this.form.get('tipoDocumento')?.valueChanges.subscribe((tipo: DocType) => {
      this.updateDocLabels(tipo);
      this.applyDocRules(tipo);
    });

    this.form.get('placa')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
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
      cleaned = tipo === 'PAS' 
        ? cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '') 
        : cleaned.replace(/[^\d]/g, '');
      cleaned = cleaned.slice(0, this.getDocMaxLen(tipo));
      if (cleaned !== v) {
        this.form.get('numeroDocumento')?.setValue(cleaned, { emitEvent: false });
      }
    });

    this.applyDocRules('CC');
  }

  get f() {
    return this.form.controls;
  }

  // ========================================
  // ✅ COMPUTED PROPERTIES (PAGINACIÓN SEPARADA)
  // ========================================
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
    
    const tipo = this.tiposVehiculo.find(t => t.id === this.selectedTipoVehiculo);
    if (!tipo) return '';
    
    if (this.selectedTipoVehiculo === 'liviano' && this.selectedSubtipo) {
      const subtipo = this.subtiposLivianos.find(s => s.id === this.selectedSubtipo);
      return `${tipo.nombre} - ${subtipo?.nombre || ''}`;
    }
    
    return tipo.nombre;
  }

  // ========================================
  // VALIDADORES
  // ========================================
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
      if (type === 'PAS' && !/^[A-Z0-9]{6,12}$/.test(v.toUpperCase())) return { docPAS: true };
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

  // ========================================
  // SANITIZE URL PARA MAPS
  // ========================================
  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // ========================================
  // FORMATEAR FECHA PARA MOSTRAR
  // ========================================
  formatearFechaVencimiento(fecha: string | null): string {
    if (!fecha) return 'No disponible';
    
    if (fecha.includes('/')) {
      const [dia, mes, año] = fecha.split('/');
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const mesNombre = meses[parseInt(mes) - 1];
      return `${parseInt(dia)} de ${mesNombre} de ${año}`;
    }
    
    return fecha;
  }

  // ========================================
  // CERRAR MODAL
  // ========================================
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
      vencimiento: ''
    };
    
    this.form.reset({ tipoDocumento: 'CC', aceptaDatos: false });
    this.close.emit();
  }

  onBackdropClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.onClose();
  }

  // ========================================
  // PASO 1: SUBMIT FORMULARIO
  // ========================================
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
        
        const data = runtResponse.data || runtResponse;
        
        console.log('📦 [Agendar RTM] Data extraída:', data);
        console.log('📦 [Agendar RTM] revisionRTMActual:', data.revisionRTMActual);
        
        const fechaVencimiento = data.revisionRTMActual?.fecha_vencimiento || null;
        console.log('📅 [Agendar RTM] Fecha de vencimiento extraída:', fechaVencimiento);
        
        this.vehicleData.placa = placa;
        this.vehicleData.marca = data.marca || '';
        this.vehicleData.modelo = data.linea || '';
        this.vehicleData.year = data.modelo || '';
        this.vehicleData.clasificacion = data.claseVehiculo || '';
        this.vehicleData.tipoServicio = data.tipoServicio || '';
        this.vehicleData.tipoCombustible = data.tipoCombustible || '';
        this.vehicleData.vencimiento = fechaVencimiento || 'No disponible';
        
        console.log('🚗 [Agendar RTM] vehicleData actualizado:', this.vehicleData);
        
        this.datosRunt = {
          clase_vehiculo: data.claseVehiculo || '',
          tipo_servicio: data.tipoServicio || '',
          tipo_combustible: data.tipoCombustible || '',
          modelo: data.modelo || '',
          fecha_vencimiento_rtm: fechaVencimiento,
          fromRunt: true
        };
        
        console.log('💾 [Agendar RTM] datosRunt guardado:', this.datosRunt);
        
        this.consultaRuntExitosa = true;
        
        this.rtmApiService.obtenerCiudades().subscribe({
          next: (response) => {
            console.log('✅ [Agendar RTM] Ciudades cargadas');
            this.ciudades = response.data;
            this.isLoading = false;
            this.currentStep = 2;
            this.step2SubStep = 1;
          },
          error: (error) => {
            console.error('❌ [Agendar RTM] Error al cargar ciudades:', error);
            this.isLoading = false;
            alert('Error al cargar las ciudades. Por favor intenta nuevamente.');
          }
        });
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error al consultar RUNT:', error);
        this.isLoading = false;
        alert('Error al consultar los datos del vehículo. Por favor verifica la placa y documento.');
      }
    });
  }

  // ========================================
  // PASO 2: SELECCIONAR CIUDAD Y SEDE
  // ========================================
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
        console.log('✅ [Agendar RTM] Ubicación obtenida:', position.coords);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        this.userLocation = { lat, lng };
        console.log('📍 [Agendar RTM] Ubicación del usuario guardada:', this.userLocation);
        
        const ciudadCercana = this.findClosestCity(lat, lng);
        
        if (ciudadCercana) {
          console.log('📍 [Agendar RTM] Ciudad más cercana:', ciudadCercana.name);
          this.selectedCiudad = ciudadCercana;
          this.isActivatingLocation = false;
          this.currentStep = 4;
          this.step4SubStep = 1;
        } else {
          console.warn('⚠️ [Agendar RTM] No se encontró ciudad cercana');
          alert('No se encontró una ciudad cercana. Por favor selecciona manualmente.');
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
        maximumAge: 0
      }
    );
  }

  // ========================================
  // ✅ BUSCAR CIUDAD MÁS CERCANA (HAVERSINE)
  // ========================================
  private findClosestCity(lat: number, lng: number): Ciudad | null {
    if (!this.ciudades || this.ciudades.length === 0) {
      return null;
    }

    console.log('📍 [Agendar RTM] Buscando ciudad más cercana a:', { lat, lng });

    let closestCity: Ciudad | null = null;
    let minDistance = Infinity;

    this.ciudades.forEach(ciudad => {
      if (!ciudad || !ciudad.name) {
        return;
      }

      let cityLat: number;
      let cityLng: number;
      
      const nombreCiudad = ciudad.name.trim();
      const coordenadasManuales = this.coordenadasReales[nombreCiudad];
      
      if (coordenadasManuales) {
        cityLat = coordenadasManuales.lat;
        cityLng = coordenadasManuales.lng;
        console.log(`📍 [Agendar RTM] ${nombreCiudad}: usando coordenadas manuales`);
      } else {
        cityLat = parseFloat(ciudad.lat || '0');
        cityLng = parseFloat(ciudad.lng || '0');
        console.log(`📍 [Agendar RTM] ${nombreCiudad}: usando coordenadas de API`);
      }
      
      console.log(`📍 [Agendar RTM] Evaluando ${nombreCiudad}:`, { cityLat, cityLng });
      
      const distance = this.calculateDistance(lat, lng, cityLat, cityLng);

      console.log(`📍 [Agendar RTM] ${nombreCiudad} está a ${distance.toFixed(2)} km`);

      if (distance < minDistance) {
        minDistance = distance;
        closestCity = ciudad;
      }
    });

    if (closestCity !== null) {
      console.log(`✅ [Agendar RTM] Ciudad más cercana encontrada (${minDistance.toFixed(2)} km)`);
    }

    return closestCity;
  }

  // ========================================
  // ✅ CALCULAR DISTANCIA USANDO HAVERSINE
  // ========================================
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // ========================================
  // ✅ ORDENAR SEDES POR DISTANCIA AL USUARIO
  // ========================================
  private sortSedesByDistance(): void {
    if (!this.userLocation) {
      console.log('📍 [Agendar RTM] No hay ubicación del usuario, manteniendo orden original');
      return;
    }

    console.log('🔄 [Agendar RTM] Ordenando sedes por distancia al usuario');

    this.proveedores.sort((a, b) => {
      const distA = this.getSedeDistance(a);
      const distB = this.getSedeDistance(b);
      return distA - distB;
    });

    console.log('✅ [Agendar RTM] Sedes ordenadas por cercanía');
  }

  private getSedeDistance(sede: Proveedor): number {
    if (!this.userLocation) return Infinity;

    let sedeLat: number;
    let sedeLng: number;

    if (sede.lat && sede.lng) {
      sedeLat = parseFloat(sede.lat);
      sedeLng = parseFloat(sede.lng);
    } else if (this.selectedCiudad) {
      const coordsCiudad = this.coordenadasReales[this.selectedCiudad.name.trim()];
      if (coordsCiudad) {
        sedeLat = coordsCiudad.lat;
        sedeLng = coordsCiudad.lng;
      } else {
        sedeLat = parseFloat(this.selectedCiudad.lat || '0');
        sedeLng = parseFloat(this.selectedCiudad.lng || '0');
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

  // ========================================
  // PASO 4: TIPO DE VEHÍCULO Y SEDES
  // ========================================
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

  // ========================================
  // ✅ CARGAR SEDES CON INDICADOR DE CARGA
  // ========================================
  advanceToStep4_2(): void {
    if (!this.selectedCiudad) {
      alert('Por favor selecciona una ciudad');
      return;
    }
    
    console.log('🏢 [Agendar RTM] Cargando proveedores para:', this.selectedCiudad.name);
    this.isLoadingSedes = true;

    this.rtmApiService.obtenerProveedores(this.selectedCiudad.name).subscribe({
      next: (response) => {
        console.log('✅ [Agendar RTM] Proveedores cargados:', response.data);
        this.proveedores = response.data;
        
        this.sortSedesByDistance();
        
        this.isLoadingSedes = false;
        this.step4SubStep = 2;
        this.sedesCurrentPage = 1;
        this.sedesDesktopCurrentPage = 1;
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error al cargar proveedores:', error);
        this.isLoadingSedes = false;
        alert('Error al cargar las sedes. Por favor intenta nuevamente.');
      }
    });
  }

  openGoogleMaps(sede: Proveedor): void {
    const mapaUrl = this.extractMapaUrl(sede.description || '');
    
    if (mapaUrl) {
      console.log('🗺️ [Agendar RTM] Abriendo mapa desde description:', mapaUrl);
      window.open(mapaUrl, '_blank');
      return;
    }
    
    if (sede.lat && sede.lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${sede.lat},${sede.lng}`;
      console.log('🗺️ [Agendar RTM] Abriendo mapa con coordenadas:', url);
      window.open(url, '_blank');
      return;
    }
    
    alert('Ubicación no disponible para esta sede');
  }

  prevSedesPage(): void {
    if (this.sedesCurrentPage > 1) {
      this.sedesCurrentPage--;
      console.log('⬅️ [Agendar RTM] Página anterior (mobile):', this.sedesCurrentPage);
    }
  }

  nextSedesPage(): void {
    if (this.sedesCurrentPage < this.totalSedesPages) {
      this.sedesCurrentPage++;
      console.log('➡️ [Agendar RTM] Página siguiente (mobile):', this.sedesCurrentPage);
    }
  }

  prevSedesPageDesktop(): void {
    if (this.sedesDesktopCurrentPage > 1) {
      this.sedesDesktopCurrentPage--;
      console.log('⬅️ [Agendar RTM] Página anterior (desktop):', this.sedesDesktopCurrentPage);
    }
  }

  nextSedesPageDesktop(): void {
    if (this.sedesDesktopCurrentPage < this.totalSedesPagesDesktop) {
      this.sedesDesktopCurrentPage++;
      console.log('➡️ [Agendar RTM] Página siguiente (desktop):', this.sedesDesktopCurrentPage);
    }
  }

  // ========================================
  // ✅ SELECCIONAR SEDE Y OBTENER PRECIO REAL DEL API
  // ========================================
  selectSedeStep4(sede: Proveedor): void {
    console.log('🏢 [Agendar RTM] Sede seleccionada en paso 4:', sede.name);
    this.selectedSede = sede;
    this.selectedProveedor = sede;
    
    this.selectedSedeLoading = sede.id;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = tomorrow.getMonth() + 1;
    const day = tomorrow.getDate();

    const cotizarRequest: CotizarRequest = {
      cliente: 'pagina_web',
      placa: this.form.get('placa')?.value,
      fecha_agenda: { day, month, year },
      franja: '10:00 AM',
      ciudad: this.selectedCiudad!.name,
      sede: sede.name,
      celular: this.form.get('telefono')?.value,
      correo: 'cotizacion@automas.com.co',
      nombres: this.form.get('nombre')?.value,
      from_flow: 'rtm',
      tipo_identificacion: this.form.get('tipoDocumento')?.value,
      identificacion: this.form.get('numeroDocumento')?.value
    };

    console.log('💰 [Agendar RTM] Consultando precio en paso 4:', cotizarRequest);

    this.rtmApiService.cotizar(cotizarRequest).subscribe({
      next: (response) => {
        console.log('✅ [Agendar RTM] Precio obtenido:', response);
        this.precioEstimado = response.price || 0;
        this.cotizacionData = response;
        this.selectedSedeLoading = null;
        this.step4SubStep = 3;
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error al obtener precio:', error);
        this.selectedSedeLoading = null;
        this.precioEstimado = 318493;
        this.step4SubStep = 3;
        alert('No se pudo obtener el precio exacto. Se muestra un valor estimado.');
      }
    });
  }

  // ========================================
  // ✅ CARGAR HORARIOS DISPONIBLES - VERSIÓN FINAL CORREGIDA
  // ========================================
  private cargarHorariosDisponibles(fechaISO: string): void {
    if (!this.selectedSede) {
      console.error('❌ [Agendar RTM] No hay sede seleccionada');
      return;
    }

    const [year, month, day] = fechaISO.split('-').map(Number);

    const request: ObtenerHorariosRequest = {
      sede: this.selectedSede.name,
      fecha_agenda: { day, month, year },
      from_flow: 'rtm'
    };

    console.log('📅 [Agendar RTM] Cargando horarios disponibles:', request);
    this.isLoadingHorarios = true;
    this.step5Form.patchValue({ horaRevision: '' });

    this.rtmApiService.obtenerHorariosDisponibles(request).subscribe({
      next: (response: any) => {
        console.log('✅ [Agendar RTM] ========== RESPUESTA COMPLETA ==========');
        console.log('✅ [Agendar RTM] Tipo:', typeof response);
        console.log('✅ [Agendar RTM] Es Array?:', Array.isArray(response));
        console.log('✅ [Agendar RTM] Respuesta:', response);
        
        this.horariosDisponibles = [];
        
        // ✅ CASO 1: Response es un ARRAY que contiene un objeto con slots
        if (Array.isArray(response) && response.length > 0) {
          console.log('📅 [Agendar RTM] Response es un array con', response.length, 'elementos');
          const firstElement = response[0];
          console.log('📅 [Agendar RTM] Primer elemento:', firstElement);
          
          if (firstElement && typeof firstElement === 'object' && 'slots' in firstElement) {
            console.log('📅 [Agendar RTM] Primer elemento tiene slots');
            const slots = firstElement.slots;
            console.log('📅 [Agendar RTM] Slots:', slots);
            
            if (Array.isArray(slots)) {
              console.log('📅 [Agendar RTM] Slots es un array con', slots.length, 'elementos');
              this.horariosDisponibles = slots
                .filter((slot: any) => slot && typeof slot === 'object' && 'time' in slot)
                .map((slot: any) => slot.time);
            }
          }
        }
        // ✅ CASO 2: Response es un objeto con slots
        else if (response && typeof response === 'object' && 'slots' in response) {
          console.log('📅 [Agendar RTM] Response es un objeto con slots');
          const slots = response.slots;
          if (Array.isArray(slots)) {
            this.horariosDisponibles = slots
              .filter((slot: any) => slot && typeof slot === 'object' && 'time' in slot)
              .map((slot: any) => slot.time);
          }
        }
        
        console.log('✅ [Agendar RTM] Horarios finales:', this.horariosDisponibles);
        console.log('✅ [Agendar RTM] Total:', this.horariosDisponibles.length);
        
        this.isLoadingHorarios = false;
        
        if (this.horariosDisponibles.length === 0) {
          alert('No hay horarios disponibles para esta fecha. Por favor selecciona otra fecha.');
        }
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error al cargar horarios:', error);
        this.isLoadingHorarios = false;
        this.horariosDisponibles = [];
        alert('Error al cargar los horarios disponibles. Por favor intenta con otra fecha.');
      }
    });
  }

finalizarAgendamiento(): void {
  console.log('✅ [Agendar RTM] Finalizando agendamiento desde paso 4');

  this.step5Form.patchValue({
    placa: this.form.get('placa')?.value,
    nombre: this.form.get('nombre')?.value,
    telefono: this.form.get('telefono')?.value,
    tipoDocumento: this.form.get('tipoDocumento')?.value,
    numeroDocumento: this.form.get('numeroDocumento')?.value
  });

  // ✅ IMPORTANTE: NO preseleccionar fecha ni cargar horarios automáticamente
  // (Los horarios se cargarán cuando el usuario elija una fecha)
  this.step5Form.patchValue(
    { fechaRevision: '', horaRevision: '' },
    { emitEvent: false }
  );

  this.horariosDisponibles = [];
  this.isLoadingHorarios = false;

  this.currentStep = 5;
  this.step5SubStep = 1;
}

  // ========================================
  // PASO 5: FORMULARIO FINAL
  // ========================================
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
    
    console.log('➡️ [Agendar RTM] Avanzando a paso 5.2');
    this.step5SubStep = 2;
  }

  advanceToStep5_3(): void {
    console.log('➡️ [Agendar RTM] Avanzando a paso 5.3');
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
    console.log('💰 [Agendar RTM] Iniciando cotización final');
    
    if (this.step5Form.invalid) {
      this.step5Form.markAllAsTouched();
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    this.isLoading = true;

    const fechaValue = this.step5Form.get('fechaRevision')?.value;
    const [year, month, day] = fechaValue.split('-').map(Number);

    const cotizarRequest: CotizarRequest = {
      cliente: 'pagina_web',
      placa: this.step5Form.get('placa')?.value || this.form.get('placa')?.value,
      fecha_agenda: { day, month, year },
      franja: this.step5Form.get('horaRevision')?.value,
      ciudad: this.selectedCiudad!.name,
      sede: this.selectedSede!.name,
      celular: this.step5Form.get('telefono')?.value,
      correo: this.step5Form.get('correo')?.value,
      nombres: this.step5Form.get('nombre')?.value,
      from_flow: 'rtm',
      tipo_identificacion: this.step5Form.get('tipoDocumento')?.value || this.form.get('tipoDocumento')?.value,
      identificacion: this.step5Form.get('numeroDocumento')?.value || this.form.get('numeroDocumento')?.value
    };

    console.log('💰 [Agendar RTM] Request cotización final:', cotizarRequest);

    this.rtmApiService.cotizar(cotizarRequest).subscribe({
      next: (response) => {
        console.log('✅ [Agendar RTM] Cotización final exitosa:', response);
        this.cotizacionData = response;
        
        this.precioEstimado = response.price || 0;
        
        this.isLoading = false;
        this.currentStep = 6;
        this.step6SubStep = 1;
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error en cotización final:', error);
        this.isLoading = false;
        alert('Error al procesar la cotización. Por favor intenta nuevamente.');
      }
    });
  }

  // ========================================
  // PASO 6: PAGO
  // ========================================
  aplicarCodigo(): void {
    if (!this.codigoPromocional.trim()) {
      alert('Por favor ingresa un código promocional');
      return;
    }
    
    console.log('🎟️ [Agendar RTM] Aplicando código:', this.codigoPromocional);
    
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

  // ========================================
  // ✅ CONFIRMAR PAGO CON INTEGRACIÓN MERCADO PAGO
  // ========================================
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
      placa: this.step5Form.get('placa')?.value || this.form.get('placa')?.value,
      fecha_agenda: { day, month, year },
      franja: this.step5Form.get('horaRevision')?.value,
      ciudad: this.selectedCiudad!.name,
      sede: this.selectedSede!.name,
      celular: this.step5Form.get('telefono')?.value,
      correo: this.step5Form.get('correo')?.value,
      nombres: this.step5Form.get('nombre')?.value,
      from_flow: 'rtm',
      tipo_identificacion: this.step5Form.get('tipoDocumento')?.value || this.form.get('tipoDocumento')?.value,
      identificacion: this.step5Form.get('numeroDocumento')?.value || this.form.get('numeroDocumento')?.value
    };

    console.log('📅 [Agendar RTM] Request agendamiento:', agendarRequest);

    // ✅ PASO 1: AGENDAR EN EL SISTEMA
    this.rtmApiService.agendar(agendarRequest).subscribe({
      next: (response) => {
        console.log('✅ [Agendar RTM] Agendamiento exitoso:', response);
        this.agendamientoData = response;
        
        // ✅ PASO 2: CONSTRUIR SERVICIO_LABEL
        const servicioLabel = this.construirServicioLabel(response);
        console.log('📝 [Agendar RTM] Servicio Label:', servicioLabel);
        
        // ✅ PASO 3: GENERAR LINK DE PAGO CON MERCADO PAGO
        const pagoRequest: GenerarLinkPagoRequest = {
  proyecto: 'pagina_web',
  medio_pago: 'mercadopago',
  servicio_label: servicioLabel,
  valor: response.price || this.precioEstimado,
  placa_vehiculo: agendarRequest.placa,
  sede: null,
  servicio_tipovehiculo: null,
  urls: {
    success: `${window.location.origin}/pago-exitoso`,    // ✅ Backticks
    failure: `${window.location.origin}/pago-fallido`,    // ✅ Backticks
    pending: `${window.location.origin}/pago-pendiente`   // ✅ Backticks
  }
};

        console.log('💳 [Agendar RTM] Generando link de pago:', pagoRequest);

        this.pagosApiService.generarLinkPago(pagoRequest).subscribe({
          next: (pagoResponse) => {
            console.log('✅ [Agendar RTM] Link de pago generado:', pagoResponse);
            
            // ✅ PASO 4: REDIRIGIR A MERCADO PAGO
            if (pagoResponse.payment_link) {
              console.log('🔗 [Agendar RTM] Redirigiendo a Mercado Pago:', pagoResponse.payment_link);
              
              // Guardar pago_id por si lo necesitas después
              localStorage.setItem('ultimo_pago_id', pagoResponse.pago_id);
              localStorage.setItem('ultimo_codigo_reserva', response.codeBooking);
              
              // Redirigir a Mercado Pago
              window.location.href = pagoResponse.payment_link;
            } else {
              console.error('❌ [Agendar RTM] No se recibió payment_link');
              this.isLoading = false;
              alert('Error: No se pudo generar el link de pago. Por favor intenta nuevamente.');
            }
          },
          error: (error) => {
            console.error('❌ [Agendar RTM] Error al generar link de pago:', error);
            this.isLoading = false;
            alert('Error al generar el link de pago. Por favor intenta nuevamente.');
          }
        });
      },
      error: (error) => {
        console.error('❌ [Agendar RTM] Error en agendamiento:', error);
        this.isLoading = false;
        alert('Error al confirmar el agendamiento. Por favor intenta nuevamente.');
      }
    });
  }

  // ========================================
  // ✅ CONSTRUIR SERVICIO LABEL PARA MERCADO PAGO
  // ========================================
  private construirServicioLabel(agendamientoData: any): string {
    const placa = agendamientoData.placa || '';
    const tipoVehiculo = agendamientoData.tipo_vehiculo || 'vehículo liviano';
    const tipoServicio = agendamientoData.tipo_servicio || 'Particular';
    const sede = agendamientoData.sede || '';
    const modelo = agendamientoData.modelo || '';
    const codigoReserva = agendamientoData.codeBooking || '';
    
    // Construir el label según el formato especificado
    // Ejemplo: "GHK468 ,Revisión Técnico Mecánica vehículo liviano Particular Cll 134 ,Modelo Anterior 2008 particular (Reserva número 080836p3jq) ,CDA AutoMás Revisión Técnico Mecánica Cll 134"
    const partes = [
      placa,
      `Revisión Técnico Mecánica ${tipoVehiculo} ${tipoServicio} ${sede.split(' ').pop() || ''}`,
      modelo ? `${modelo}` : '',
      codigoReserva ? `(Reserva número ${codigoReserva})` : '',
      sede
    ].filter(parte => parte); // Eliminar partes vacías
    
    return partes.join(' ,');
  }

  // ========================================
  // NAVEGACIÓN
  // ========================================
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

  // ========================================
  // EXTRACTORES DE HTML
  // ========================================
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
      /https?:\/\/www\.google\.com\/maps[^\s<"]+/
    ];
    
    for (const pattern of urlPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return '';
  }

  extractDireccion(description: string): string {
    if (!description) return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description;
    const textoPlano = tempDiv.textContent || tempDiv.innerText || '';
    
    const match = textoPlano.match(/@Direcci[oó]n?:\s*([^@]+)/i);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return '';
  }

  extractTelefono(description: string): string {
    if (!description) return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description;
    const textoPlano = tempDiv.textContent || tempDiv.innerText || '';
    
    const match = textoPlano.match(/@Tel[eé]fono?:\s*([^@]+)/i);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return '';
  }

  // ========================================
  // HELPERS
  // ========================================
getTodayDate(): string {
  const now = new Date();
  // Ajusta a zona horaria local para evitar que se vaya al día siguiente por UTC
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10); // YYYY-MM-DD
}

  getFechaTransaccion(): string {
    const fecha = this.step5Form.get('fechaRevision')?.value;
    const hora = this.step5Form.get('horaRevision')?.value;
    if (!fecha || !hora) return '';
    
    const date = new Date(fecha + 'T00:00:00');
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    const año = date.getFullYear();
    
    return `${dia} de ${mes} de ${año} a las ${hora}`;
  }

  getPrecioTotal(): number {
    return this.cotizacionData?.price || this.precioEstimado || 0;
  }

  getCodigoReserva(): string {
    return this.agendamientoData?.codeBooking || '';
  }

  openConditions(): void {
    alert('Condiciones del servicio...');
  }

getNombreServicioCompleto(): string {
  const base = 'Revisión Técnico-Mecánica';

  // ✅ Tipo de vehículo desde RUNT (clase del vehículo)
  const claseRaw =
    (this.datosRunt?.clase_vehiculo || this.vehicleData.clasificacion || '').toString().trim();

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

  // ✅ Tipo de servicio desde RUNT (Particular / Público / etc)
  const tipoServicio =
    (this.datosRunt?.tipo_servicio ||
      (this as any)?.cotizacionData?.tipoServicioNombre ||
      (this as any)?.cotizacionData?.tipoServicio ||
      this.vehicleData.tipoServicio ||
      '').toString().trim();

  // ✅ Año / modelo (en tu código year lo estás llenando con data.modelo)
  const anio =
    (this.vehicleData.year || '').toString().trim() ||
    (this.datosRunt?.modelo || '').toString().trim();

  // ✅ Combustible desde RUNT
  const tipoCombustible =
    (this.datosRunt?.tipo_combustible || this.vehicleData.tipoCombustible || '').toString().trim();

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