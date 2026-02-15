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
import { allClient, UpdateClientResponse } from '../../../types/client.type';

@Component({
  selector: 'app-edit-client',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-client.component.html',
  styleUrl: './edit-client.component.scss',
})
export class EditClientComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  @ViewChild('form', { static: false, read: ElementRef })
  formElement!: ElementRef<HTMLFormElement>;

  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';

  // Object بسيط للـ order للتعديل
  client: {
    id: number;
    name: string;
    phoneNumber: string;
    phoneNumber02: string;
    address: string;
    address02: string;
    location: string;
    clientCode: string;
  } = {
    id: 0,
    name: '',
    phoneNumber: '',
    phoneNumber02: '',
    address: '',
    address02: '',
    location: '',
    clientCode: '',
  };

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadClientDetails();
  }

  async loadClientDetails() {
    this.isLoading = true;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        // أضفت pageSize=1000 عشان نضمن جلب كل الـ admins (لو أكتر من 10)
        const data = await firstValueFrom(
          this.apiService.getAllClients(1, 1000, '')
        );
        console.log('استجابة API للـ orders:', data);
        // فلترة الـ admin بناءً على ID
        const clientFromAPI = data.items.find((ad: allClient) => ad.id === +id);
        if (clientFromAPI) {
          this.client = {
            id: clientFromAPI.id,
            name: clientFromAPI.name,
            phoneNumber: clientFromAPI.phoneNumber,
            phoneNumber02: clientFromAPI.phoneNumber02,
            address: clientFromAPI.address,
            address02: clientFromAPI.address02,
            location: clientFromAPI.location,
            clientCode: clientFromAPI.clientCode,
          };
        } else {
          this.errorMessage = 'لم يتم العثور على العميل';
        }
      } catch (error) {
        this.errorMessage = 'فشل في جلب بيانات العميل';
        console.error('خطأ في جلب بيانات العميل:', error);
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    } else {
      this.errorMessage = 'معرف العميل غير موجود';
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
      // تصحيح: استخدم form.form للـ template-driven form
      Object.keys(this.form.controls).forEach((key) => {
        this.form.controls[key].markAsTouched();
      });
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true; // بداية التحميل

    const body = {
      name: this.client.name,
      phoneNumber: this.client.phoneNumber,
      phoneNumber02: this.client.phoneNumber02,
      address: this.client.address,
      address02: this.client.address02,
      location: this.client.location,
      clientCode: this.client.clientCode,
    };

    try {
      const response = await firstValueFrom(
        this.apiService.updateClient(this.client.id, body)
      );
      console.log('Response from Update API:', response);
      if (response.success) {
        this.successMessage = 'تم تحديث بيانات العميل بنجاح';
        this.isLoading = false;
        this.cdr.detectChanges();
        // redirect إلى قائمة الـ admins بعد 3 ثواني
        setTimeout(() => {
          this.router.navigate(['/Clients']);
        }, 3000);
      } else {
        this.errorMessage = 'فشل في تحديث بيانات العميل';
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
      console.error('خطأ في تحديث العميل:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
