import { Component } from '@angular/core';
import { AdBannerComponent } from '../../shared/components/ad-banner/ad-banner';
import {
  HeroCarouselComponent,
  HeroSlide,
} from '../../shared/components/hero-carousel/hero-carousel';
import {
  ServicesGridComponent,
  ServiceCard,
} from '../../shared/components/services-grid/services-grid';
import { CtaAgendamientoRtmComponent } from '../../shared/components/cta-agendamiento-rtm/cta-agendamiento-rtm';
import {
  PreliquidacionTramitesComponent,
  PreliqCard,
} from '../../shared/components/preliquidacion-tramites/preliquidacion-tramites';
import { CtaAgendamientoPeritajeComponent } from '../../shared/components/cta-agendamiento-peritaje/cta-agendamiento-peritaje';
import { ExperienciaGridComponent } from '../../shared/components/experiencia-grid/experiencia-grid';
import { CtaCertimasComponent } from '../../shared/components/cta-certimas/cta-certimas';

// Servicios complementarios (NO TOCAR)
import {
  ServiciosComplementariosGridComponent,
  ComplementaryServiceCard,
} from '../../shared/components/servicios-complementarios-grid/servicios-complementarios-grid';

import {
  LogosCarrouselComponent,
  LogoItem,
} from '../../shared/components/logos-carrousel/logos-carrousel';

import {
  NoticiasGridComponent,
  NewsCard,
} from '../../shared/components/noticias-grid/noticias-grid';

import { EnteControlComponent } from '../../shared/components/ente-control/ente-control';


