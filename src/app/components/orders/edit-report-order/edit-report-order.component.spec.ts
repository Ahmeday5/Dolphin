import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditReportOrderComponent } from './edit-report-order.component';

describe('EditReportOrderComponent', () => {
  let component: EditReportOrderComponent;
  let fixture: ComponentFixture<EditReportOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditReportOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditReportOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
