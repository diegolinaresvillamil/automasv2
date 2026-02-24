import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgendarPeritaje } from './agendar-peritaje';

describe('AgendarPeritaje', () => {
  let component: AgendarPeritaje;
  let fixture: ComponentFixture<AgendarPeritaje>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendarPeritaje]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgendarPeritaje);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
