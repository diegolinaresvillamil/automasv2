import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';

export type NewsCard = {
  imageSrc: string;
  imageAlt?: string;

  // Etiqueta tipo "Revisión Técnico Mecánica" (opcional)
  badge?: string;

  title: string;
  description?: string;

  ctaText?: string; // default: "Leer más"
  href?: string;
};

@Component({
  selector: 'app-noticias-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './noticias-grid.html',
  styleUrl: './noticias-grid.scss',
})
export class NoticiasGridComponent implements AfterViewInit, OnDestroy {
  @Input() title = 'Últimas noticias';

  // Destacada (la grande)
  @Input({ required: true }) featured!: NewsCard;

  // Las 3 pequeñas
  @Input({ required: true }) cards: NewsCard[] = [];

  // Carrusel móvil
  @Input() mobileCarousel = true;

  @ViewChild('track', { static: false })
  private trackRef?: ElementRef<HTMLElement>;

  activeIndex = 0;

  private scrollEndTimeout: number | null = null;

  ngAfterViewInit(): void {
    this.bindScrollSync();
  }

  ngOnDestroy(): void {
    if (this.scrollEndTimeout) window.clearTimeout(this.scrollEndTimeout);
  }

  prev(): void {
    this.scrollToIndex(this.getPrevIndex());
  }

  next(): void {
    this.scrollToIndex(this.getNextIndex());
  }

  scrollToIndex(index: number): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;

    const items = Array.from(track.querySelectorAll<HTMLElement>('.news-mini'));
    const el = items[index];
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    this.activeIndex = index;
  }

  private getNextIndex(): number {
    if (!this.cards?.length) return 0;
    return (this.activeIndex + 1) % this.cards.length;
  }

  private getPrevIndex(): number {
    if (!this.cards?.length) return 0;
    return (this.activeIndex - 1 + this.cards.length) % this.cards.length;
  }

  private bindScrollSync(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;

    track.addEventListener(
      'scroll',
      () => {
        if (this.scrollEndTimeout) window.clearTimeout(this.scrollEndTimeout);
        this.scrollEndTimeout = window.setTimeout(() => {
          this.syncActiveIndexFromScroll();
        }, 120);
      },
      { passive: true }
    );
  }

  private syncActiveIndexFromScroll(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;

    const items = Array.from(track.querySelectorAll<HTMLElement>('.news-mini'));
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

    this.activeIndex = bestIdx;
  }

  getCtaText(c: NewsCard): string {
    return c.ctaText?.trim() || 'Leer más';
  }
}
