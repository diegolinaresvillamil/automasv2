import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { FaqComponent, FaqItem } from '../../shared/components/faq/faq';

import {
  NoticiasGridComponent,
  NewsCard,
} from '../../shared/components/noticias-grid/noticias-grid';

import { AgendarTramitesComponent } from '../../core/modals/agendar-tramites/agendar-tramites';

@Component({
  selector: 'app-tramites',
  standalone: true,
  imports: [
    CommonModule,
    FaqComponent,
    NoticiasGridComponent,
    AgendarTramitesComponent,
  ],
  templateUrl: './tramites.html',
  styleUrl: './tramites.scss',
})
export class Tramites {
  // ===============================
  // 🪟 MODAL: AGENDAR TRÁMITES
  // ===============================
  isAgendarTramitesOpen = false;

  abrirAgendarTramites(): void {
    this.isAgendarTramitesOpen = true;
  }

  cerrarAgendarTramites(): void {
    this.isAgendarTramitesOpen = false;
  }

  // Si quieres abrir modal desde una card específica (opcional)
  abrirAgendarDesdeTramite(_tramite: any): void {
    // Nota: tu modal no recibe "tramite preseleccionado" por Input,
    // así que por ahora solo abrimos.
    this.isAgendarTramitesOpen = true;
  }

