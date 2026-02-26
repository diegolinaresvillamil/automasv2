import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';

export const routes: Routes = [
  { path: '', component: Inicio }, // Home

  // ===============================
  // 🚗 Revisión Técnico Mecánica
  // ===============================
  {
    path: 'revision-tecnico-mecanica',
    loadComponent: () =>
      import('./pages/revision-tecnico-mecanica/revision-tecnico-mecanica')
        .then(m => m.RevisionTecnicoMecanica)
  },

  // ===============================
  // 🔍 Peritaje / Avalúo
  // ===============================
  {
    path: 'peritaje',
    loadComponent: () =>
      import('./pages/peritaje/peritaje')
        .then(m => m.Peritaje)
  },

  // ===============================
  // 📄 Trámites Vehiculares
  // ===============================
  {
    path: 'tramites',
    loadComponent: () =>
      import('./pages/tramites/tramites')
        .then(m => m.Tramites)
  },

  // ===============================
  // 💎 CertiMás
  // ===============================
  {
    path: 'certimas',
    loadComponent: () =>
      import('./pages/certimas/certimas')
        .then(m => m.Certimas)
  },

  // ===============================
  // 🏙️ Landing dinámica por ciudad
  // Ej: /ciudad/bogota, /ciudad/medellin
  // ===============================
  {
    path: 'ciudad/:slug',
    loadComponent: () =>
      import('./pages/ciudad/ciudad')
        .then(m => m.Ciudad)
  },

  // ===============================
  // 💳 Estados de pago
  // ===============================
  {
    path: 'pago-exitoso',
    loadComponent: () =>
      import('./pages/pago-exitoso/pago-exitoso')
        .then(m => m.PagoExitosoComponent)
  },
  {
    path: 'pago-fallido',
    loadComponent: () =>
      import('./pages/pago-fallido/pago-fallido')
        .then(m => m.PagoFallidoComponent)
  },
  {
    path: 'pago-pendiente',
    loadComponent: () =>
      import('./pages/pago-pendiente/pago-pendiente')
        .then(m => m.PagoPendienteComponent)
  },

  // ===============================
  // 🔁 Fallback
  // ===============================
  { path: '**', redirectTo: '' }
];  