import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ente-control',
  standalone: true,
  templateUrl: './ente-control.html',
  styleUrl: './ente-control.scss',
})
export class EnteControlComponent {
  @Input() title = 'Ente de Control';
  @Input() logoSrc = 'assets/vigilado.png';
  @Input() logoAlt = 'Vigilado SuperTransporte';
}
