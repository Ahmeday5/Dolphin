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
import { allOrder, UpdateOrderResponse } from '../../../types/order.type';

@Component({
  selector: 'app-edit-report-order',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-report-order.component.html',
  styleUrl: './edit-report-order.component.scss',
})
export class EditReportOrderComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  @ViewChild('form', { static: false, read: ElementRef })
  formElement!: ElementRef<HTMLFormElement>;

  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';

  // لتخزين بيانات العملاء والسائقين
  clients: { id: number; name: string }[] = [];
  deliveryMen: { id: number; name: string }[] = [];

  // Object بسيط للـ order للتعديل
  order: {
    id: number;
    amount: number;
    address: string;
    client: string;
    deliveryMan: string;
    orderLocation: string;
    orderCode: string;
    notes: string;
  } = {
    id: 0,
    amount: 0,
    address: '',
    client: '',
    deliveryMan: '',
    orderLocation: '',
    orderCode: '',
    notes: '',
  };

  orderEdit: {
    id: number;
    amount: number;
    address: string;
    clientId: number;
    deliveryManId: number;
    orderLocation: string;
    orderCode: string;
    notes: string;
  } = {
    id: 0,
    amount: 0,
    address: '',
    clientId: 0,
    deliveryManId: 0,
    orderLocation: '',
    orderCode: '',
    notes: '',
  };

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadOrderDetails();
    await this.loadClientsAndDeliveryMen();
  }

  async loadOrderDetails() {
    this.isLoading = true;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        // أضفت pageSize=1000 عشان نضمن جلب كل الـ admins (لو أكتر من 10)
        const data = await firstValueFrom(
          this.apiService.getAllorders(1, 1000, '', '')
        );
        console.log('استجابة API للـ orders:', data);
        // فلترة الـ admin بناءً على ID
        const orderFromAPI = data.items.find((ad: allOrder) => ad.id === +id);
        if (orderFromAPI) {
          this.order = {
            id: orderFromAPI.id,
            amount: orderFromAPI.amount,
            address: orderFromAPI.address,
            client: orderFromAPI.client,
            deliveryMan: orderFromAPI.deliveryMan,
            orderLocation: orderFromAPI.orderLocation,
            orderCode: orderFromAPI.orderCode,
            notes: orderFromAPI.notes,
          };
          this.orderEdit = {
            id: orderFromAPI.id,
            amount: orderFromAPI.amount,
            address: orderFromAPI.address,
            clientId: 0, // سيتم تحديثه بعد جلب العملاء
            deliveryManId: 0, // سيتم تحديثه بعد جلب السائقين
            orderLocation: orderFromAPI.orderLocation,
            orderCode: orderFromAPI.orderCode,
            notes: orderFromAPI.notes,
          };
        } else {
          this.errorMessage = 'لم يتم العثور على الطلب';
        }
      } catch (error) {
        this.errorMessage = 'فشل في جلب بيانات الطلب';
        console.error('خطأ في جلب بيانات الطلب:', error);
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    } else {
      this.errorMessage = 'معرف الطلب غير موجود';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadClientsAndDeliveryMen(): Promise<void> {
    try {
      // جلب العملاء
      const clientsData = await firstValueFrom(this.apiService.getAllClients());
      this.clients = clientsData.items.map((client: any) => ({
        id: client.id,
        name: client.name,
      }));

      // جلب السائقين
      const deliveryMenData = await firstValueFrom(
        this.apiService.getAvailableDeliveryMen()
      );
      this.deliveryMen = deliveryMenData.map((dm: any) => ({
        id: dm.id,
        name: dm.name,
      }));

      // تحديث clientId و deliveryManId بناءً على الأسماء
      const selectedClient = this.clients.find(
        (client) => client.name === this.order.client
      );
      const selectedDeliveryMan = this.deliveryMen.find(
        (dm) => dm.name === this.order.deliveryMan
      );

      this.orderEdit.clientId = selectedClient ? selectedClient.id : 0;
      this.orderEdit.deliveryManId = selectedDeliveryMan
        ? selectedDeliveryMan.id
        : 0;

      this.cdr.detectChanges();
    } catch (error) {
      this.errorMessage = 'فشل في جلب بيانات العملاء أو السائقين';
      console.error('خطأ في جلب العملاء أو السائقين:', error);
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
      amount: this.orderEdit.amount,
      address: this.orderEdit.address,
      clientId: this.orderEdit.clientId,
      deliveryManId: this.orderEdit.deliveryManId,
      orderLocation: this.orderEdit.orderLocation,
      orderCode: this.orderEdit.orderCode,
      notes: this.orderEdit.notes,
    };

    try {
      const response = await firstValueFrom(
        this.apiService.updateOrdre(this.orderEdit.id, body)
      );
      console.log('Response from Update API:', response);
      if (response.success) {
        this.successMessage = 'تم تحديث بيانات الطلب بنجاح';
        this.isLoading = false;
        this.cdr.detectChanges();
        // redirect إلى قائمة الـ admins بعد 3 ثواني
        setTimeout(() => {
          this.router.navigate(['/reportOrder']);
        }, 3000);
      } else {
        this.errorMessage = 'فشل في تحديث بيانات الطلب';
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
      console.error('خطأ في تحديث الطلب:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
