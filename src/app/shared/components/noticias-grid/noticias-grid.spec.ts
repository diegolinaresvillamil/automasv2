import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticiasGrid } from './noticias-grid';

describe('NoticiasGrid', () => {
  let component: NoticiasGrid;
  let fixture: ComponentFixture<NoticiasGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticiasGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticiasGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
