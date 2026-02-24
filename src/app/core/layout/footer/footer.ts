import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type FooterLink = { label: string; href: string };
type SocialLink = { name: string; href: string; icon: string; aria: string };

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  year = new Date().getFullYear();

  legalLinks: FooterLink[] = [
    { label: 'Términos y Condiciones', href: '/terminos-y-condiciones' },
    { label: 'Autorización y Política', href: '/autorizacion-y-politica' },
    { label: 'Tratamiento datos Personales', href: '/tratamiento-datos' },
    { label: 'Preguntas Frecuentes', href: '/preguntas-frecuentes' },
    { label: 'Línea ética AutoMás', href: '/linea-etica' },
    { label: 'Política de Privacidad', href: '/politica-privacidad' },
  ];

  nosotrosLinks: FooterLink[] = [
    { label: 'Nuestra Empresa', href: '/nosotros' },
    { label: 'Trabaja con Nosotros', href: '/trabaja-con-nosotros' },
    { label: 'Corporativo', href: '/corporativo' },
    { label: 'Manual Gráfico', href: '/manual-grafico' },
    { label: 'Guías Digitales', href: '/guias-digitales' },
  ];

  intranetLinks: FooterLink[] = [
    { label: 'SIGA', href: '/intranet/siga' },
    { label: 'Cuponera', href: '/intranet/cuponera' },
    { label: 'Requerimientos Internos', href: '/intranet/requerimientos' },
    { label: 'Indicadores Power BI', href: '/intranet/powerbi' },
    { label: 'Hallazgos', href: '/intranet/hallazgos' },
    { label: 'Infraestructura', href: '/intranet/infraestructura' },
  ];

  contactLinks: FooterLink[] = [
    { label: 'Líneas Telefónicas', href: '/contacto/lineas-telefonicas' },
    { label: 'PQRSFA', href: '/pqrsfa' },
    { label: 'Encuestas', href: '/encuestas' },
  ];

  socials: SocialLink[] = [
    {
      name: 'Facebook',
      href: 'https://www.facebook.com/AUTOMASCDA?ref=ts',
      icon: 'bi-facebook',
      aria: 'Ir a Facebook de AutoMás',
    },
    {
      name: 'YouTube',
      href: 'https://www.youtube.com/channel/UC_Qvvtdbc2GXSb1sE3vQyww',
      icon: 'bi-youtube',
      aria: 'Ir a YouTube de AutoMás',
    },
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/automascda/',
      icon: 'bi-instagram',
      aria: 'Ir a Instagram de AutoMás',
    },
    {
      name: 'LinkedIn',
      href: 'https://www.linkedin.com/in/cda-autom%C3%A1s-comercial-474041228/',
      icon: 'bi-linkedin',
      aria: 'Ir a LinkedIn de AutoMás',
    },
    {
      name: 'TikTok',
      href: 'https://www.tiktok.com/@cda_automas?_t=8kGT35W9gCT&_r=1',
      icon: 'bi-tiktok',
      aria: 'Ir a TikTok de AutoMás',
    },
  ];

  googlePlay = {
    href: 'https://play.google.com/store/apps/details?id=com.automas.application',
    img: 'assets/googleplay.png',
    alt: 'Descargar en Google Play',
  };

  appStore = {
    href: 'https://apps.apple.com/co/app/autom%C3%A1s/id1576258029',
    img: 'assets/appstore.png',
    alt: 'Descargar en App Store',
  };
}
