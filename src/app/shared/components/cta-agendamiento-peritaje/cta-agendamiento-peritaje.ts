import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AgendarPeritajeComponent } from '../../../core/modals/agendar-peritaje/agendar-peritaje';
import { SedesTarifasPeritajeComponent } from '../../../core/modals/sedes-tarifas-peritaje/sedes-tarifas-peritaje';

@Component({
  selector: 'app-cta-agendamiento-peritaje',
  standalone: true,
  imports: [CommonModule, AgendarPeritajeComponent, SedesTarifasPeritajeComponent],
  templateUrl: './cta-agendamiento-peritaje.html',
  styleUrl: './cta-agendamiento-peritaje.scss',
})
export class CtaAgendamientoPeritajeComponent {
  @Input() kicker = 'Compra con total confianza';
  @Input() title = 'El Vehículo de tus sueños';

  @Input()
  description =
    'Encuentra el Peritaje Perfecto. Solo Necesitamos la Placa. Verificaremos las opciones disponibles para tu vehículo. Compara precios y beneficios de forma sencilla y elige el peritaje a tu medida.';

  @Input()
  note =
    '*Recuerda que la información que te solicitamos es la del propietario del vehículo.';

  @Input() imageSrc = 'assets/peritaje.png';
  @Input() imageAlt = 'Vehículos';

  isPeritajeModalOpen = false;
  isSedesTarifasModalOpen = false;

  openPeritajeModal(event: Event): void {
    event.preventDefault();
    this.isPeritajeModalOpen = true;
  }

  closePeritajeModal(): void {
    this.isPeritajeModalOpen = false;
  }

  openSedesTarifasModal(event: Event): void {
    event.preventDefault();
    this.isSedesTarifasModalOpen = true;
  }

  closeSedesTarifasModal(): void {
    this.isSedesTarifasModalOpen = false;
  }
}