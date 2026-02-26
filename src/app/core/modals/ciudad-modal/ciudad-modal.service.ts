import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CiudadModalService {
  private _open = signal(false);

  open() {
    this._open.set(true);
    document.body.style.overflow = 'hidden'; // Evita scroll al abrir modal
  }

  close() {
    this._open.set(false);
    document.body.style.overflow = '';
  }

  isOpen(): boolean {
    return this._open();
  }
}
