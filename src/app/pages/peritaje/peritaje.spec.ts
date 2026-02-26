import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Peritaje } from './peritaje';

describe('Peritaje', () => {
  let component: Peritaje;
  let fixture: ComponentFixture<Peritaje>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Peritaje]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Peritaje);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
