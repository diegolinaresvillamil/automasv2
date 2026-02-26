import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Certimas } from './certimas';

describe('Certimas', () => {
  let component: Certimas;
  let fixture: ComponentFixture<Certimas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Certimas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Certimas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
