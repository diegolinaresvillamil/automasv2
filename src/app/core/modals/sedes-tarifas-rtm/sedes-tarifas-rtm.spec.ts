import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SedesTarifasRtm } from './sedes-tarifas-rtm';

describe('SedesTarifasRtm', () => {
  let component: SedesTarifasRtm;
  let fixture: ComponentFixture<SedesTarifasRtm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SedesTarifasRtm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SedesTarifasRtm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
