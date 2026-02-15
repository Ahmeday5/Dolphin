import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import {
  catchError,
  firstValueFrom,
  map,
  Observable,
  of,
  throwError,
} from 'rxjs';
import { OrdersResponse, UpdateOrderResponse } from '../types/order.type';
import { ClientsResponse } from '../types/client.type';
import { DeliverymenResponse } from '../types/deliverymen.type';
import { Admin } from '../types/admin.type';
import { InDeliveryOrders } from '../types/InDeliveryOrders.type';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'http://78.89.159.126:9393/PharmacyDolphenAPI';

  constructor(private http: HttpClient) {}

  /****************************************************client******************************************************/
  addClient(body: {
    name: string;
    phoneNumber: string;
    address: string;
  }): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    });

    return this.http
      .post(`${this.baseUrl}/api/Dashboard/addClient`, body, { headers })
      .pipe(
        map((response: any) => {
          const success = response.message
            .toLowerCase()
            .includes('successfully');
          return {
            success,
            message: success ? 'تم إضافة العميل بنجاح' : response.message,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('خطأ في إضافة العميل:', error);
          let errorMessage = 'حدث خطأ أثناء الإرسال';
          if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          }
          return throwError(() => ({ success: false, message: errorMessage }));
        })
      );
  }

  /****all client****/
  getAllClients(
    page?: number,
    pageSize?: number,
    clientName?: string
  ): Observable<ClientsResponse> {
    const token = localStorage.getItem('token');
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }
    console.log('Token being sent:', token ? 'Present' : 'Missing');

    let url = `${this.baseUrl}/api/Dashboard/getAllClients`;
    let params: string[] = [];

    if (page !== undefined) {
      params.push(`page=${page}`);
    }
    if (pageSize !== undefined) {
      params.push(`pageSize=${pageSize}`);
    }
    if (clientName !== undefined && clientName.trim() !== '') {
      params.push(`name=${encodeURIComponent(clientName)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    console.log('Request URL:', url);

    return this.http.get<ClientsResponse>(url, { headers }).pipe(
      map((response) => {
        console.log('API Response:', response);
        return (
          response || {
            items: [],
            page: page || 1,
            pageSize: pageSize || 10,
            totalItems: 0,
            totalPages: 1,
          }
        );
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching orders:', error);
        let errorMessage = 'فشل جلب الطلبات';
        if (error.status === 0) {
          errorMessage = 'فشل الاتصال بالخادم. تحقق من الشبكة.';
        } else if (error.status === 401) {
          errorMessage = 'غير مصرح لك. يرجى تسجيل الدخول مرة أخرى.';
        } else if (error.status === 404) {
          errorMessage = 'الطلبات غير موجودة.';
          return of({
            items: [],
            page: page || 1,
            pageSize: pageSize || 10,
            totalItems: 0,
            totalPages: 1,
            errorMessage,
          });
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }
        return of({
          items: [],
          page: page || 1,
          pageSize: pageSize || 10,
          totalItems: 0,
          totalPages: 1,
          errorMessage,
        });
      })
    );
  }

  /*****update client*****/

  updateClient(
    id: number,
    body: {
      name: string;
      phoneNumber: string;
      address: string;
    }
  ): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });

    return this.http
      .put(`${this.baseUrl}/api/Dashboard/updateClient/${id}`, body, {
        headers,
        responseType: 'text', // نص بسيط زي "Client updated successfully"
      })
      .pipe(
        map((response: string) => {
          // تحقق من الاستجابة بناءً على النص بدقة أكبر
          const lowerCaseResponse = response.toLowerCase().trim(); // تحويل لصغير وإزالة المسافات
          if (lowerCaseResponse.includes('successfully')) {
            return { success: true, message: response }; // نجاح
          } else {
            return { success: false, message: response }; // فشل
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('خطأ في تحديث العميل:', error);
          let errorMessage = 'حدث خطأ أثناء التحديث';
          if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.status) {
            errorMessage = `خطأ ${error.status}: ${error.statusText}`;
          }
          return throwError(() => ({ success: false, message: errorMessage }));
        })
      );
  }

  //مسح العميل
  deleteClient(id: number): Observable<string> {
    const token = localStorage.getItem('token');
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }
    const url = `${this.baseUrl}/api/Dashboard/deleteClient/${id}`;
    return this.http
      .delete<string>(url, { headers, responseType: 'text' as 'json' })
      .pipe(
        catchError((error) => {
          console.error(`خطأ في حذف العميل ${id}:`, error);
          return throwError(() => new Error(`فشل حذف العميل ${id}`));
        })
      );
  }
  /****************************************************AvailableDeliveryMan**************************************/

  addDeliverymen(body: FormData): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });

    return this.http
      .post(`${this.baseUrl}/api/Dashboard/addDeliveryman`, body, {
        headers,
        responseType: 'text',
      })
      .pipe(
        map((response: string) => {
          const lowerCaseResponse = response.toLowerCase().trim();
          const success = lowerCaseResponse.includes('successfully');
          return {
            success,
            message: success ? 'تم إضافة المندوب بنجاح' : response,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'حدث خطأ أثناء الإرسال';
          if (error.error && error.error.message) {
            errorMessage = error.error.message; // مثل "Email already exists"
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
          return throwError(() => ({ success: false, message: errorMessage }));
        })
      );
  }

  getAvailableDeliveryMen(): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }
    return this.http
      .get<any>(`${this.baseUrl}/api/Dashboard/getAvailableDeliveryMen`, {
        headers,
      })
      .pipe(
        catchError((error) => {
          console.error('خطأ في جلب الدليفري:', error);
          return throwError(() => new Error('فشل جلب الدليفري'));
        })
      );
  }

  /****all Deliverymen****/
  getAllDeliverymen(
    page?: number,
    pageSize?: number,
    Deliverymenname?: string,
    Deliveremail?: string
  ): Observable<DeliverymenResponse> {
    const token = localStorage.getItem('token');
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
      console.log('Sending request with token:', token.slice(0, 20) + '...');
    } else {
      console.warn('No token found for getAllDeliverymen');
    }

    console.log('Token being sent:', token ? 'Present' : 'Missing');

    let url = `${this.baseUrl}/api/Dashboard/getAllDeliverymen`;
    let params: string[] = [];

    if (page !== undefined) {
      params.push(`page=${page}`);
    }
    if (pageSize !== undefined) {
      params.push(`pageSize=${pageSize}`);
    }
    if (Deliverymenname !== undefined && Deliverymenname.trim() !== '') {
      params.push(`name=${encodeURIComponent(Deliverymenname)}`);
    }
    if (Deliveremail !== undefined && Deliveremail.trim() !== '') {
      params.push(`email=${encodeURIComponent(Deliveremail)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    console.log('Request URL:', url);

    return this.http.get<DeliverymenResponse>(url, { headers }).pipe(
      map((response) => {
        console.log('API Response:', response);
        return (
          response || {
            items: [],
            page: page || 1,
            pageSize: pageSize || 10,
            totalItems: 0,
            totalPages: 1,
          }
        );
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching orders:', error);
        let errorMessage = 'فشل جلب المندوبين';
        if (error.status === 0) {
          errorMessage = 'فشل الاتصال بالخادم. تحقق من الشبكة.';
        } else if (error.status === 401) {
          errorMessage = 'غير مصرح لك. يرجى تسجيل الدخول مرة أخرى.';
        } else if (error.status === 404) {
          errorMessage = 'المندوبين غير موجودة.';
          return of({
            items: [],
            page: page || 1,
            pageSize: pageSize || 10,
            totalItems: 0,
            totalPages: 1,
            errorMessage,
          });
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }
        return of({
          items: [],
          page: page || 1,
          pageSize: pageSize || 10,
          totalItems: 0,
          totalPages: 1,
          errorMessage,
        });
      })
    );
  }

  /*****update Deliverymen*****/

  updateDeliverymen(id: number, body: FormData | any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      // لا تضيف Content-Type → يتم تلقائيًا مع FormData
    });

    const isFormData = body instanceof FormData;

    return this.http
      .put(`${this.baseUrl}/api/Dashboard/updateDeliveryman/${id}`, body, {
        headers,
        responseType: 'text',
      })
      .pipe(
        map((response: string) => {
          const lowerCaseResponse = response.toLowerCase().trim();
          const success = lowerCaseResponse.includes('successfully');
          return {
            success,
            message: success ? 'تم التحديث بنجاح' : response,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'حدث خطأ أثناء التحديث';
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
          return throwError(() => ({ success: false, message: errorMessage }));
        })
      );
  }

  //مسح المندوب
  deleteDeliverymen(id: number): Observable<string> {
    const token = localStorage.getItem('token');
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }
    const url = `${this.baseUrl}/api/Dashboard/deleteDeliveryman/${id}`;
    return this.http
      .delete<string>(url, { headers, responseType: 'text' as 'json' })
      .pipe(
        catchError((error) => {
          console.error(`خطأ في حذف المندوب ${id}:`, error);
          return throwError(() => new Error(`فشل حذف المندوب ${id}`));
        })
      );
  }

  /****************************************************Admin********************************************/

  addAdmin(body: {
    email: string;
    password: string;
    role: string;
  }): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    });

    return this.http
      .post(`${this.baseUrl}/api/Dashboard/addAppUser`, body, {
        headers,
        responseType: 'text',
      })
      .pipe(
        map((response: string) => {
          const lowerCaseResponse = response.toLowerCase().trim();
          const success = lowerCaseResponse.includes('successfully');
          return {
            success,
            message: success ? 'تم إضافة المستخدم بنجاح' : response,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'حدث خطأ أثناء الإرسال';
          if (error.error && error.error.message) {
            errorMessage = error.error.message; // مثل "Email already exists"
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
          return throwError(() => ({ success: false, message: errorMessage }));
        })
      );
  }

  /****all Admin****/
  getAllAdmin(): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }
    return this.http
      .get<Admin[]>(`${this.baseUrl}/api/Dashboard/getAllAppUsers`, { headers })
      .pipe(
        map((response) => {
          console.log('API Response:', response);
          return response || [];
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error fetching admins:', error);
          let errorMessage = 'فشل جلب المستخدم';
          if (error.status === 0) {
            errorMessage = 'فشل الاتصال بالخادم. تحقق من الشبكة.';
          } else if (error.status === 401) {
            errorMessage = 'غير مصرح لك. يرجى تسجيل الدخول مرة أخرى.';
          } else if (error.status === 404) {
            errorMessage = 'المستخدم غير موجودين.';
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /*****update Admin*****/

  updateAdmin(
    id: string,
    body: {
      email: string;
      password: string;
      role: string;
    }
  ): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });

    return this.http
      .put(`${this.baseUrl}/api/Dashboard/updateAppUser/${id}`, body, {
        headers,
        responseType: 'text', // نص بسيط زي "User Updated Successfully"
      })
      .pipe(
        map((response: string) => {
          // تحقق من الاستجابة بناءً على النص بدقة أكبر
          const lowerCaseResponse = response.toLowerCase().trim(); // تحويل لصغير وإزالة المسافات
          if (lowerCaseResponse.includes('successfully')) {
            return { success: true, message: response }; // نجاح
          } else {
            return { success: false, message: response }; // فشل
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('خطأ في تحديث المستخدم:', error);
          let errorMessage = 'حدث خطأ أثناء التحديث';
          if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.status) {
            errorMessage = `خطأ ${error.status}: ${error.statusText}`;
          }
          return throwError(() => ({ success: false, message: errorMessage }));
        })
      );
  }

  //مسح الادمن
  deleteAdmins(id: string): Observable<string> {
    const token = localStorage.getItem('token');
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }
    const url = `${this.baseUrl}/api/Dashboard/deleteAppUser/${id}`;
    return this.http
      .delete<string>(url, { headers, responseType: 'text' as 'json' })
      .pipe(
        catchError((error) => {
          console.error(`خطأ في حذف المستخدم ${id}:`, error);
          return throwError(() => new Error(`فشل حذف المستخدم ${id}`));
        })
      );
  }

  /***************************************************order************************************************************ */

  addOrder(body: {
    amount: string;
    address: string;
    deliveryManId: number;
    clientId: number;
  }): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    });

    return this.http
      .post(`${this.baseUrl}/api/Dashboard/addOrder`, body, { headers })
      .pipe(
        map((response: any) => {
          const success = response.message
            .toLowerCase()
            .includes('successfully');
          return {
            success,
            message: success ? 'تم إضافة الطلب بنجاح' : response.message,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('خطأ في إضافة الطلب:', error);
          let errorMessage = 'حدث خطأ أثناء الإرسال';
          if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          }
          return throwError(() => ({ success: false, message: errorMessage }));
        })
      );
  }

  // في ApiService
  async addOrderAndGetId(body: {
    amount: string;
    address: string;
    deliveryManId: number;
    clientId: number;
  }): Promise<number> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    });

    // 1. أضف الطلب
    await this.http
      .post(`${this.baseUrl}/api/Dashboard/addOrder`, body, { headers })
      .toPromise();

    // 2. انتظر ثانية واحدة حتى يُحفظ الطلب في قاعدة البيانات
    await new Promise((r) => setTimeout(r, 1000));

    // 2. اجلب آخر طلب (الأحدث)
    const ordersResponse = await firstValueFrom(
      this.http.get<any>(
        `${this.baseUrl}/api/Dashboard/getAllOrders?page=1&pageSize=1`,
        { headers }
      )
    );

    // 3. أرجع الـ id
    return ordersResponse.items[0]?.id;
  }

  // دالة جديدة لجلب كل الطلبات
  getAllorders(
    page?: number,
    pageSize?: number,
    clientName?: string,
    orderDate?: string
  ): Observable<OrdersResponse> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    console.log('Token being sent:', token ? 'Present' : 'Missing');

    let url = `${this.baseUrl}/api/Dashboard/getAllOrders`;
    let params: string[] = [];

    if (page !== undefined) {
      params.push(`page=${page}`);
    }
    if (pageSize !== undefined) {
      params.push(`pageSize=${pageSize}`);
    }
    if (clientName !== undefined && clientName.trim() !== '') {
      params.push(`clientName=${encodeURIComponent(clientName)}`);
    }
    if (orderDate !== undefined && orderDate.trim() !== '') {
      params.push(`orderDate=${encodeURIComponent(orderDate)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    console.log('Request URL:', url);

    return this.http.get<OrdersResponse>(url, { headers }).pipe(
      map((response) => {
        console.log('API Response:', response);
        return (
          response || {
            items: [],
            page: page || 1,
            pageSize: pageSize || 10,
            totalItems: 0,
            totalPages: 1,
          }
        );
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching orders:', error);
        let errorMessage = 'فشل جلب الطلبات';
        if (error.status === 0) {
          errorMessage = 'فشل الاتصال بالخادم. تحقق من الشبكة.';
        } else if (error.status === 401) {
          errorMessage = 'غير مصرح لك. يرجى تسجيل الدخول مرة أخرى.';
        } else if (error.status === 404) {
          errorMessage = 'الطلبات غير موجودة.';
          return of({
            items: [],
            page: page || 1,
            pageSize: pageSize || 10,
            totalItems: 0,
            totalPages: 1,
            errorMessage,
          });
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }
        return of({
          items: [],
          page: page || 1,
          pageSize: pageSize || 10,
          totalItems: 0,
          totalPages: 1,
          errorMessage,
        });
      })
    );
  }

  /*****update order*****/

  updateOrdre(
    id: number,
    body: {
      amount: number;
      address: string;
      clientId: number;
      deliveryManId: number;
    }
  ): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });

    return this.http
      .put(`${this.baseUrl}/api/Dashboard/updateOrder/${id}`, body, {
        headers,
        responseType: 'text', // نص بسيط زي "Order updated successfully"
      })
      .pipe(
        map((response: string) => {
          // تحقق من الاستجابة بناءً على النص بدقة أكبر
          const lowerCaseResponse = response.toLowerCase().trim(); // تحويل لصغير وإزالة المسافات
          if (lowerCaseResponse.includes('successfully')) {
            return { success: true, message: response }; // نجاح
          } else {
            return { success: false, message: response }; // فشل
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('خطأ في تحديث الطلب:', error);
          let errorMessage = 'حدث خطأ أثناء التحديث';
          if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.status) {
            errorMessage = `خطأ ${error.status}: ${error.statusText}`;
          }
          return throwError(() => ({ success: false, message: errorMessage }));
        })
      );
  }

  //مسح الطلب
  deleteOrder(id: number): Observable<string> {
    const token = localStorage.getItem('token');
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }
    const url = `${this.baseUrl}/api/Dashboard/deleteOrder/${id}`;
    return this.http
      .delete<string>(url, { headers, responseType: 'text' as 'json' })
      .pipe(
        catchError((error) => {
          console.error(`خطأ في حذف الطلب ${id}:`, error);
          return throwError(() => new Error(`فشل حذف الطلب ${id}`));
        })
      );
  }

  /****************************************InDeliveryOrders***************************************/
  getInDeliveryOrders(): Observable<any> {
    const token = localStorage.getItem('token');
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }
    return this.http
      .get<InDeliveryOrders[]>(
        `${this.baseUrl}/api/Dashboard/getInDeliveryOrders`,
        { headers }
      )
      .pipe(
        map((response) => {
          console.log('API Response:', response);
          return response || [];
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error fetching admins:', error);
          let errorMessage = 'فشل جلب طلب قيد التوصيل';
          if (error.status === 0) {
            errorMessage = 'فشل الاتصال بالخادم. تحقق من الشبكة.';
          } else if (error.status === 401) {
            errorMessage = 'غير مصرح لك. يرجى تسجيل الدخول مرة أخرى.';
          } else if (error.status === 404) {
            errorMessage = 'طلب قيد التوصيل غير موجودين.';
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  sendNotification(body: {
    deviceToken: string;
    title: string;
    body: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Notification/send`, body);
  }
}
