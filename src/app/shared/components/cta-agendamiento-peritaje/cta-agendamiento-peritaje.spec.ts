import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CtaAgendamientoPeritaje } from './cta-agendamiento-peritaje';

describe('CtaAgendamientoPeritaje', () => {
  let component: CtaAgendamientoPeritaje;
  let fixture: ComponentFixture<CtaAgendamientoPeritaje>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CtaAgendamientoPeritaje]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CtaAgendamientoPeritaje);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
