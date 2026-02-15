import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllDeliverymanComponent } from './all-deliveryman.component';

describe('AllDeliverymanComponent', () => {
  let component: AllDeliverymanComponent;
  let fixture: ComponentFixture<AllDeliverymanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllDeliverymanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllDeliverymanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