@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    EnteControlComponent,
    HeroCarouselComponent,
    AdBannerComponent,
    ServicesGridComponent,
    CtaAgendamientoRtmComponent,
    PreliquidacionTramitesComponent,
    CtaAgendamientoPeritajeComponent,
    ExperienciaGridComponent,
    CtaCertimasComponent,
    ServiciosComplementariosGridComponent,
    LogosCarrouselComponent,
    NoticiasGridComponent,
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {

  /** Slides del hero */
  heroSlides: HeroSlide[] = [
    {
      desktopSrc: 'assets/ads/banner1.jpg',
      tabletSrc: 'assets/ads/banner1.jpg',
      mobileSrc: 'assets/ads/banner1.jpg',
      alt: 'Publicidad principal',
      href: 'https://electrolit.com',
    },
    {
      desktopSrc: 'assets/ads/banner2.jpg',
      tabletSrc: 'assets/ads/banner2.jpg',
      mobileSrc: 'assets/ads/banner2.jpg',
      alt: 'Promoción secundaria',
    },
  ];

  /** Cards de "Nuestros Servicios" */
  services: ServiceCard[] = [
    {
      title: 'Revisión Técnico\nMecánica',
      imgNormal: 'assets/tecno-n.png',
      imgHover: 'assets/tecno-h.png',
      href: '/servicios/revision-tecnica',
    },
    {
      title: 'Peritaje / Avalúo',
      imgNormal: 'assets/peritaje-n.png',
      imgHover: 'assets/peritaje-h.png',
      href: '/servicios/peritaje',
    },
    {
      title: 'Trámites\nVehiculares',
      imgNormal: 'assets/tramites-n.png',
      imgHover: 'assets/tramites-h.png',
      href: '/servicios/tramites',
    },
    {
      title: 'CertiMás',
      imgNormal: 'assets/certimas-n.png',
      imgHover: 'assets/certimas-h.png',
      href: '/servicios/certimas',
    },
  ];

  /** Cards de Preliquidación Trámites Vehiculares */
  preliquidacionCards: PreliqCard[] = [
    {
      title: 'Traspaso de\nVehículo',
      subtitle: '',
      description:
        'Trámite que legaliza el cambio de propietario de un vehículo usado.',
      icon: 'none',
      href: '/tramites/traspaso',
    },
    {
      title: 'Trámites',
      subtitle: 'Levantamiento de prenda',
      icon: 'search',
      href: '/tramites/levantamiento-prenda',
    },
    {
      title: 'Trámites',
      subtitle: 'Inscripción de prenda',
      icon: 'file',
      href: '/tramites/inscripcion-prenda',
    },
  ];

  /** Items de "Nuestra experiencia" */
  experienciaItems = [
    { icon: 'bi-person-gear', value: 750, label: 'Coequiperos' },
    { icon: 'bi-buildings', value: 55, label: 'Ciudades' },
    { icon: 'bi-people', value: 37, label: 'Sedes en\nOperación' },
    { icon: 'bi-buildings-fill', value: 62, label: 'Centros\nAutorizados' },
  ];

  /** CTA CertiMás */
  certimasCta = {
    logoSrc: 'assets/logo-certimas.png',
    logoAlt: 'CertiMás',
    title: '¿Cómo Funciona?',
    description:
      'Solo con tu placa podrás conocer el verdadero estado del vehículo que quieres comprar.',
    videoUrl:
      'https://www.youtube.com/watch?v=1SiC4T1kLVY&pp=ygUQY2VydGltYXMgYXV0b21hcw%3D%3D',
    ctaText: 'Compra Ahora',
    ctaHref: '/certimas/compra',
    imageSrc: 'assets/certimas.png',
    imageAlt: 'CertiMás',
  };

  /** Servicios Complementarios (NO TOCAR) */
  complementariosTitle = 'Servicios Complementarios';

  complementariosCards: ComplementaryServiceCard[] = [
    {
      title: 'Prueba de motor + scanner',
      imageSrc: 'assets/escaner.png',
      href: '/servicios-complementarios/escaner',
      imageAlt: 'Prueba de motor + scanner',
    },
    {
      title: 'Plan viajero',
      imageSrc: 'assets/planviajero.png',
      href: '/servicios-complementarios/plan-viajero',
      imageAlt: 'Plan viajero',
    },
    {
      title: 'Improntas',
      imageSrc: 'assets/Improntas.png',
      href: '/servicios-complementarios/improntas',
      imageAlt: 'Improntas',
    },
    {
      title: 'CertiMás',
      imageSrc: 'assets/certimas-img.png',
      href: '/servicios/certimas',
      imageAlt: 'CertiMás',
    },
  ];

  aliadosTitle = 'Nuestros aliados';

  aliadosLogos: LogoItem[] = [
    { src: 'assets/bbva.png', alt: 'BBVA' },
    { src: 'assets/axacolpatria.png', alt: 'AXA Colpatria' },
    { src: 'assets/bancodebogota.png', alt: 'Banco de Bogotá' },
    { src: 'assets/segurosbolivar.png', alt: 'Seguros Bolívar' },
  ];

  noticiasTitle = 'Últimas noticias';

  noticiaDestacada: NewsCard = {
    imageSrc: 'assets/blog-principal.jpg',
    imageAlt: 'Noticia destacada',
    badge: 'Revisión Técnico Mecánica',
    title: '¡No Esperes a Que Sea\nTarde!',
    description:
      'Descubre por qué debes realizar tu Revisión Técnico Mecánica ahora.',
    ctaText: 'Leer más',
    href: '/noticias/no-esperes-a-que-sea-tarde',
  };

  noticiasCards: NewsCard[] = [
    {
      imageSrc: 'assets/blog1.jpg',
      imageAlt: 'Noticia 1',
      title: '¿Comprando\nusado?',
      ctaText: 'Leer más',
      href: '/noticias/comprando-usado',
    },
    {
      imageSrc: 'assets/blog2.jpg',
      imageAlt: 'Noticia 2',
      title: '¿Qué es un peritaje vehicular y\ncuánto cuesta?',
      ctaText: 'Leer más',
      href: '/noticias/peritaje-cuanto-cuesta',
    },
    {
      imageSrc: 'assets/blog3.jpg',
      imageAlt: 'Noticia 3',
      title: '¿Qué es un peritaje vehicular y\ncuánto cuesta?',
      ctaText: 'Leer más',
      href: '/noticias/peritaje-cuanto-cuesta-2',
    },
  ];
}