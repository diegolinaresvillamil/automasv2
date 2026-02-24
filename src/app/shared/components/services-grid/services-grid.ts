import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type ServiceCard = {
  title: string;
  imgNormal: string; // assets/...-n.png
  imgHover: string;  // assets/...-h.png
  href?: string;     // opcional si quieres link
};

@Component({
  selector: 'app-services-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services-grid.html',
  styleUrl: './services-grid.scss',
})
export class ServicesGridComponent {
  @Input() title = 'Nuestros Servicios';
  @Input({ required: true }) cards: ServiceCard[] = [];
}
