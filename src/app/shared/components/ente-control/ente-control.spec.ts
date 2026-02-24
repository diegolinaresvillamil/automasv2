import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnteControl } from './ente-control';

describe('EnteControl', () => {
  let component: EnteControl;
  let fixture: ComponentFixture<EnteControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnteControl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnteControl);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
