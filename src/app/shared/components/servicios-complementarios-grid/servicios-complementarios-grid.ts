import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type ComplementaryServiceCard = {
  title: string;        // soporta \n
  imageSrc: string;
  href?: string;
  imageAlt?: string;
};

@Component({
  selector: 'app-servicios-complementarios-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './servicios-complementarios-grid.html',
  styleUrl: './servicios-complementarios-grid.scss',
})
export class ServiciosComplementariosGridComponent {
  @Input() title = 'Servicios Complementarios';

  @Input({ required: true })
  cards: ComplementaryServiceCard[] = [];
}
