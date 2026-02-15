import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface PaginationItem {
  type: 'page' | 'ellipsis';
  value?: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent implements OnChanges {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 0;
  @Input() windowSize: number = 2;

  @Output() pageChange = new EventEmitter<number>();

  pages: PaginationItem[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentPage'] || changes['totalPages']) {
      this.pages = this.getVisiblePages();
    }
  }

  // دالة لحساب الصفحات المرئية
  getVisiblePages(): PaginationItem[] {
    const visiblePages: PaginationItem[] = [];

    // لو الصفحات قليلة (أقل من أو تساوي 2 * windowSize + 1)، اعرض كلها
    if (this.totalPages <= 2 * this.windowSize + 1) {
      for (let i = 1; i <= this.totalPages; i++) {
        visiblePages.push({ type: 'page', value: i });
      }
      return visiblePages;
    }

    // أضف الصفحة الأولى دائمًا
    visiblePages.push({ type: 'page', value: 1 });

    // حساب بداية النافذة حول الصفحة الحالية
    let start = Math.max(2, this.currentPage - this.windowSize);
    let end = Math.min(this.totalPages - 1, this.currentPage + this.windowSize);

    // لو الصفحة الحالية قريبة من البداية، زد النافذة لليمين
    if (this.currentPage <= this.windowSize + 1) {
      end = 2 * this.windowSize + 1;
    }
    // لو قريبة من النهاية، زد النافذة للشمال
    else if (this.currentPage >= this.totalPages - this.windowSize) {
      start = this.totalPages - 2 * this.windowSize;
    }

    // أضف النقاط لو فيه فجوة بين 1 والنافذة
    if (start > 2) {
      visiblePages.push({ type: 'ellipsis' });
    }

    // أضف الصفحات في النافذة
    for (let i = start; i <= end; i++) {
      visiblePages.push({ type: 'page', value: i });
    }

    // أضف النقاط لو فيه فجوة بين النافذة والنهاية
    if (end < this.totalPages - 1) {
      visiblePages.push({ type: 'ellipsis' });
    }

    // أضف الصفحة الأخيرة دائمًا
    if (this.totalPages > 1) {
      visiblePages.push({ type: 'page', value: this.totalPages });
    }

    return visiblePages;
  }

 // دالة لتغيير الصفحة (مع التحقق من الـ Type وإرسال الحدث)
  onPageChange(page: number | undefined): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page); // إرسال الحدث للـ parent component
    }
  }
}
