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
import {
  allDeliverymen,
  UpdateDeliverymenResponse,
} from '../../../types/deliverymen.type';

@Component({
  selector: 'app-edit-deliveryman',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-deliveryman.component.html',
  styleUrl: './edit-deliveryman.component.scss',
})
export class EditDeliverymanComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  @ViewChild('form', { static: false, read: ElementRef })
  formElement!: ElementRef<HTMLFormElement>;
  selectedFile: File | null = null;
  previewImage: string | null = null;

  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';

  // Object بسيط للـ order للتعديل
  deliverymen: {
    id: number;
    name: string;
    email: string;
    password: string;
    imageUrl: string;
  } = {
    id: 0,
    name: '',
    email: '',
    password: '',
    imageUrl: '',
  };

  newPassword: string = '';
  private readonly API_BASE_URL = 'http://78.89.159.126:9393/PharmacyDolphenAPI';

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadClientDetails();
  }

  // اضافة البيز قبل مسار الصورة
  getFullImageUrl(imageUrl?: string): string {
    if (!imageUrl) {
      return '/assets/img/logo.jpg'; // صورة افتراضية
    }
    const separator = imageUrl.startsWith('/') ? '' : '/';
    return `${this.API_BASE_URL}${separator}${imageUrl}`;
  }

  async loadClientDetails() {
    this.isLoading = true;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        // أضفت pageSize=1000 عشان نضمن جلب كل الـ admins (لو أكتر من 10)
        const data = await firstValueFrom(
          this.apiService.getAllDeliverymen(1, 1000, '', '')
        );
        console.log('استجابة API للـ deliverymen:', data);
        // فلترة الـ admin بناءً على ID
        const deliverymenFromAPI = data.items.find(
          (ad: allDeliverymen) => ad.id === +id
        );
        if (deliverymenFromAPI) {
          this.deliverymen = {
            id: deliverymenFromAPI.id,
            name: deliverymenFromAPI.name,
            email: deliverymenFromAPI.email ?? '',
            password: '',
            imageUrl: deliverymenFromAPI.imageUrl || '', // أضف هذا
          };
          this.newPassword = '';
        } else {
          this.errorMessage = 'لم يتم العثور على المندوب';
        }
      } catch (error) {
        this.errorMessage = 'فشل في جلب بيانات المندوب';
        console.error('خطأ في جلب بيانات المندوب:', error);
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    } else {
      this.errorMessage = 'معرف المندوب غير موجود';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
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
    this.isLoading = true;

    const formData = new FormData();
    formData.append('name', this.deliverymen.name);
    formData.append('email', this.deliverymen.email);

    // فقط لو المستخدم كتب كلمة مرور جديدة
    if (this.newPassword && this.newPassword.trim() !== '') {
      formData.append('password', this.newPassword.trim());
    }
    // لو فاضي → ما نرسلش حاجة → الـ backend هيحتفظ بالقديم

    if (this.selectedFile) {
      formData.append('Image', this.selectedFile, this.selectedFile.name);
    }

    try {
      const response = await firstValueFrom(
        this.apiService.updateDeliverymen(this.deliverymen.id, formData)
      );

      if (response.success) {
        this.successMessage = 'تم تحديث بيانات المندوب بنجاح';
        setTimeout(() => this.router.navigate(['/Deliverymen']), 3000);
      } else {
        this.errorMessage = response.message || 'فشل في التحديث';
      }
    } catch (error: any) {
      this.errorMessage = error.error?.message || 'حدث خطأ أثناء التحديث';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
