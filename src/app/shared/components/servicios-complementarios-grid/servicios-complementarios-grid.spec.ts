import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiciosComplementariosGrid } from './servicios-complementarios-grid';

describe('ServiciosComplementariosGrid', () => {
  let component: ServiciosComplementariosGrid;
  let fixture: ComponentFixture<ServiciosComplementariosGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiciosComplementariosGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiciosComplementariosGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
