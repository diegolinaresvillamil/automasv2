import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagoFallido } from './pago-fallido';

describe('PagoFallido', () => {
  let component: PagoFallido;
  let fixture: ComponentFixture<PagoFallido>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagoFallido]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagoFallido);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
