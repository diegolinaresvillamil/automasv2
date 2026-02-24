import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeroCarousel } from './hero-carousel';

describe('HeroCarousel', () => {
  let component: HeroCarousel;
  let fixture: ComponentFixture<HeroCarousel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroCarousel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeroCarousel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
