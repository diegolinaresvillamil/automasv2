import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
// ✅ IMPORTAR LA MODAL AQUÍ
import { AgendarTramitesComponent } from '../../../core/modals/agendar-tramites/agendar-tramites';

export type PreliqCard = {
  title: string;
  subtitle: string;
  description?: string;
  icon?: 'search' | 'file' | 'none';
  href?: string;
};

@Component({
  selector: 'app-preliquidacion-tramites',
  standalone: true,
  imports: [CommonModule, AgendarTramitesComponent], // ✅ AGREGAR AQUÍ
  templateUrl: './preliquidacion-tramites.html',
  styleUrl: './preliquidacion-tramites.scss',
})
export class PreliquidacionTramitesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() title = 'Preliquidación Trámites Vehiculares';

  /** La primera va activa por defecto */
  @Input() activeIndex = 0;

  @Input({ required: true }) cards: PreliqCard[] = [];

  /** Autoplay (solo tiene sentido en móvil) */
  @Input() autoplay = true;
  @Input() autoplayMs = 6000;

  // ✅ VARIABLE PARA CONTROLAR LA MODAL
  isTramitesModalOpen = false;

  isMobile = false;

  @ViewChild('track', { static: false })
  private trackRef?: ElementRef<HTMLElement>;

  private timer: number | null = null;
  private resumeTimer: number | null = null;

  private onResize = () => {
    // ✅ async para evitar NG0100
    setTimeout(() => {
      const next = window.matchMedia('(max-width: 576px)').matches;
      const changed = next !== this.isMobile;
      this.isMobile = next;

      // si cambia a desktop, apagamos autoplay y ya
      if (changed && !this.isMobile) {
        this.stopAutoplay();
      }

      // si cambia a móvil, reanudamos autoplay (si aplica)
      if (changed && this.isMobile) {
        this.startAutoplay();
      }
    }, 0);
  };

  ngOnInit(): void {
    // ✅ antes del primer render
    this.isMobile = window.matchMedia('(max-width: 576px)').matches;
    window.addEventListener('resize', this.onResize);
  }

  ngAfterViewInit(): void {
    this.bindUserInteractionPause();

    // ✅ autoplay solo en móvil y async para no disparar NG0100
    setTimeout(() => this.startAutoplay(), 0);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.stopAutoplay();
    this.clearResumeTimer();
  }

  // ✅ MÉTODO PARA ABRIR LA MODAL
  openTramitesModal(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isTramitesModalOpen = true;
  }

  // ✅ MÉTODO PARA CERRAR LA MODAL
  closeTramitesModal(): void {
    this.isTramitesModalOpen = false;
  }

  prev(): void {
    if (!this.isMobile) return;
    this.pauseAndResume();
    this.scrollToIndex(this.getPrevIndex());
  }

  next(): void {
    if (!this.isMobile) return;
    this.pauseAndResume();
    this.scrollToIndex(this.getNextIndex());
  }

  scrollToIndex(index: number): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;

    const items = Array.from(
      track.querySelectorAll<HTMLElement>('.preliq-card')
    );
    const el = items[index];
    if (!el) return;

    el.scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest',
    });

    // ✅ async para evitar NG0100 si cambia en medio del render
    setTimeout(() => {
      this.activeIndex = index;
    }, 0);
  }

  /** ===== Helpers ===== */
  private getNextIndex(): number {
    if (!this.cards?.length) return 0;
    return (this.activeIndex + 1) % this.cards.length;
  }

  private getPrevIndex(): number {
    if (!this.cards?.length) return 0;
    return (this.activeIndex - 1 + this.cards.length) % this.cards.length;
  }

  /** ===== Autoplay ===== */
  private startAutoplay(): void {
    if (!this.isMobile) return;
    if (!this.autoplay || this.cards.length <= 1) return;

    this.stopAutoplay();

    this.timer = window.setInterval(() => {
      if (!this.trackRef?.nativeElement) return;
      this.scrollToIndex(this.getNextIndex());
    }, this.autoplayMs);
  }

  private stopAutoplay(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private pauseAndResume(): void {
    if (!this.isMobile) return;

    this.stopAutoplay();
    this.clearResumeTimer();

    this.resumeTimer = window.setTimeout(() => {
      this.startAutoplay();
    }, 2500);
  }

  private clearResumeTimer(): void {
    if (this.resumeTimer) {
      window.clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  /** Pausar autoplay cuando el usuario toca/arrastra/scroll */
  private bindUserInteractionPause(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;

    const pause = () => this.pauseAndResume();

    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('pointerdown', pause, { passive: true });
    track.addEventListener('wheel', pause, { passive: true });

    // Cuando termina el scroll, recalculamos activeIndex (para puntitos/estado)
    let scrollEndTimeout: number | null = null;

    track.addEventListener(
      'scroll',
      () => {
        if (!this.isMobile) return;

        pause();

        if (scrollEndTimeout) window.clearTimeout(scrollEndTimeout);
        scrollEndTimeout = window.setTimeout(() => {
          this.syncActiveIndexFromScroll();
        }, 120);
      },
      { passive: true }
    );
  }

  private syncActiveIndexFromScroll(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;

    const items = Array.from(
      track.querySelectorAll<HTMLElement>('.preliq-card')
    );
    if (!items.length) return;

    const trackRect = track.getBoundingClientRect();
    const trackCenterX = trackRect.left + trackRect.width / 2;

    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    items.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const elCenterX = r.left + r.width / 2;
      const dist = Math.abs(elCenterX - trackCenterX);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });

    // ✅ async para evitar NG0100
    setTimeout(() => {
      this.activeIndex = bestIdx;
    }, 0);
  }
}