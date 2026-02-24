import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CtaAgendamientoRtm } from './cta-agendamiento-rtm';

describe('CtaAgendamientoRtm', () => {
  let component: CtaAgendamientoRtm;
  let fixture: ComponentFixture<CtaAgendamientoRtm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CtaAgendamientoRtm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CtaAgendamientoRtm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
