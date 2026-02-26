import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { CiudadModalService } from './ciudad-modal.service';
import { CIUDADES, CiudadInfo } from '../../../pages/ciudad/data-ciudades';

function toSlug(input: string): string {
  // quita acentos/diacríticos, pasa a minúsculas y deja letras/números con guiones
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')       // espacios a guiones
    .replace(/^-+|-+$/g, '');          // sin guiones al inicio/fin
}

@Component({
  selector: 'app-ciudad-modal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ciudad-modal.html',
  styleUrls: ['./ciudad-modal.css']
})
export class CiudadModalComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private modalSvc = inject(CiudadModalService);

  // Lista de ciudades con slug SANEADO (aunque venga con acentos)
  ciudades: CiudadInfo[] = CIUDADES.map(c => ({
    ...c,
    slug: toSlug(c.slug || c.nombre)   // fuerza slug limpio
  }));

  currentSlug: string | null = null;
  navSub?: Subscription;

  ngOnInit(): void {
    this.readSlugFromUrl();
    // Actualiza el activo cuando cambias de ruta
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.readSlugFromUrl());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  private readSlugFromUrl() {
    const url = this.router.url || '';
    const m = url.match(/\/ciudad\/([^\/?#]+)/);
    this.currentSlug = m ? m[1] : null;
  }

  open(): boolean {
    return this.modalSvc.isOpen();
  }

  close(): void {
    this.modalSvc.close();
  }

  isActive(c: CiudadInfo): boolean {
    return !!this.currentSlug && this.currentSlug === toSlug(c.slug || c.nombre);
  }

  go(slug: string) {
    // Asegura slug saneado al navegar
    this.router.navigate(['/ciudad', toSlug(slug)]);
    this.close();
  }

  onBackdropClick(ev: MouseEvent) {
    const el = ev.target as HTMLElement;
    if (el.classList.contains('ciudad-backdrop')) this.close();
  }
}
