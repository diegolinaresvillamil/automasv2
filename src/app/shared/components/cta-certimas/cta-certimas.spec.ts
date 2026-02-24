import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CtaCertimas } from './cta-certimas';

describe('CtaCertimas', () => {
  let component: CtaCertimas;
  let fixture: ComponentFixture<CtaCertimas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CtaCertimas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CtaCertimas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
