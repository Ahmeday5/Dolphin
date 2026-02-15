import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { Admin, AdminsResponse } from '../../../types/admin.type';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-all-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './all-admin.component.html',
  styleUrl: './all-admin.component.scss',
})
export class AllAdminComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  @ViewChild('form', { static: false, read: ElementRef })
  formElement!: ElementRef<HTMLFormElement>;
  isLoadingForm: boolean = false;
  private emailSearchTimeout: any;
  showPassword: boolean = false;

  admin = {
    email: '',
    password: '',
    roles: '',
  };

  /******table******/
  admins: Admin[] = [];
  displayedAdmins: Admin[] = [];
  loading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 0;
  pages: number[] = [];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.fetchAdmins();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async handleSubmit(): Promise<void> {
    const formElement = this.formElement.nativeElement;

    if (!formElement.checkValidity()) {
      formElement.classList.add('was-validated');
      this.form.control.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoadingForm = true;

    const body = {
      email: this.admin.email,
      password: this.admin.password,
      role: this.admin.roles,
    };

    try {
      const response = await firstValueFrom(this.apiService.addAdmin(body));
      console.log('Response from Add admin API:', response);
      if (response.success) {
        this.successMessage = 'تم إضافة المستخدم بنجاح';
        this.form.resetForm();
        this.admin = {
          email: '',
          password: '',
          roles: '',
        };
        formElement.classList.remove('was-validated');
        this.isLoadingForm = false;
        setTimeout(() => {
          this.successMessage = ''; // إفراغ رسالة النجاح بعد 3 ثواني
          this.fetchAdmins(); // تحديث الجدول
        }, 3000);
      } else {
        this.errorMessage = 'فشل في إضافة المستخدم';
      }
    } catch (error: any) {
      this.isLoadingForm = false;
      let errorMessage = 'حدث خطأ أثناء الإضافة';
      if (error && error.message) {
        errorMessage = error.message;
      }
      this.errorMessage = errorMessage;
      console.error('خطأ في إضافة المستخدم:', error);
    } finally {
      this.isLoadingForm = false; // إيقاف السبينر
    }
  }

  // جلب جميع المستخدمين
  async fetchAdmins(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response = await firstValueFrom(this.apiService.getAllAdmin());
      this.admins = response || [];
      if (this.admins.length === 0) {
        this.errorMessage = 'لا يوجد مستخدم متاحين';
      }
      this.updatePagination();
      console.log('كل المستخدم:', this.admins);
      this.loading = false;
    } catch (error: any) {
      console.error('فشل في جلب المستخدم:', error);
      this.errorMessage = error.message || 'حدث خطأ أثناء جلب المستخدم';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /************ delete Admin ******************/
  deleteAdmin(id: string) {
    if (confirm('هل أنت متأكد من حذف هذه المستخدم')) {
      this.loading = true;
      this.apiService.deleteAdmins(id).subscribe({
        next: (response) => {
          this.successMessage = 'تم حذف المستخدم بنجاح';
          setTimeout(() => {
            this.successMessage = null;
            this.fetchAdmins();
          }, 2000);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`خطأ في حذف المستخدم ${id}:`, error);
          this.errorMessage = 'فشل حذف المستخدم';
          this.loading = false;
          setTimeout(() => {
            this.errorMessage = null;
          }, 2000);
          this.cdr.detectChanges();
        },
      });
    }
  }

  // دالة لتحديث الـ Pagination وتحديد الدكاترة المعروضين
  updatePagination() {
    this.totalPages = Math.ceil(this.admins.length / this.itemsPerPage); // حساب إجمالي الصفحات
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1); // إنشاء مصفوفة الأرقام (1, 2, 3, ...)
    this.updateDisplayedAdmins(); // تحديث الدكاترة المعروضين بناءً على الصفحة الحالية
  }

  // دالة لتحديث الدكاترة المعروضين حسب الصفحة
  updateDisplayedAdmins() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage; // بداية النطاق
    const endIndex = startIndex + this.itemsPerPage; // نهاية النطاق
    this.displayedAdmins = this.admins.slice(startIndex, endIndex); // استخراج الدكاترة المعروضين
  }

  // دالة لتغيير الصفحة
  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page; // تحديث الصفحة الحالية
      this.updateDisplayedAdmins(); // تحديث الدكاترة المعروضين
    }
  }

  // دالة للذهاب لصفحة التعديل
  editAdmin(id: string) {
    this.router.navigate(['/editAdmin', id]);
  }
}
