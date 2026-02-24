import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ad-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ad-banner.html',
  styleUrl: './ad-banner.scss',
})
export class AdBannerComponent {
  @Input({ required: true }) desktopSrc!: string;
  @Input({ required: true }) tabletSrc!: string;
  @Input({ required: true }) mobileSrc!: string;

  @Input() alt = 'Publicidad';
  @Input() href?: string;
}
