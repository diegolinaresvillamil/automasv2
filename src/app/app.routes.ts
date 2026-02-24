import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';

export const routes: Routes = [
  { path: '', component: Inicio },   // Home
  { 
    path: 'pago-exitoso', 
    loadComponent: () => import('./pages/pago-exitoso/pago-exitoso').then(m => m.PagoExitosoComponent)
  },
  { 
    path: 'pago-fallido', 
    loadComponent: () => import('./pages/pago-fallido/pago-fallido').then(m => m.PagoFallidoComponent)
  },
  { 
    path: 'pago-pendiente', 
    loadComponent: () => import('./pages/pago-pendiente/pago-pendiente').then(m => m.PagoPendienteComponent)
  },
  { path: '**', redirectTo: '' }      // Fallback
];