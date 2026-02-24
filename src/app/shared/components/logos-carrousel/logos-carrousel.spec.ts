import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogosCarrousel } from './logos-carrousel';

describe('LogosCarrousel', () => {
  let component: LogosCarrousel;
  let fixture: ComponentFixture<LogosCarrousel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogosCarrousel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogosCarrousel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
