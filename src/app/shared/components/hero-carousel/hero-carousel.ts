import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal, NgZone } from '@angular/core';

export type HeroSlide = {
  desktopSrc: string;
  tabletSrc: string;
  mobileSrc: string;
  alt?: string;
  href?: string;
};

@Component({
  selector: 'app-hero-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-carousel.html',
  styleUrl: './hero-carousel.scss',
})
export class HeroCarouselComponent implements OnInit, OnDestroy {
  @Input({ required: true }) slides: HeroSlide[] = [];

  @Input() autoplay = true;
  @Input() autoplayMs = 4500;
  @Input() showArrows = true;
  @Input() showDots = true;

  private timer: any;

  readonly index = signal(0);

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    if (this.autoplay) this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  prev(): void {
    if (!this.slides?.length) return;
    const next = (this.index() - 1 + this.slides.length) % this.slides.length;
    this.index.set(next);
    this.restart();
  }

  next(): void {
    if (!this.slides?.length) return;
    const next = (this.index() + 1) % this.slides.length;
    this.index.set(next);
    this.restart();
  }

  goTo(i: number): void {
    if (!this.slides?.length) return;
    if (i < 0 || i >= this.slides.length) return;
    this.index.set(i);
    this.restart();
  }

  pause(): void {
    this.stop();
  }

  resume(): void {
    if (this.autoplay) this.start();
  }

  private start(): void {
    this.stop();
    if (!this.slides?.length || this.slides.length < 2) return;

    // SOLUCIÓN: Ejecutar setInterval FUERA de la zona de Angular
    this.ngZone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        // Volver a entrar a la zona de Angular para actualizar el signal
        this.ngZone.run(() => {
          const next = (this.index() + 1) % this.slides.length;
          this.index.set(next);
        });
      }, this.autoplayMs);
    });
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private restart(): void {
    if (!this.autoplay) return;
    this.start();
  }
}