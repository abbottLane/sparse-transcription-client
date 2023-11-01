import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VadmapComponent } from './vadmap.component';

describe('VadmapComponent', () => {
  let component: VadmapComponent;
  let fixture: ComponentFixture<VadmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VadmapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VadmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
