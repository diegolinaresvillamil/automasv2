import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ciudad } from './ciudad';

describe('Ciudad', () => {
  let component: Ciudad;
  let fixture: ComponentFixture<Ciudad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ciudad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Ciudad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
