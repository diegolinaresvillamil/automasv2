import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

// ✅ MODAL CIUDAD
import { CiudadModalComponent } from '../../modals/ciudad-modal/ciudad-modal';
import { CiudadModalService } from '../../modals/ciudad-modal/ciudad-modal.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CiudadModalComponent, // ✅ agregar
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class Header {
  // ===============================
  // 🔹 CONTROL DE MENÚS
  // ===============================
  topMenuOpen = false;
  navMenuOpen = false;

  // ✅ Service modal ciudad
  private ciudadModalSvc = inject(CiudadModalService);

  constructor(private router: Router) {
    // ✅ Cuando se navega a otra ruta, cierra los menús automáticamente
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.navMenuOpen = false;
        this.topMenuOpen = false;
      });
  }

  // 🟠 Abre/cierra el menú superior (elige ciudad, whatsapp, etc.)
  toggleTopMenu(): void {
    this.topMenuOpen = !this.topMenuOpen;
  }

  // ⚪ Abre/cierra el menú principal (Tecnomecánica, etc.)
  toggleNavMenu(): void {
    this.navMenuOpen = !this.navMenuOpen;
  }

  // ✅ Cierra el menú principal al seleccionar una opción (opcional)
  closeNavMenu(): void {
    this.navMenuOpen = false;
  }

  // ✅ Opcional: cierra el menú superior también
  closeTopMenu(): void {
    this.topMenuOpen = false;
  }

  // ===============================
  // 🏙️ MODAL: ELEGIR CIUDAD
  // ===============================
  abrirModalCiudad(): void {
    // (opcional) cerrar menús para que no queden encima
    this.navMenuOpen = false;
    this.topMenuOpen = false;

    this.ciudadModalSvc.open();
  }

  cerrarModalCiudad(): void {
    this.ciudadModalSvc.close();
  }
}