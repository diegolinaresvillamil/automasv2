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

type DocType = 'CC' | 'CE' | 'NIT' | 'PAS';

interface Tramite {
  id: string;
  nombre: string;
  iconSrc: string;
}

@Component({
  selector: 'app-agendar-tramites',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './agendar-tramites.html',
  styleUrl: './agendar-tramites.scss',
})
export class AgendarTramitesComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  currentStep = 1;
  step2SubStep = 1;
  step3SubStep = 1;
  step4SubStep = 1; // ✅ NUEVO: Sub-pasos paso 4 mobile
  isLoading = false;
  selectedTramite = '';
  codigoPromocional = ''; // ✅ NUEVO
  aceptaCondiciones = false; // ✅ NUEVO

  docTypes = [
    { value: 'CC', label: 'Cédula de ciudadanía' },
    { value: 'CE', label: 'Cédula de extranjería' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PAS', label: 'Pasaporte' },
  ];

  horariosDisponibles = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM'
  ];

tramites: Tramite[] = [
    {
      id: 'matricula',
      nombre: 'Matrícula/Registro',
      iconSrc: 'assets/matricula.svg'
    },
    {
      id: 'traspaso',
      nombre: 'Traspaso',
      iconSrc: 'assets/traspaso.svg'
    },
    {
      id: 'traslado',
      nombre: 'Traslado Matrícula',
      iconSrc: 'assets/traslado.svg'
    },
    {
      id: 'radicado',
      nombre: 'Radicado y Matrícula',
      iconSrc: 'assets/radicado.svg'
    },
    {
      id: 'cambio-color',
      nombre: 'Cambio de color',
      iconSrc: 'assets/color.svg'
    },
    {
      id: 'regrabar-chasis',
      nombre: 'Regrabar Chasis',
      iconSrc: 'assets/chasis.svg'
    },
    {
      id: 'regrabacion-motor',
      nombre: 'Regrabación de Motor',
      iconSrc: 'assets/motor.svg'
    },
    {
      id: 'cambio-servicio',
      nombre: 'Cambio de servicio',
      iconSrc: 'assets/servicio.svg'
    },
    {
      id: 'transformacion',
      nombre: 'Transformación',
      iconSrc: 'assets/transformacion.svg'
    },
    {
      id: 'duplicado',
      nombre: 'Duplicado',
      iconSrc: 'assets/duplicado.svg'
    },
    {
      id: 'levantamiento-prenda',
      nombre: 'Levantamiento Prenda',
      iconSrc: 'assets/prenda.svg'
    },
    {
      id: 'cancelacion',
      nombre: 'Cancelación de Matrícula',
      iconSrc: 'assets/cancelacion.svg'
    }
  ];


  precios: Record<string, number> = {
    'matricula': 80000,
    'traspaso': 80000,
    'traslado': 80000,
    'radicado': 80000,
    'cambio-color': 80000,
    'regrabar-chasis': 80000,
    'regrabacion-motor': 80000,
    'cambio-servicio': 80000,
    'transformacion': 80000,
    'duplicado': 80000,
    'levantamiento-prenda': 80000,
    'cancelacion': 80000
  };

  form: FormGroup;
  step2Form: FormGroup;
  step3Form: FormGroup;

  constructor(private fb: FormBuilder) {
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
      horaTramite: ['', Validators.required]
    });

    this.step3Form = this.fb.group({
      placa: ['', [Validators.required, this.placaValidator.bind(this)]],
      nombreVendedor: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      tipoDocVendedor: ['CC', Validators.required],
      numeroDocVendedor: ['', Validators.required],
      tipoDocComprador: ['', Validators.required],
      numeroDocComprador: ['', Validators.required]
    });

    this.step3Form.get('placa')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (cleaned !== v) {
        this.step3Form.get('placa')?.setValue(cleaned, { emitEvent: false });
      }
    });

    this.form.get('telefono')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').replace(/[^\d]/g, '').slice(0, 10);
      if (cleaned !== v) {
        this.form.get('telefono')?.setValue(cleaned, { emitEvent: false });
      }
    });

    this.step3Form.get('telefono')?.valueChanges.subscribe((v: string) => {
      const cleaned = (v || '').replace(/[^\d]/g, '').slice(0, 10);
      if (cleaned !== v) {
        this.step3Form.get('telefono')?.setValue(cleaned, { emitEvent: false });
      }
    });
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

  selectTramite(tramiteId: string): void {
    this.selectedTramite = tramiteId;
  }

  getSelectedTramiteName(): string {
    const tramite = this.tramites.find(t => t.id === this.selectedTramite);
    return tramite?.nombre || '';
  }

  getSelectedTramiteIconSrc(): string {
    const tramite = this.tramites.find(t => t.id === this.selectedTramite);
    return tramite?.iconSrc || '';
  }

  getPrecioTramite(): number {
    return this.precios[this.selectedTramite] || 0;
  }

  // ✅ NUEVO: Obtener fecha formateada
  getFechaTransaccion(): string {
    const fecha = this.step2Form.get('fechaTramite')?.value;
    const hora = this.step2Form.get('horaTramite')?.value;
    if (!fecha || !hora) return '';
    return `${fecha} - ${hora}`;
  }

  continueToStep2(): void {
    if (this.selectedTramite) {
      this.currentStep = 2;
      this.step2SubStep = 1;
    }
  }

  advanceToStep2_2(): void {
    if (this.step2Form.valid) {
      this.step2SubStep = 2;
    }
  }

  continueToStep3(): void {
    if (this.step2Form.valid) {
      this.currentStep = 3;
      this.step3SubStep = 1;
    }
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
    if (this.canAdvanceToStep3_2()) {
      this.step3SubStep = 2;
    }
  }

  canAdvanceToStep3_3(): boolean {
    return !!(
      this.step3Form.get('tipoDocVendedor')?.valid &&
      this.step3Form.get('numeroDocVendedor')?.valid
    );
  }

  advanceToStep3_3(): void {
    if (this.canAdvanceToStep3_3()) {
      this.step3SubStep = 3;
    }
  }

  canAdvanceToStep3_4(): boolean {
    return !!(
      this.step3Form.get('tipoDocComprador')?.valid &&
      this.step3Form.get('numeroDocComprador')?.valid
    );
  }

  advanceToStep3_4(): void {
    if (this.canAdvanceToStep3_4()) {
      this.step3SubStep = 4;
    }
  }

  // ✅ ACTUALIZADO: Ir al paso 4 (pago)
  confirmarTramite(): void {
    if (this.step3Form.invalid) {
      this.step3Form.markAllAsTouched();
      return;
    }

    this.currentStep = 4;
    this.step4SubStep = 1;
  }

  // ✅ NUEVOS: Métodos paso 4
  aplicarCodigo(): void {
    if (this.codigoPromocional.trim()) {
      alert(`Código "${this.codigoPromocional}" aplicado (simulación)`);
    }
  }

  advanceToStep4_2(): void {
    this.step4SubStep = 2;
  }

  advanceToStep4_3(): void {
    this.step4SubStep = 3;
  }

  confirmarPago(): void {
    if (!this.aceptaCondiciones) {
      alert('Debes aceptar las condiciones del servicio');
      return;
    }

    this.isLoading = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        console.log('💳 Pago confirmado');
        console.log('📋 Datos completos:', {
          tramite: this.selectedTramite,
          fecha: this.step2Form.value,
          datos: this.step3Form.value,
          codigo: this.codigoPromocional
        });
        
        this.isLoading = false;
        this.currentStep = 5; // Confirmación final
      });
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        console.log('📋 Datos del formulario:', this.form.value);
        console.log('📋 Trámite seleccionado:', this.selectedTramite);
        console.log('📋 Fecha y hora:', this.step2Form.value);
        
        this.isLoading = false;
        this.currentStep = 5;
      });
    });
  }

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    this.form.reset({ tipoDocumento: 'CC', aceptaDatos: false });
    this.step2Form.reset();
    this.step3Form.reset({ tipoDocVendedor: 'CC', tipoDocComprador: '' });
    this.close.emit();
  }

  onBackdropClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.onClose();
  }
}