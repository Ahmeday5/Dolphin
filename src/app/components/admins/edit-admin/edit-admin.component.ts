import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Admin } from '../../../types/admin.type';

@Component({
  selector: 'app-edit-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-admin.component.html',
  styleUrl: './edit-admin.component.scss',
})
export class EditAdminComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  @ViewChild('form', { static: false, read: ElementRef })
  formElement!: ElementRef<HTMLFormElement>;

  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';

  // Object للـ admin للتعديل
  admin: {
    id: string;
    userName: string;
    email: string;
    passwordHash: string;
    roles: string;
  } = {
    id: '',
    userName: '',
    email: '',
    passwordHash: '',
    roles: '',
  };

  newPassword: string = '';  // حقل جديد للباسورد اللي هيتعدل (اختياري) – string صريح

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAdminDetails();
  }

  async loadAdminDetails() {
    this.isLoading = true;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        const data = await firstValueFrom(this.apiService.getAllAdmin());
        console.log('استجابة API للـ admin:', data);
        // فلترة الـ admin بناءً على ID
        const adminFromAPI = data.find((ad: Admin) => ad.id === id);
        if (adminFromAPI) {
          this.admin = {
            id: adminFromAPI.id,
            userName: adminFromAPI.userName,
            email: adminFromAPI.email,
            passwordHash: adminFromAPI.passwordHash,
            roles: Array.isArray(adminFromAPI.roles) ? adminFromAPI.roles[0] || '' : adminFromAPI.roles || '',  // تأكيد string
          };
          this.newPassword = '';  // فارغ دايماً – مش هيظهر الـ hash
        } else {
          this.errorMessage = 'لم يتم العثور على المستخدم';
        }
      } catch (error) {
        this.errorMessage = 'فشل في جلب بيانات المستخدم';
        console.error('خطأ في جلب بيانات المستخدم:', error);
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    } else {
      this.errorMessage = 'معرف المستخدم غير موجود';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async handleSubmit(): Promise<void> {
    // إضافة was-validated للـ Bootstrap feedback
    if (this.formElement) {
      this.formElement.nativeElement.classList.add('was-validated');
    }
    if (!this.form.valid) {
      // تصحيح: استخدم form.controls للـ template-driven form
      Object.keys(this.form.controls).forEach((key) => {
        this.form.controls[key].markAsTouched();
      });
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true; // بداية التحميل

    const body: any = {
      email: this.admin.email,
      role: this.admin.roles,  // string، زي الـ API
    };

    // أضف الباسورد فقط لو اليوزر دخل حاجة جديدة (string صريح)
    if (this.newPassword && this.newPassword.trim() !== '') {
      body.password = this.newPassword;
      console.log('الباسورد الجديد المرسل:', body.password);  // للديباج – شوفه في console
    } else {
      console.log('مش هيبعث باسورد – القديم هيفضل زي ما هو');  // للديباج
    }

    console.log('الـ body الكامل المرسل للـ API:', body);  // شوفه في console قبل الإرسال

    try {
      const response = await firstValueFrom(
        this.apiService.updateAdmin(this.admin.id, body)
      );
      console.log('Response from Update API:', response);
      if (response.success) {
        this.successMessage = 'تم تحديث بيانات المستخدم بنجاح';
        this.isLoading = false;
        this.cdr.detectChanges();
        // redirect إلى قائمة الـ admins بعد 3 ثواني
        setTimeout(() => {
          this.router.navigate(['/Admins']);
        }, 3000);
      } else {
        this.errorMessage = 'فشل في تحديث بيانات المستخدم';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    } catch (error: any) {
      let errorMessage = 'حدث خطأ أثناء التحديث';
      if (error && 'message' in error) {
        errorMessage = error.message;
      } else if (error instanceof HttpErrorResponse) {
        errorMessage =
          error.error || `خطأ ${error.status}: ${error.statusText}`;
      }
      this.errorMessage = errorMessage;
      console.error('خطأ في تحديث المستخدم:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