  tramites = [
    {
      title: 'Matrícula/Registro',
      icon: 'assets/matricula.svg',
      open: false,

      // ✅ NUEVO: acordeones internos (inician cerrados)
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Manifiesto de importación',
        'Factura de venta',
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Fotocopia de la cédula de ciudadanía de comprador y vendedor. En caso de ser persona jurídica, se debe adjuntar Certificado de Cámara de Comercio, con una vigencia no mayor a 30 días y fotocopia de la cédula del representante legal.',
      ],
      requisitos: [
        'Impuestos.',
        'Las personas naturales o jurídicas deben estar debidamente inscritas en el sistema RUNT – Comprador y Vendedor.',
        'SOAT vigente',
        'No poseer multas registradas en tránsito - Propietario.',
      ],
    },
    {
      title: 'Transformación',
      icon: 'assets/transformacion.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite)',
        'Factura de compra expedida por entidad que realiza el cambio de la característica a modificar',
        'Improntas del Vehículo (Sistemas de identificación)',
        'Cedula del propietario',
      ],
      requisitos: [
        'Soat Vigente',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
        'No poseer multas registradas en tránsito.',
      ],
    },
    {
      title: 'Cambio de color',
      icon: 'assets/color.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite',
        'Carta Solicitud firmada con huella de propietario',
        'Improntas del Vehículo (Sistemas de identificación)',
        'Cedula del propietario',
      ],
      requisitos: [
        'Soat Vigente',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
        'No poseer multas registradas en tránsito.',
      ],
    },
    {
      title: 'Traspaso',
      icon: 'assets/traspaso.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Contrato de Compraventa',
        'Improntas del Vehículo (Sistemas de identificación)',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite)',
        'Documentos deben venir firmados con huella por ambas partes',
        'Fotocopia de la cédula de ciudadanía de comprador y vendedor. En caso de ser persona jurídica, se debe adjuntar Certificado de Cámara de Comercio, con una vigencia no mayor a 30 días y fotocopia de la cédula del representante legal.',
        'Fotocopia del pago del último impuesto (año vigente).',
      ],
      requisitos: [
        'Soat Vigente',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
        'Las personas naturales o jurídicas deben estar debidamente inscritas en el sistema RUNT – Comprador y Vendedor.',
        'No poseer multas registradas en tránsito - Comprador y Vendedor.',
      ],
    },
    {
      title: 'Regrabar Chasis',
      icon: 'assets/chasis.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito).',
        'Improntas del Vehículo (Sistemas de identificación).',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite).',
        'Revisión dijin no mayor a 30 días.',
      ],
      requisitos: [
        'Soat Vigente',
        'No poseer multas registradas en tránsito de propietario.',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
      ],
    },
    {
      title: 'Duplicado',
      icon: 'assets/duplicado.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite)',
        'Improntas del Vehículo (Sistemas de identificación)',
        'Cedula del propietario',
      ],
      requisitos: [
        'Soat Vigente',
        'No poseer multas registradas en tránsito de propietario.',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
      ],
    },
    {
      title: 'Traslado Matrícula',
      icon: 'assets/traslado.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito).',
        'Improntas del Vehículo (Sistemas de identificación).',
        'Fotocopia de la cédula de ciudadanía de comprador y vendedor. En caso de ser persona jurídica, se debe adjuntar Certificado de Cámara de Comercio, con una vigencia no mayor a 30 días y fotocopia de la cédula del representante legal.',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite).',
      ],
      requisitos: [
        'Soat Vigente',
        'No poseer multas registradas en tránsito de propietario.',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
      ],
    },
    {
      title: 'Regrabación de Motor',
      icon: 'assets/motor.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito).',
        'Improntas del Vehículo (Sistemas de identificación).',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite).',
        'Revisión dijin no mayor a 30 días.',
        'Factura de venta y manifiesto de importación ( Cambio de motor).',
      ],
      requisitos: [
        'Soat Vigente',
        'No poseer multas registradas en tránsito de propietario.',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
      ],
    },
    {
      title: 'Levantamiento Prenda',
      icon: 'assets/prenda.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Carta de autorización de levantamiento de prenda dirigía al tránsito',
        'Fotocopia de la cédula de ciudadanía de comprador y vendedor. En caso de ser persona jurídica, se debe adjuntar Certificado de Cámara de Comercio, con una vigencia no mayor a 30 días y fotocopia de la cédula del representante legal.',
        'Formulario de solicitud de trámite debidamente diligenciado',
        'Improntas del Vehículo (Sistemas de identificación)',
      ],
      requisitos: [
        'Inscripción de la prenda en plataformas RUNT',
        'Cargue de garantías mobiliarias en plataforma Runt (Entidades inscritas en confecámaras)',
        'Soat Vigente',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
      ],
    },
    {
      title: 'Radicado y Matrícula',
      icon: 'assets/radicado.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Contrato de Inscripción de prenda – Firmado Comprador y Acreedor Prendario',
        'Fotocopia de la cédula de ciudadanía de comprador y vendedor. En caso de ser persona jurídica, se debe adjuntar Certificado de Cámara de Comercio, con una vigencia no mayor a 30 días y fotocopia de la cédula del representante legal.',
        'Formulario de solicitud de trámite debidamente diligenciado',
        'Improntas del Vehículo (Sistemas de identificación)',
      ],
      requisitos: [
        'Inscripción de la prenda en plataformas RUNT',
        'Cargue de garantías mobiliarias en plataforma Runt (Entidades inscritas en confecámaras)',
        'Soat Vigente',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
        'Las personas naturales o jurídicas deben estar debidamente inscritas en el sistema RUNT – Propietario o Comprador',
        'No poseer multas registradas en tránsito - Comprador y Vendedor',
      ],
    },
    {
      title: 'Cambio de servicio',
      icon: 'assets/servicio.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito).',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite).',
        'Carta Solicitud dirigida a tránsito expedida por empresa afiliadora.',
        'Improntas del Vehículo (Sistemas de identificación).',
        'Cedula del propietario.',
        'Paz y salvo de empresa afiliadora.',
      ],
      requisitos: [
        'Soat Vigente',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
      ],
    },
    {
      title: 'Cancelación de Matrícula',
      icon: 'assets/cancelacion.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite)',
        'Cedula del propietario',
        'Acta de no recuperación expedida por autoridad competente',
        'Denuncia del Hurto instaurado ante entidad competente',
      ],
      requisitos: [
        'No poseer multas registradas en tránsito',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
      ],
    },
    {
      title: 'Inscripción de Prenda',
      icon: 'assets/prenda.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Contrato de Inscripción de prenda – Firmado Comprador y Acreedor Prendario',
        'Fotocopia de la cédula de ciudadanía de comprador y vendedor. En caso de ser persona jurídica, se debe adjuntar Certificado de Cámara de Comercio, con una vigencia no mayor a 30 días y fotocopia de la cédula del representante legal.',
        'Formulario de solicitud de trámite debidamente diligenciado',
        'Improntas del Vehículo (Sistemas de identificación)',
      ],
      requisitos: [
        'Inscripción de la prenda en plataformas RUNT',
        'Cargue de garantías mobiliarias en plataforma Runt (Entidades inscritas en confecámaras)',
        'Soat Vigente',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
        'Las personas naturales o jurídicas deben estar debidamente inscritas en el sistema RUNT – Propietario o Comprador',
        'No poseer multas registradas en tránsito - Comprador y Vendedor',
      ],
    },
    {
      title: 'Cambio de Placas',
      icon: 'assets/matricula.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite)',
        'Sí el vehículo pasa a ser clásico o antiguo, se debe presentar una certificación de la entidad especializada en la preservación de vehículos clásico Improntas del Vehículo (Sistemas de identificación).',
        'Cedula del propietario.',
        'Entrega placas anteriores.',
      ],
      requisitos: [
        'Soat Vigente.',
        'Revisión Tecnicomecania Vigente ( Si Aplica ).',
        'No poseer multas registradas en tránsito',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
      ],
    },
    {
      title: 'Duplicado de Placas',
      icon: 'assets/duplicado.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite)',
        'Improntas del Vehículo (Sistemas de identificación)',
        'Cedula del propietario',
        'Entrega placas anteriores si se solicitan por deterioro',
      ],
      requisitos: [
        'Soat Vigente',
        'No poseer multas registradas en tránsito de propietario.',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
      ],
    },
    {
      title: 'Rematrícula',
      icon: 'assets/traspaso.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite)',
        'Revisión Dijin',
        'Improntas del Vehículo (Sistemas de identificación)',
        'Cedula del propietario',
      ],
      requisitos: [
        'Soat Vigente',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
        'No poseer multas registradas en tránsito - Propietario',
      ],
    },
    {
      title: 'Cambio de Carrocería',
      icon: 'assets/transformacion.svg',
      open: false,

      // ✅ NUEVO
      docsOpen: false,
      requisitosOpen: false,

      docs: [
        'Formulario de solicitud de trámite debidamente diligenciado (FUN-Formulario único nacional de Tránsito)',
        'Mandato (Poder entregado a Automas por el Propietario del vehículo Para realizar el Trámite)',
        'Factura de compra expedida por entidad autorizada a cambiar instalar nuevo tipo de carrocería',
        'Ficha Tecnica de homologacion de carroceria a instalar',
        'Ficha inscripción fabricante ante ministerio de transporte',
        'Improntas del Vehículo (Sistemas de identificación)',
        'Cedula del propietario',
      ],
      requisitos: [
        'Soat Vigente',
        'Revisión Tecnicomecania Vigente ( Si Aplica )',
        'El vehículo debe estar al día en impuestos, incluido el año en vigencia.',
        'No poseer multas registradas en tránsito.',
      ],
    },
  ];

  // ===============================
  // ✅ Acordeón principal (card)
  // - Resetea docs/requisitos cuando se abre
  // ===============================
  toggleTramite(index: number): void {
    const t = this.tramites[index];
    t.open = !t.open;

    if (t.open) {
      t.docsOpen = false;
      t.requisitosOpen = false;
    }
  }

  // ===============================
  // ✅ Acordeones internos
  // ===============================
  toggleDocs(index: number): void {
    this.tramites[index].docsOpen = !this.tramites[index].docsOpen;
  }

  toggleRequisitos(index: number): void {
    this.tramites[index].requisitosOpen = !this.tramites[index].requisitosOpen;
  }

  // ==========================
  // ✅ BENEFICIOS (si los usas en HTML)
  // ==========================
  beneficios = [
    {
      title: 'Asesoría<br>Personalizada',
      icon: 'assets/asesoria.svg',
      iconHover: 'assets/asesoria-hover.svg',
      hover: false,
    },
    {
      title: 'Sin vueltas<br>innecesarias',
      icon: 'assets/vueltas.svg',
      iconHover: 'assets/vueltas-hover.svg',
      hover: false,
    },
    {
      title: 'Seguridad<br>Jurídica',
      icon: 'assets/seguridad.svg',
      iconHover: 'assets/seguridad-hover.svg',
      hover: false,
    },
  ];

  // ==========================
  // ❓ FAQ
  // ==========================
  faqItems: FaqItem[] = [
    {
      question: '¿Es seguro el servicio?',
      answer:
        'Sí. AutoMás cuenta con sedes a nivel nacional, garantizando seguridad y trazabilidad en cada proceso.',
    },
    {
      question: '¿Qué pasa si no puedo asistir?',
      answer: 'Podrás reprogramar tu cita en el momento en que lo desees.',
    },
    {
      question: '¿Quién paga el traspaso de un carro?',
      answer:
        'En la mayoría de los casos, el pago se realiza entre el comprador y el vendedor.',
    },
  ];

  // ==========================
  // 📰 NOTICIAS (Blog)
  // ==========================
  noticiasTitle = 'Últimas noticias';

  noticiaDestacada: NewsCard = {
    imageSrc: 'assets/blog-principal.jpg',
    imageAlt: 'Noticia destacada',
    badge: 'Trámites Vehiculares',
    title: 'Trámites sin vueltas: lo que debes tener listo',
    description:
      'Conoce los documentos y requisitos clave antes de iniciar tu trámite.',
    ctaText: 'Leer más',
    href: '/noticias/tramites-sin-vueltas',
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
      title: 'Traspaso: pasos y errores comunes',
      ctaText: 'Leer más',
      href: '/noticias/traspaso-pasos-errores',
    },
    {
      imageSrc: 'assets/blog3.jpg',
      imageAlt: 'Noticia 3',
      title: 'Prenda: cómo levantarla correctamente',
      ctaText: 'Leer más',
      href: '/noticias/levantamiento-prenda',
    },
  ];
}