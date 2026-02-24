import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SedesTarifasPeritaje } from './sedes-tarifas-peritaje';

describe('SedesTarifasPeritaje', () => {
  let component: SedesTarifasPeritaje;
  let fixture: ComponentFixture<SedesTarifasPeritaje>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SedesTarifasPeritaje]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SedesTarifasPeritaje);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
