import { Component } from '@angular/core';
import { CtaAgendamientoRtmComponent } from '../../shared/components/cta-agendamiento-rtm/cta-agendamiento-rtm';
import { FaqComponent, FaqItem } from '../../shared/components/faq/faq';

import {
  NoticiasGridComponent,
  NewsCard,
} from '../../shared/components/noticias-grid/noticias-grid';

interface PrecioCard {
  titulo: string;
  precio: string;
}

@Component({
  selector: 'app-revision-tecnico-mecanica',
  standalone: true,
  imports: [
    CtaAgendamientoRtmComponent,
    FaqComponent,
    NoticiasGridComponent,
  ],
  templateUrl: './revision-tecnico-mecanica.html',
  styleUrl: './revision-tecnico-mecanica.scss',
})
export class RevisionTecnicoMecanica {
  // ===============================
  // 🚗 CTA HERO
  // ===============================
  cta = {
    imageSrc: 'assets/servicio.png',
    linkConsultar: '#',
    linkAgendar: '#',
  };

  // ===============================
  // 💰 Tarjetas de precios
  // ===============================
  precios: PrecioCard[] = [
    { titulo: 'Livianos Particulares', precio: '$310.193' },
    { titulo: 'Livianos Públicos', precio: '$309.193' },
    { titulo: 'Livianos eléctricos', precio: '$231.265' },
    { titulo: 'Motocicletas', precio: '$209.664' },
    { titulo: 'Ciclomotores', precio: '$160.000' },
    { titulo: 'Pesados Particulares', precio: '$444.658' },
    { titulo: 'Pesados Públicos', precio: '$453.000' },
    { titulo: 'Cuadriciclos', precio: '$398.000' },
  ];

  // ===============================
  // 💬 Preguntas Frecuentes
  // ===============================
  faqItems: FaqItem[] = [
    {
      question: '¿Qué es la Revisión Técnico Mecánica (RTM)?',
      answer:
        'Es un proceso obligatorio que certifica que tu vehículo (liviano, moto o pesado) cumple con las condiciones mínimas de seguridad mecánica, ambiental y de funcionamiento, establecidas por la normativa vigente para poder circular legalmente.',
    },
    {
      question: '¿Es obligatorio realizar la RTM?',
      answer:
        'Sí, es obligatorio para todos los vehículos que circulan en el país. Conducir sin la RTM vigente o con una RTM vencida puede generar multas y la inmovilización del vehículo.',
    },
    {
      question: '¿Qué documentos necesito para realizar la RTM?',
      answer:
        'Generalmente, solo necesitas la Licencia de Tránsito (Tarjeta de Propiedad) del vehículo.',
    },
    {
      question: '¿Cuánto tiempo dura la RTM?',
      answer:
        'El proceso de revisión dura aproximadamente entre 40 y 60 minutos, dependiendo del tipo de vehículo (moto, liviano o pesado).',
    },
    {
      question: '¿Cada cuánto debo realizar la RTM?',
      answer:
        'Vehículos Particulares Nuevos: la primera RTM se realiza al quinto (5°) año de la fecha de matrícula; luego es anual. Vehículos de Servicio Público y Motocicletas Nuevas: la primera RTM se realiza al segundo (2°) año; luego es anual.',
    },
    {
      question: '¿Qué pasa si mi RTM está vencida?',
      answer:
        'Te expones a una multa de tránsito (generalmente C35) y a la posible inmovilización de tu vehículo por parte de las autoridades de tránsito.',
    },
    {
      question: '¿Cuál es la vigencia de la RTM una vez aprobada?',
      answer:
        'La vigencia es de un (1) año a partir de la fecha de aprobación, con excepción de la primera revisión para vehículos nuevos.',
    },
  ];

  // ===============================
  // 📰 Noticias (NoticiasGrid)
  // ===============================
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