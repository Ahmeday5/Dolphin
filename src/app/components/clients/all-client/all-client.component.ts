import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { firstValueFrom } from 'rxjs';
import { allClient, ClientsResponse } from '../../../types/client.type';

@Component({
  selector: 'app-all-client',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './all-client.component.html',
  styleUrl: './all-client.component.scss',
})
export class AllClientComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  @ViewChild('form', { static: false, read: ElementRef })
  formElement!: ElementRef<HTMLFormElement>;
  isLoadingForm: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  client = {
    name: '',
    phoneNumber: '',
    phoneNumber02: '',
    address: '',
    address02: '',
    location: '',
    clientCode: '',
  };

  /*****for table*****/
  clients: allClient[] = [];
  loading: boolean = true;
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 0;
  pages: [] = [];
  noClientMessage: string | null = null;
  ClientMessage: string | null = null;
  totalItems: number = 0;
  clientName: string = '';
  private searchTimeout: any;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    this.fetchAllClients(this.currentPage, this.itemsPerPage, this.clientName);
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
      const response = await firstValueFrom(this.apiService.addClient(body));
      console.log('Response from Add client API:', response);
      if (response.success) {
        this.successMessage = response.message;
        this.form.resetForm();
        this.client = {
          name: '',
          phoneNumber: '',
          phoneNumber02: '',
          address: '',
          address02: '',
          location: '',
          clientCode: '',
        };
        this.fetchAllClients(this.currentPage, this.itemsPerPage, this.clientName);
        formElement.classList.remove('was-validated');
        this.isLoadingForm = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      } else {
        this.errorMessage = 'فشل في إضافة العميل';
        this.isLoadingForm = false;
      }
    } catch (error: any) {
      this.isLoadingForm = false;
      let errorMessage = 'حدث خطأ أثناء الإضافة';
      if (error && 'message' in error) {
        errorMessage = error.message;
      }
      this.errorMessage = errorMessage;
      console.error('خطأ في إضافة العميل:', error);
    }
  }

  // دالة لجلب كل الموردين (مع استدعاء getVisiblePages)
  fetchAllClients(page: number, pageSize: number, clientName: string) {
    this.loading = true;
    this.noClientMessage = null;
    this.ClientMessage = null;

    const cleanName =
      clientName && clientName.trim() !== '' ? clientName : undefined;

    this.apiService.getAllClients(page, pageSize, cleanName).subscribe({
      next: (
        response: ClientsResponse | { error: boolean; message: string }
      ) => {
        console.log('API Response in Component:', response);
        if ('error' in response) {
          this.clients = [];
          this.noClientMessage = response.message;
          this.totalItems = 0;
          this.totalPages = 0;
          this.pages = [];
        } else {
          this.clients = response.items || [];
          this.totalItems = response.totalItems || 0;
          this.totalPages =
            response.totalPages || Math.ceil(this.totalItems / pageSize);
          this.currentPage = response.page || page;
          this.itemsPerPage = response.pageSize || pageSize;

          if (this.clients.length === 0) {
            if (cleanName) {
              this.noClientMessage = `لا يوجد اسم عميل يطابق البحث "${cleanName}"`;
            } else {
              this.noClientMessage = 'لا يوجد عملاء متاحة';
            }
          }
        }

        console.log('Extracted clients:', this.clients);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Unexpected error in fetchAllclients:', error);
        this.clients = [];
        this.noClientMessage = 'حدث خطأ غير متوقع في جلب العملاء';
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
      this.fetchAllClients(
        this.currentPage,
        this.itemsPerPage,
        this.clientName
      );
    }, 300);
  }

  onDateChange(): void {
    this.currentPage = 1;
    this.fetchAllClients(this.currentPage, this.itemsPerPage, this.clientName);
  }

  // دالة لتغيير الصفحة (مع التحقق من الـ Type)
  onPageChange(page: number | undefined): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchAllClients(
        this.currentPage,
        this.itemsPerPage,
        this.clientName
      );
    }
  }

  deleteClient(id: number) {
    if (confirm('هل أنت متأكد من حذف هذه العميل')) {
      this.loading = true;
      this.apiService.deleteClient(id).subscribe({
        next: (response) => {
          this.ClientMessage = 'تم حذف العميل بنجاح';
          setTimeout(() => {
            this.ClientMessage = null;
            this.fetchAllClients(
              this.currentPage,
              this.itemsPerPage,
              this.clientName
            );
          }, 2000);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`خطأ في حذف العميل ${id}:`, error);
          this.noClientMessage = 'فشل حذف العميل';
          this.loading = false;
          setTimeout(() => {
            this.noClientMessage = null;
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

  // دالة للذهاب لصفحة التعديل
  editClients(id: number) {
    this.router.navigate(['/editClient', id]);
  }
}
