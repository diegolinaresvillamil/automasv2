import { Component } from '@angular/core';
import { CtaAgendamientoPeritajeComponent } from '../../shared/components/cta-agendamiento-peritaje/cta-agendamiento-peritaje';
import { FaqComponent, FaqItem } from '../../shared/components/faq/faq';
import {
  NoticiasGridComponent,
  NewsCard,
} from '../../shared/components/noticias-grid/noticias-grid';

@Component({
  selector: 'app-peritaje',
  standalone: true,
  imports: [
    CtaAgendamientoPeritajeComponent,
    FaqComponent,
    NoticiasGridComponent
  ],
  templateUrl: './peritaje.html',
  styleUrl: './peritaje.scss',
})
export class Peritaje {

  // ===============================
  // 🚗 CTA HERO PERITAJE
  // ===============================
  cta = {
    imageSrc: 'assets/peritaje.png',
    linkConsultar: '#',
    linkAgendar: '#',
  };

  // ===============================
  // ❓ Preguntas Frecuentes
  // ===============================
  faqItems: FaqItem[] = [
    {
      question: '¿Qué es un peritaje vehicular?',
      answer: 'Es una inspección técnica, exhaustiva e imparcial que evalúa el estado general de un vehículo (liviano, moto o pesado) en sus componentes estructurales, mecánicos, eléctricos y legales, para determinar su condición y valor comercial.'
    },
    {
      question: '¿Qué tipos de vehículos peritan?',
      answer: 'Ofrecemos servicio completo de peritaje para Vehículos Livianos (automóviles, camionetas, eléctricos, híbridos), Motocicletas de bajo y alto cilindraje, y Vehículos Pesados (camiones, buses, tractomulas).'
    },
    {
      question: '¿Cuánto tiempo tarda el proceso de peritaje?',
      answer: 'Generalmente, el peritaje de un vehículo liviano o moto toma entre 45 minutos y 2 horas y 30 minutos. Los vehículos pesados pueden requerir más tiempo, dependiendo de su complejidad.'
    },
    {
      question: '¿Qué aspectos revisan en el peritaje?',
      answer: 'El peritaje incluye: Estructura (chasis y carrocería) para detectar siniestros, Sistema Mecánico (motor, suspensión, frenos), Sistema Eléctrico y Electrónico, Estado Estético (pintura e interiores), y Aspectos Legales (revisión de seriales - VIN, motor, chasis) para confirmar su legalidad.'
    },
    {
      question: '¿El peritaje incluye la revisión de gases/emisiones?',
      answer: 'La revisión de gases no es un componente estándar del peritaje técnico, pero podemos incluir una prueba complementaria de opacidad y estado del motor.'
    },
    {
      question: '¿El peritaje es el mismo para un camión que para un automóvil?',
      answer: 'La metodología es similar, pero en vehículos pesados se evalúan con mayor profundidad el tren de fuerza, motor, caja y sistema de frenos de aire.'
    },
    {
      question: '¿Qué documento recibo al finalizar el peritaje?',
      answer: 'Recibirá un Informe de Peritaje Detallado y Certificado con fotografías, resultados, observaciones técnicas y dictamen final.'
    },
    {
      question: '¿Tiene validez el peritaje para una compraventa?',
      answer: 'Sí. El informe sirve como aval técnico objetivo del estado real del vehículo para comprador y vendedor.'
    }
  ];

  // ===============================
  // 📰 Noticias
  // ===============================
  noticiasTitle = 'Últimas noticias';

  noticiaDestacada: NewsCard = {
    imageSrc: 'assets/blog-principal.jpg',
    imageAlt: 'Noticia destacada peritaje',
    badge: 'Peritaje Vehicular',
    title: '¿Por Qué Hacer un Peritaje Antes de Comprar?',
    description:
      'Evita sorpresas y conoce el verdadero estado del vehículo antes de tomar una decisión.',
    ctaText: 'Leer más',
    href: '/noticias/peritaje-antes-de-comprar',
  };

  noticiasCards: NewsCard[] = [
    {
      imageSrc: 'assets/blog1.jpg',
      imageAlt: 'Noticia 1',
      title: 'Errores comunes al comprar un usado',
      ctaText: 'Leer más',
      href: '/noticias/errores-comprar-usado',
    },
    {
      imageSrc: 'assets/blog2.jpg',
      imageAlt: 'Noticia 2',
      title: 'Diferencias entre peritaje y revisión técnica',
      ctaText: 'Leer más',
      href: '/noticias/diferencias-peritaje-rtm',
    },
    {
      imageSrc: 'assets/blog3.jpg',
      imageAlt: 'Noticia 3',
      title: 'Cómo detectar un vehículo siniestrado',
      ctaText: 'Leer más',
      href: '/noticias/vehiculo-siniestrado',
    },
  ];

}