import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

export type ExperienciaItem = {
  icon: string;   // ej: 'bi-person-gear'
  value: number;  // ej: 750
  label: string;  // permite \n
};

@Component({
  selector: 'app-experiencia-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiencia-grid.html',
  styleUrl: './experiencia-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienciaGridComponent implements AfterViewInit, OnDestroy {
  @Input() title = 'Nuestra experiencia';
  @Input() items: ExperienciaItem[] = [];
  @Input() prefix = '+';
  @Input() duration = 1100;

  animatedValues: number[] = [];

  private observer?: IntersectionObserver;
  private hasAnimated = false;
  private rafId: number | null = null;

  @ViewChild('sectionEl', { static: true })
  sectionEl!: ElementRef<HTMLElement>;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngAfterViewInit(): void {
    // Estado inicial estable
    this.animatedValues = this.items.map(() => 0);
    this.cdr.markForCheck();

    // IMPORTANTÍSIMO: arrancar observer/animación fuera del primer check
    setTimeout(() => {
      this.setupObserver();
      this.startOnce(); // si ya está visible al cargar, anima igual
    }, 0);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private setupObserver(): void {
    if (!this.sectionEl?.nativeElement) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.startOnce();
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -10% 0px' }
    );

    this.observer.observe(this.sectionEl.nativeElement);
  }

  private startOnce(): void {
    if (this.hasAnimated || !this.items.length) return;
    this.hasAnimated = true;
    this.observer?.disconnect();

    this.zone.runOutsideAngular(() => {
      const start = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / this.duration);
        const eased = 1 - Math.pow(1 - progress, 3);

        const nextValues = this.items.map((it) => Math.round(it.value * eased));

        this.zone.run(() => {
          this.animatedValues = nextValues;
          this.cdr.markForCheck();
        });

        if (progress < 1) {
          this.rafId = requestAnimationFrame(step);
        }
      };

      this.rafId = requestAnimationFrame(step);
    });
  }

  formatLabel(label: string): string {
    return label.replace(/\n/g, '<br>');
  }
}
