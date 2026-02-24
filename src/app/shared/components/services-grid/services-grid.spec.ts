import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicesGrid } from './services-grid';

describe('ServicesGrid', () => {
  let component: ServicesGrid;
  let fixture: ComponentFixture<ServicesGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServicesGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
