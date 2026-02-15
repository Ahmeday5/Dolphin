import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
})
export class DatePickerComponent implements OnInit {
  selectedDate: string = ''; // لتخزين التاريخ المحدد

  // دالة لتحديث التاريخ عند التغيير
  onDateChange(event: any) {
    this.selectedDate = event.target.value;
    console.log('Selected Date:', this.selectedDate);
  }

  ngOnInit() {
    // تعيين تاريخ اليوم كتاريخ افتراضي
    this.selectedDate = new Date().toISOString().split('T')[0];
  }
}
