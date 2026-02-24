import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type LogoItem = {
  src: string;
  alt: string;
  href?: string; // opcional por si algún logo lleva link
};

@Component({
  selector: 'app-logos-carrousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logos-carrousel.html',
  styleUrl: './logos-carrousel.scss',
})
export class LogosCarrouselComponent {
  @Input() title = 'Nuestros aliados';

  /** Logos (mínimo 2 recomendado para que el loop se vea bien) */
  @Input({ required: true }) logos: LogoItem[] = [];

  /** Velocidad del loop (segundos). Menor = más rápido */
  @Input() durationSec = 18;

  /** Lista duplicada para loop infinito */
  get loopLogos(): LogoItem[] {
    const list = this.logos ?? [];
    return [...list, ...list];
  }

  trackByIndex = (i: number) => i;
}
