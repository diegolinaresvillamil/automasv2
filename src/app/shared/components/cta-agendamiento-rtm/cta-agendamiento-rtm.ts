import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AgendarRtmComponent } from '../../../core/modals/agendar-rtm/agendar-rtm';
import { SedesTarifasRtmComponent } from '../../../core/modals/sedes-tarifas-rtm/sedes-tarifas-rtm';

@Component({
  selector: 'app-cta-agendamiento-rtm',
  standalone: true,
  imports: [CommonModule, AgendarRtmComponent, SedesTarifasRtmComponent],
  templateUrl: './cta-agendamiento-rtm.html',
  styleUrl: './cta-agendamiento-rtm.scss',
})
export class CtaAgendamientoRtmComponent {
  @Input() imageSrc = 'assets/servicio.png';

  // Links (si quieres, luego lo pasamos a routerLink)
  @Input() linkConsultar = '#';
  @Input() linkAgendar = '#';

  // ✅ Control del modal AGENDAR RTM
  openRtm = false;

  // ✅ Control del modal SEDES Y TARIFAS
  openSedesTarifas = false;

  openModal(ev: MouseEvent): void {
    // Evita navegar al href
    ev.preventDefault();
    this.openRtm = true;
  }

  closeModal(): void {
    this.openRtm = false;
  }

  // ✅ Métodos para abrir/cerrar modal de Sedes y Tarifas
  openSedesTarifasModal(ev: MouseEvent): void {
    ev.preventDefault();
    this.openSedesTarifas = true;
  }

  closeSedesTarifasModal(): void {
    this.openSedesTarifas = false;
  }
}