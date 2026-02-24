import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreliquidacionTramites } from './preliquidacion-tramites';

describe('PreliquidacionTramites', () => {
  let component: PreliquidacionTramites;
  let fixture: ComponentFixture<PreliquidacionTramites>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreliquidacionTramites]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreliquidacionTramites);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
