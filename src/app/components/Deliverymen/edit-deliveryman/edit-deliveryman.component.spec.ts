import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDeliverymanComponent } from './edit-deliveryman.component';

describe('EditDeliverymanComponent', () => {
  let component: EditDeliverymanComponent;
  let fixture: ComponentFixture<EditDeliverymanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDeliverymanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditDeliverymanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
