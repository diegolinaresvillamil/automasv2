import { CommonModule } from '@angular/common';
import { Component, HostListener, Input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-cta-certimas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cta-certimas.html',
  styleUrl: './cta-certimas.scss',
})
export class CtaCertimasComponent {
  /** Imagen/logo superior */
  @Input() logoSrc = 'assets/logo-certimas.png';
  @Input() logoAlt = 'CertiMás';

  /** Contenido */
  @Input() title = '¿Cómo Funciona?';
  @Input()
  description =
    'Solo con tu placa podrás conocer el verdadero estado del vehículo que quieres comprar.';

  /** Botón CTA */
  @Input() ctaText = 'Compra Ahora';
  @Input() ctaHref = '#';

  /** Imagen derecha */
  @Input() imageSrc = 'assets/certimas.png';
  @Input() imageAlt = 'CertiMás';

  /** Video (YouTube) para el popup */
  @Input() videoUrl = 'https://www.youtube.com/watch?v=1SiC4T1kLVY';

  isOpen = false;
  safeEmbedUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  openVideo(): void {
    this.isOpen = true;
    const embed = this.toYoutubeEmbed(this.videoUrl);
    this.safeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  closeVideo(): void {
    this.isOpen = false;

    // ✅ Detiene el video limpiando el src
    this.safeEmbedUrl = null;
  }

  onBackdropClick(ev: MouseEvent): void {
    // si clickean fuera del contenido, cerramos
    if ((ev.target as HTMLElement)?.classList?.contains('cta-certimas__modal')) {
      this.closeVideo();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.isOpen) this.closeVideo();
  }

  private toYoutubeEmbed(url: string): string {
    // Soporta:
    // - https://www.youtube.com/watch?v=ID
    // - https://youtu.be/ID
    // - con params (&pp=...)
    let id = '';

    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        id = u.pathname.replace('/', '').trim();
      } else {
        id = u.searchParams.get('v') ?? '';
      }
    } catch {
      // fallback simple si viene raro
      const m = url.match(/v=([^&]+)/);
      id = m?.[1] ?? '';
    }

    // autoplay + mute (para que autoplay funcione más consistente) + playsinline
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0&playsinline=1`;
  }
}
