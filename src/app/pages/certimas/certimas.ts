import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { FaqComponent, FaqItem } from '../../shared/components/faq/faq';

type Side = 'left' | 'right';

interface InfoItem {
  title: string;
  icon: string;
  open: boolean;
  description: string;
}

@Component({
  selector: 'app-certimas',
  standalone: true,
  imports: [CommonModule, RouterModule, FaqComponent],
  templateUrl: './certimas.html',
  styleUrl: './certimas.scss',
})
export class Certimas implements AfterViewInit, OnDestroy {
  // ===============================
  // 🎥 MODAL VIDEO
  // ===============================
  showVideo = false;
  videoUrl?: SafeResourceUrl;

  // ===============================
  // 🧩 SLIDER PLANES
  // ===============================
  @ViewChild('planesGrid') planesGrid?: ElementRef<HTMLElement>;
  currentSlide = 1;

  // ===============================
  // 📱 ESTADO MÓVIL INFO
  // ===============================
  mobileActiveItem: { side: Side; index: number } | null = null;

  // ===============================
  // 🧠 INYECCIONES
  // ===============================
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private router = inject(Router);
  private routerSub?: Subscription;

  // ===============================
  // 🧩 INFO ITEMS (ACORDEONES)
  // ===============================
  leftItems: InfoItem[] = [
    {
      title: 'Licencia de tránsito',
      icon: 'bi bi-person-vcard',
      open: false,
      description:
        'Se relacionan: Número de licencia de tránsito, organismo de tránsito, fecha de matrícula del vehículo, estado del vehículo (Activo/Inactivo) y gravámenes.',
    },
    {
      title: 'Rotación promedio últimos 5 años',
      icon: 'bi bi-arrow-repeat',
      open: false,
      description:
        'Indica cuántos propietarios tuvo el vehículo durante los últimos 5 años.',
    },
    {
      title: 'Características del vehículo',
      icon: 'bi bi-car-front',
      open: false,
      description:
        'Identifica placa, marca, clase, línea, carrocería, modelo, color, combustible, chasis, serie, VIN, motor, servicio, cilindraje.',
    },
    {
      title: 'Regrabaciones',
      icon: 'bi bi-vinyl',
      open: false,
      description:
        'Verifica si se encuentra autorizada la regrabación de chasis/serie/VIN/motor ante organismo de tránsito y su histórico.',
    },
    {
      title: 'Rapidez',
      icon: 'bi bi-speedometer2',
      open: false,
      description: 'En 2 minutos tienes la información del vehículo.',
    },
  ];

  rightItems: InfoItem[] = [
    {
      title: 'Score',
      icon: 'bi bi-speedometer',
      open: false,
      description:
        'Modelo predictivo desarrollado por AutoMás para conocer el nivel de riesgo del vehículo.',
    },
    {
      title: 'Revisión Técnico Mecánica',
      icon: 'bi bi-shield-check',
      open: false,
      description:
        'Se relaciona vigencia, centro que expidió y si la renovación se realizó oportunamente en los últimos 5 años.',
    },
    {
      title: 'SOAT',
      icon: 'bi bi-clipboard-check',
      open: false,
      description:
        'Estado del SOAT, fecha de vigencia y aseguradora que expidió la póliza.',
    },
    {
      title: 'Medidas cautelares',
      icon: 'bi bi-exclamation-octagon',
      open: false,
      description:
        'Información sobre medidas cautelares: hurto, embargo, decomiso u otros registros asociados.',
    },
    {
      title: 'Información del propietario actual',
      icon: 'bi bi-person-lines-fill',
      open: false,
      description:
        'Edad inicial de compra y cantidad de restricciones asociadas a la licencia de conducción.',
    },
  ];

  // ===============================
  // ❓ FAQ
  // ===============================
  faqItems: FaqItem[] = [
    {
      question: '¿Qué es CertiMás?',
      answer:
        'CertiMás es un informe que te muestra el historial del vehículo basado en su placa. Incluye datos de tránsito, revisiones y estado general.',
    },
    {
      question: '¿Puedo consultar más de un vehículo?',
      answer:
        'Sí. Puedes adquirir varios CertiMás y consultar diferentes placas según tus necesidades.',
    },
    {
      question: '¿De dónde proviene la información?',
      answer:
        'La información es obtenida de fuentes oficiales de tránsito y entidades certificadas en Colombia.',
    },
    {
      question: '¿El reporte incluye el SOAT y la Revisión Técnico-Mecánica?',
      answer:
        'Sí, CertiMás te muestra el estado actual del SOAT y la revisión técnico-mecánica del vehículo consultado.',
    },
    {
      question: '¿Qué métodos de pago aceptan?',
      answer:
        'Puedes pagar con tarjeta, PSE o a través de diferentes medios habilitados en la plataforma.',
    },
  ];

  // ===============================
  // 🧭 ACORDEONES DESKTOP
  // ===============================
  toggleLeft(index: number) {
    this.leftItems[index].open = !this.leftItems[index].open;
  }

  toggleRight(index: number) {
    this.rightItems[index].open = !this.rightItems[index].open;
  }

  // ===============================
  // 📱 CONTROL MÓVIL
  // ===============================
  toggleMobileItem(side: Side, index: number) {
    if (this.mobileActiveItem?.side === side && this.mobileActiveItem?.index === index) {
      this.mobileActiveItem = null;
    } else {
      this.mobileActiveItem = { side, index };
    }
  }

  private getActiveItem(): InfoItem | null {
    if (!this.mobileActiveItem) return null;
    const items = this.mobileActiveItem.side === 'left' ? this.leftItems : this.rightItems;
    return items[this.mobileActiveItem.index] ?? null;
  }

  getActiveItemIcon(): string {
    return this.getActiveItem()?.icon ?? '';
  }

  getActiveItemTitle(): string {
    return this.getActiveItem()?.title ?? '';
  }

  getActiveItemDescription(): string {
    return this.getActiveItem()?.description ?? '';
  }

  // ===============================
  // 🎬 MODAL VIDEO
  // ===============================
  openVideo() {
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.youtube.com/embed/sB2YyyTlJgU?autoplay=1&rel=0'
    );
    this.showVideo = true;
    document.body.style.overflow = 'hidden';
  }

  closeVideo() {
    this.showVideo = false;
    this.videoUrl = undefined;
    document.body.style.overflow = '';
  }

  // ===============================
  // 🧩 SLIDER
  // ===============================
  scrollPrev() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.scrollToSlide(this.currentSlide);
    }
  }

  scrollNext() {
    if (this.currentSlide < 2) {
      this.currentSlide++;
      this.scrollToSlide(this.currentSlide);
    }
  }

  scrollToSlide(index: number) {
    if (!this.planesGrid) return;

    const container = this.planesGrid.nativeElement;
    const cards = container.querySelectorAll('.plan-card');
    if (index < 0 || index >= cards.length) return;

    const targetCard = cards[index] as HTMLElement;
    const containerWidth = container.offsetWidth;
    const cardLeft = targetCard.offsetLeft;
    const cardWidth = targetCard.offsetWidth;
    const scrollPosition = cardLeft - containerWidth / 2 + cardWidth / 2;

    container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    this.currentSlide = index;
  }

  private scrollToDestacado() {
    if (window.innerWidth > 992) return;
    setTimeout(() => this.scrollToSlide(1), 100);
  }

  // ===============================
  // 🧹 LIFECYCLE
  // ===============================
  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.ngZone.run(() => this.cdr.detectChanges()), 50);
    });

    this.scrollToDestacado();

    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => this.closeVideo());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.closeVideo();
  }
}