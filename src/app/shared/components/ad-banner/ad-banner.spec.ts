import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdBanner } from './ad-banner';

describe('AdBanner', () => {
  let component: AdBanner;
  let fixture: ComponentFixture<AdBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdBanner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdBanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
