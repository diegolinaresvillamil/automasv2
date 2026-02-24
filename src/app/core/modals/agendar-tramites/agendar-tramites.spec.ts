import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgendarTramites } from './agendar-tramites';

describe('AgendarTramites', () => {
  let component: AgendarTramites;
  let fixture: ComponentFixture<AgendarTramites>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendarTramites]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgendarTramites);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
