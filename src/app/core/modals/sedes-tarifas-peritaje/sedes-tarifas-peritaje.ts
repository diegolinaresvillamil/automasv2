import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
}

@Component({
  selector: 'app-sedes-tarifas-peritaje',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SanitizeUrlPipe],
  templateUrl: './sedes-tarifas-peritaje.html',
  styleUrl: './sedes-tarifas-peritaje.scss',
})
export class SedesTarifasPeritajeComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Input() imageSrc = 'assets/peritaje.png';
  @Input() imageAlt = 'Peritaje';

  currentStep = 3;
  isLoading = false;
  isActivatingLocation = false;
  step4SubStep = 1;
  step4_2_SubStep = 1; // ========== NUEVO: CONTROL SUB-PASOS MOBILE PASO 4.2 ==========
  step5SubStep = 1;
  step6SubStep = 1;
  sedesCurrentPage = 1;
  sedesPerPage = 2;
  selectedCiudad = 'Bogotá';
  selectedTipoVehiculo = '';
  selectedCombo = 'diamante';
  selectedSede: Sede | null = null;
  showSubtipos = false;
  tipoVehiculoNombre = '';
  selectedSubtipo = '';
  sedesPaginadas: Sede[] = [];
  totalSedesPages = 1;
  codigoPromocional = '';
  aceptaCondicionesPago = false;

  horariosDisponibles = [
    '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM'
  ];

  ciudades = [
    { id: 1, nombre: 'Bogotá' },
    { id: 2, nombre: 'Medellín' },
    { id: 3, nombre: 'Cali' },
    { id: 4, nombre: 'Barranquilla' },
    { id: 5, nombre: 'Cartagena' },
  ];

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

  combos = [
    { id: 'diamante', nombre: 'Diamante' },
    { id: 'oro', nombre: 'Oro' },
    { id: 'plata', nombre: 'Plata' },
    { id: 'domicilio', nombre: 'A Domicilio' }
  ];

  precios: Record<string, Record<string, number>> = {
    'VEHICULOS LIVIANOS': {
      diamante: 502000,
      oro: 380000,
      plata: 250000,
      domicilio: 420000
    },
    'VEHICULOS PESADOS': {
      diamante: 750000,
      oro: 580000,
      plata: 420000,
      domicilio: 650000
    },
    'MOTOCICLETAS URBANA': {
      diamante: 280000,
      oro: 210000,
      plata: 150000,
      domicilio: 250000
    },
    'MOTOCICLETAS SUPERBIKE': {
      diamante: 350000,
      oro: 270000,
      plata: 190000,
      domicilio: 320000
    },
    'ELECTRICOS O HIBRIDOS': {
      diamante: 580000,
      oro: 450000,
      plata: 320000,
      domicilio: 520000
    }
  };

  imagenesCombos: Record<string, Record<string, string>> = {
    'VEHICULOS LIVIANOS': {
      diamante: 'assets/peritaje-liviano-diamante.png',
      oro: 'assets/peritaje-liviano-oro.png',
      plata: 'assets/peritaje-liviano-plata.png',
      domicilio: 'assets/domicilio.png'
    },
    'VEHICULOS PESADOS': {
      diamante: 'assets/pesado-diamante.png',
      oro: 'assets/pesado-oro.png',
      plata: 'assets/pesado-plata.png',
      domicilio: 'assets/domicilio.png'
    },
    'MOTOCICLETAS URBANA': {
      diamante: 'assets/urbana-diamante.png',
      oro: 'assets/urbana-oro.png',
      plata: 'assets/urbana-plata.png',
      domicilio: 'assets/domicilio.png'
    },
    'MOTOCICLETAS SUPERBIKE': {
      diamante: 'assets/moto-diamante.png',
      oro: 'assets/moto-oro.png',
      plata: 'assets/moto-plata.png',
      domicilio: 'assets/domicilio.png'
    },
    'ELECTRICOS O HIBRIDOS': {
      diamante: 'assets/electrico-diamante.png',
      oro: 'assets/electrico-oro.png',
      plata: 'assets/electrico-plata.png',
      domicilio: 'assets/domicilio.png'
    }
  };

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
          'Estimación vida útil de las llantas'
        ]
      },
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El peritaje Para Vehículos Livianos incluye:',
        items: [
          'verificación chasis',
          'verificación carrocería',
          'partes bajas (frenos, dirección, trasmisión)',
          'fugas mecánicas',
          'Estado Tapicería'
        ]
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El peritaje Para Vehículos Livianos incluye:',
        items: [
          'verificación chasis',
          'verificación carrocería',
          'fugas mecánicas'
        ]
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
          'Servicio a domicilio'
        ]
      }
    },
    'VEHICULOS PESADOS': {
      diamante: {
        titulo: 'Combo Diamante',
        descripcion: 'El peritaje Para Vehículos Pesados incluye:',
        items: [
          'verificación chasis reforzado',
          'verificación carrocería pesada',
          'sistema de frenos de aire',
          'suspensión neumática',
          'motor diesel',
          'fugas mecánicas',
          'Estado general'
        ]
      },
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El peritaje Para Vehículos Pesados incluye:',
        items: [
          'verificación chasis',
          'verificación carrocería',
          'sistema de frenos',
          'fugas mecánicas'
        ]
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El peritaje Para Vehículos Pesados incluye:',
        items: [
          'verificación chasis',
          'verificación carrocería básica',
          'fugas evidentes'
        ]
      },
      domicilio: {
        titulo: 'Combo A Domicilio',
        descripcion: 'El peritaje Para Vehículos Pesados incluye:',
        items: [
          'verificación chasis',
          'verificación carrocería',
          'sistema de frenos',
          'fugas mecánicas',
          'Servicio a domicilio'
        ]
      }
    },
    'MOTOCICLETAS URBANA': {
      diamante: {
        titulo: 'Combo Diamante',
        descripcion: 'El peritaje Para Motocicletas Urbanas incluye:',
        items: [
          'verificación chasis',
          'verificación sistema eléctrico',
          'frenos delantero y trasero',
          'suspensión',
          'motor',
          'cadena y piñones',
          'Estado llantas'
        ]
      },
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El peritaje Para Motocicletas Urbanas incluye:',
        items: [
          'verificación chasis',
          'frenos',
          'motor',
          'cadena'
        ]
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El peritaje Para Motocicletas Urbanas incluye:',
        items: [
          'verificación chasis',
          'frenos básicos',
          'motor visual'
        ]
      },
      domicilio: {
        titulo: 'Combo A Domicilio',
        descripcion: 'El peritaje Para Motocicletas Urbanas incluye:',
        items: [
          'verificación chasis',
          'frenos',
          'motor',
          'cadena',
          'Servicio a domicilio'
        ]
      }
    },
    'MOTOCICLETAS SUPERBIKE': {
      diamante: {
        titulo: 'Combo Diamante',
        descripcion: 'El peritaje Para Motocicletas Superbike incluye:',
        items: [
          'verificación chasis alta cilindrada',
          'verificación sistema eléctrico avanzado',
          'frenos ABS',
          'suspensión deportiva',
          'motor de alto rendimiento',
          'cadena reforzada',
          'Estado llantas deportivas',
          'Sistema de inyección'
        ]
      },
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El peritaje Para Motocicletas Superbike incluye:',
        items: [
          'verificación chasis',
          'frenos ABS',
          'motor',
          'cadena',
          'suspensión'
        ]
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El peritaje Para Motocicletas Superbike incluye:',
        items: [
          'verificación chasis',
          'frenos básicos',
          'motor visual'
        ]
      },
      domicilio: {
        titulo: 'Combo A Domicilio',
        descripcion: 'El peritaje Para Motocicletas Superbike incluye:',
        items: [
          'verificación chasis',
          'frenos ABS',
          'motor',
          'cadena',
          'Servicio a domicilio'
        ]
      }
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
          'Estado general batería'
        ]
      },
      oro: {
        titulo: 'Combo Oro',
        descripcion: 'El peritaje Para Vehículos Eléctricos/Híbridos incluye:',
        items: [
          'verificación batería',
          'sistema de carga',
          'motor eléctrico',
          'chasis'
        ]
      },
      plata: {
        titulo: 'Combo Plata',
        descripcion: 'El peritaje Para Vehículos Eléctricos/Híbridos incluye:',
        items: [
          'verificación batería básica',
          'chasis',
          'sistema de carga visual'
        ]
      },
      domicilio: {
        titulo: 'Combo A Domicilio',
        descripcion: 'El peritaje Para Vehículos Eléctricos/Híbridos incluye:',
        items: [
          'verificación batería',
          'sistema de carga',
          'motor eléctrico',
          'chasis',
          'Servicio a domicilio'
        ]
      }
    }
  };

  sedes: Sede[] = [
    { id: 1, nombre: 'AutoMás Peritaje Cll 63', direccion: 'Av Cl 63 # 27-44', horario: 'Lunes a Viernes de 8:00 AM a 5:00 PM Sábados y Domingos de 8:00 AM a 2:00 PM', lat: 4.6841, lng: -74.1433 },
    { id: 2, nombre: 'AutoMás Peritaje Cll 13', direccion: 'Dg 13 # 69-16', horario: 'Lunes a viernes de 7:00 AM a 5:00 PM sábados 7:00 AM a 3:00 PM Domingos de 08:00 AM a 1:00 PM', lat: 4.5981, lng: -74.1058 },
    { id: 3, nombre: 'AutoMás Peritaje Bima', direccion: 'Autopista norte # 232 - 35 centro comercial Bima', horario: 'Lunes a Viernes de 8:00 AM a 5:00 PM y Sábados de 8:00 AM a 2:00 PM', lat: 4.6486, lng: -74.1053 },
    { id: 4, nombre: 'AutoMás Peritaje AV 1 de mayo', direccion: 'Cl 22 sur # 29-33', horario: 'Lunes a viernes de 8:00 AM a 5:00 PM sábados 7:00 AM a 3:00 PM Domingos de 08:00 AM a 1:00 PM', lat: 4.7110, lng: -74.0721 },
  ];

  docTypes = [
    { value: 'CC', label: 'Cédula de ciudadanía' },
    { value: 'CE', label: 'Cédula de extranjería' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PAS', label: 'Pasaporte' },
  ];

  step5Form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.step5Form = this.fb.group({
      fechaRevision: ['', Validators.required],
      horaRevision: ['', Validators.required],
      placa: ['', [Validators.required, Validators.minLength(6)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      tipoDocumento: ['CC'],
      numeroDocumento: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      correoResultado: ['', [Validators.required, Validators.email]],
      nombreResultado: ['', Validators.required],
      aceptaTerminos: [false, Validators.requiredTrue]
    });

    this.updateSedesPaginadas();

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
  }

  get f5() {
    return this.step5Form.controls;
  }

  private getDocMaxLen(type: DocType): number {
    const lens: Record<DocType, number> = { CC: 10, CE: 12, NIT: 10, PAS: 12 };
    return lens[type] || 12;
  }

  onClose(): void {
    this.currentStep = 3;
    this.step4SubStep = 1;
    this.step4_2_SubStep = 1; // ========== NUEVO: RESETEAR SUB-PASO 4.2 ==========
    this.step5SubStep = 1;
    this.step6SubStep = 1;
    this.isLoading = false;
    this.selectedTipoVehiculo = '';
    this.selectedSubtipo = '';
    this.selectedCombo = 'diamante';
    this.selectedSede = null;
    this.showSubtipos = false;
    this.tipoVehiculoNombre = '';
    this.codigoPromocional = '';
    this.aceptaCondicionesPago = false;
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
      if (this.step4SubStep === 2) {
        this.step4_2_SubStep = 1; // ========== NUEVO: RESETEAR AL VOLVER A PASO 4.2 ==========
      }
    } else if (this.currentStep > 3) {
      this.currentStep--;
      this.step4SubStep = 1;
      this.step4_2_SubStep = 1; // ========== NUEVO ==========
      this.step6SubStep = 1;
    }
  }

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

    if (this.selectedTipoVehiculo === 'livianos') {
      if (this.selectedSubtipo === 'particular') {
        this.tipoVehiculoNombre = 'VEHICULOS LIVIANOS';
      } else if (this.selectedSubtipo === 'electrico') {
        this.tipoVehiculoNombre = 'ELECTRICOS O HIBRIDOS';
      } else {
        this.tipoVehiculoNombre = '';
      }
    } else if (this.selectedTipoVehiculo === 'pesados') {
      this.tipoVehiculoNombre = 'VEHICULOS PESADOS';
    } else if (this.selectedTipoVehiculo === 'moto-urbana') {
      this.tipoVehiculoNombre = 'MOTOCICLETAS URBANA';
    } else if (this.selectedTipoVehiculo === 'moto-superbike') {
      this.tipoVehiculoNombre = 'MOTOCICLETAS SUPERBIKE';
    } else {
      this.tipoVehiculoNombre = '';
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
      this.step4_2_SubStep = 1; // ========== NUEVO: RESETEAR SUB-PASO ==========
      this.selectedCombo = 'diamante';
    }
  }

  // ========== NUEVO: MÉTODOS PARA SUB-PASOS MOBILE PASO 4.2 ==========
  advanceToStep4_2_2(): void {
    this.step4_2_SubStep = 2;
  }

  goBackStep4_2(): void {
    if (this.step4_2_SubStep > 1) {
      this.step4_2_SubStep--;
    } else {
      this.step4SubStep = 1;
    }
  }
  // ========== FIN NUEVOS MÉTODOS ==========

  selectCombo(comboId: string): void {
    this.selectedCombo = comboId;
  }

  getPrecioActual(): number {
    const preciosPorTipo = this.precios[this.tipoVehiculoNombre] || {};
    return preciosPorTipo[this.selectedCombo] || 0;
  }

  getImagenActual(): string {
    const imagenesPorTipo = this.imagenesCombos[this.tipoVehiculoNombre] || {};
    return imagenesPorTipo[this.selectedCombo] || 'assets/peritaje.png';
  }

  getComboDescription(): any {
    const descripciones = this.descripcionesCombos[this.tipoVehiculoNombre] || {};
    return descripciones[this.selectedCombo] || { titulo: '', descripcion: '', items: [] };
  }

  getComboNombre(): string {
    const combo = this.combos.find(c => c.id === this.selectedCombo);
    return combo?.nombre || '';
  }

  advanceToStep4_3(): void {
    this.step4SubStep = 3;
    this.sedesCurrentPage = 1;
    this.updateSedesPaginadas();
  }

  selectSede(sede: Sede): void {
    this.selectedSede = sede;
    this.currentStep = 5;
    this.step5SubStep = 1;
  }

  openGoogleMaps(sede: Sede): void {
    window.open(`https://www.google.com/maps/search/?api=1&query=${sede.lat},${sede.lng}`, '_blank');
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

  advanceToStep5_4(): void {
    this.step5SubStep = 4;
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
    
    this.currentStep = 6;
    this.step6SubStep = 1;
  }

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
    
    if (this.codigoPromocional.toUpperCase() === 'AUTOMAS10') {
      alert('¡Código aplicado! 10% de descuento');
    } else {
      alert('Código no válido');
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

    this.isLoading = true;
    
    setTimeout(() => {
      this.isLoading = false;
      this.currentStep = 7;
    }, 1500);
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