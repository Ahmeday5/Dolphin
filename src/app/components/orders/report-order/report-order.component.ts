import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { firstValueFrom } from 'rxjs';
import {
  allOrder,
  OrdersResponse,
  UpdateOrderResponse,
} from '../../../types/order.type';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-report-order',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './report-order.component.html',
  styleUrl: './report-order.component.scss',
})
export class ReportOrderComponent implements OnInit {
  orders: allOrder[] = [];
  loading: boolean = true;
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 0;
  pages: [] = [];
  noOrderMessage: string | null = null;
  OrderMessage: string | null = null;
  totalItems: number = 0;
  clientName: string = '';
  orderDate: string = '';
  private searchTimeout: any;

  constructor(
    private notificationService: NotificationService,
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchAllOrders(
      this.currentPage,
      this.itemsPerPage,
      this.clientName,
      this.orderDate
    );
  }

  // دالة لجلب كل الموردين (مع استدعاء getVisiblePages)
  fetchAllOrders(
    page: number,
    pageSize: number,
    clientName: string,
    orderDate: string
  ) {
    this.loading = true;
    this.noOrderMessage = null;
    this.OrderMessage = null;

    const cleanClientName =
      clientName && clientName.trim() !== '' ? clientName : undefined;
    const cleanOrderDate =
      orderDate && orderDate.trim() !== '' ? orderDate : undefined;

    this.apiService
      .getAllorders(page, pageSize, cleanClientName, cleanOrderDate)
      .subscribe({
        next: (
          response: OrdersResponse | { error: boolean; message: string }
        ) => {
          console.log('API Response in Component:', response);
          if ('error' in response) {
            this.orders = [];
            this.noOrderMessage = response.message;
            this.totalItems = 0;
            this.totalPages = 0;
            this.pages = [];
          } else {
            this.orders = response.items || [];
            this.totalItems = response.totalItems || 0;
            this.totalPages =
              response.totalPages || Math.ceil(this.totalItems / pageSize);
            this.currentPage = response.page || page;
            this.itemsPerPage = response.pageSize || pageSize;

            if (this.orders.length === 0) {
              if (cleanClientName && cleanOrderDate) {
                this.noOrderMessage = `لا يوجد اسم عميل يطابق البحث "${cleanClientName}" في النطاق الزمني ${cleanOrderDate}`;
              } else if (cleanClientName) {
                this.noOrderMessage = `لا يوجد اسم عميل يطابق البحث "${cleanClientName}"`;
              } else if (cleanOrderDate) {
                this.noOrderMessage = `لا يوجد طلبات في النطاق الزمني ${cleanOrderDate}`;
              } else {
                this.noOrderMessage = 'لا يوجد طلبات متاحة';
              }
            }
          }

          console.log('Extracted orders:', this.orders);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Unexpected error in fetchAllOrders:', error);
          this.orders = [];
          this.noOrderMessage = 'حدث خطأ غير متوقع في جلب الطلبات';
          this.totalItems = 0;
          this.totalPages = 0;
          this.pages = [];
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // دالة لمعالجة إدخال البحث (بحث فوري مع debounce)
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.clientName = value;
      this.currentPage = 1;
      this.fetchAllOrders(
        this.currentPage,
        this.itemsPerPage,
        this.clientName,
        this.orderDate
      );
    }, 300);
  }

  onDateChange(): void {
    this.currentPage = 1;
    this.fetchAllOrders(
      this.currentPage,
      this.itemsPerPage,
      this.clientName,
      this.orderDate
    );
  }

  // دالة لتغيير الصفحة (مع التحقق من الـ Type)
  onPageChange(page: number | undefined): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchAllOrders(
        this.currentPage,
        this.itemsPerPage,
        this.clientName,
        this.orderDate
      );
    }
  }

  deleteOrder(id: number) {
    if (confirm('هل أنت متأكد من حذف هذه الطلب')) {
      this.loading = true;
      this.apiService.deleteOrder(id).subscribe({
        next: (response) => {
          this.OrderMessage = 'تم حذف الطلب بنجاح';
          setTimeout(() => {
            this.OrderMessage = null;
            this.fetchAllOrders(
              this.currentPage,
              this.itemsPerPage,
              this.clientName,
              this.orderDate
            );
          }, 2000);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`خطأ في حذف الطلب ${id}:`, error);
          this.noOrderMessage = 'فشل حذف الطلب';
          this.loading = false;
          setTimeout(() => {
            this.noOrderMessage = null;
          }, 2000);
          this.cdr.detectChanges();
        },
      });
    }
  }

  // دالة لتنسيق التاريخ
  formatDate(date: string): string {
    return date.split('T')[0]; // استخراج YYYY-MM-DD فقط
  }

  formatHour(hour: string): string {
    const timePart = hour.split('T')[1]; // استخراج التوقيت
    return timePart.split('.')[0]; // استخراج الجزء قبل النقطة: "14:36:01"
  }

  // دالة للذهاب لصفحة التعديل
  editorders(id: number) {
    this.router.navigate(['/editReportOrder', id]);
  }
}
