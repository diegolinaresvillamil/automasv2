import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperienciaGrid } from './experiencia-grid';

describe('ExperienciaGrid', () => {
  let component: ExperienciaGrid;
  let fixture: ComponentFixture<ExperienciaGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperienciaGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExperienciaGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
