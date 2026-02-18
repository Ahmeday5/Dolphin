// src/app/services/realtime.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  DocumentData,
  setDoc,
  docData,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { InDeliveryOrders } from '../types/InDeliveryOrders.type';
import { allDeliverymen } from '../types/deliverymen.type';
import { getDoc } from '@angular/fire/firestore';
import { deleteDoc, limit } from 'firebase/firestore';

@Injectable({
  providedIn: 'root', // singleton service متاح لكل المشروع
})
export class RealtimeService {
  constructor(private firestore: Firestore) {}

  /**
   * استمع لكل المندوبين (collection 'deliverymen')
   * collectionData يرجع Observable يتحدث تلقائياً عند أي تغيير في Firestore
   * { idField: 'id' } يضيف حقل id للمستندات المرسلة
   */
  getDeliverymen(): Observable<allDeliverymen[]> {
    const ref = collection(this.firestore, 'deliverymen');
    return collectionData(ref, { idField: 'id' }) as Observable<
      allDeliverymen[]
    >;
  }

  /**
   * استرجاع الدليفري مان isAvailable = true
   */
  getAvailableDeliverymen(): Observable<allDeliverymen[]> {
    const ref = collection(this.firestore, 'deliverymen');
    const q = query(
      ref,
      where('isAvaliable', '==', true), // فقط اللي true
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<allDeliverymen[]>;
  }

  /**
   * استمع للطلبات (orders). هنا مثال لاستماع للطلبات pending مرتبة بوقت الإنشاء (الأحدث أولاً)
   * يمكنك تعديل query ليرجع فقط الطلبات المخصصة لسائق معين أو حالة معينة.
   */
  getPendingOrders(): Observable<InDeliveryOrders[]> {
    const ref = collection(this.firestore, 'orders');
    return collectionData(ref, { idField: 'id' }) as Observable<
      InDeliveryOrders[]
    >;
  }

  /**
   * استمع فقط للطلبات اللي status = 'InDelivery'
   */
  getInDeliveryOrders(): Observable<InDeliveryOrders[]> {
    const ref = collection(this.firestore, 'orders');
    const q = query(
      ref,
      where('status', '==', 'InDelivery'), // فقط اللي InDelivery
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<
      InDeliveryOrders[]
    >;
  }

  /**
   * إضافة طلب جديد إلى Firestore
   * order object يجب أن يحتوي الحقول اللي تحتاجها: clientId, deliveryManId, amount, address, status
   */
  async addOrder(order: any) {
    const docRef = doc(this.firestore, `orders/${order.id}`); // استخدم id القادم من API
    await setDoc(docRef, {
      ...order,
      clientName: order.clientName,
      clientLocation: order.clientLocation,
      clientphoneNumber: order.clientphoneNumber,
      deliveryManName: order.deliveryManName,
      status: 'Pending',
      createdAt: serverTimestamp(),
    });
  }

  /**
   * حدث حالة المندوب (متاح/غير متاح)
   * id: document id في collection 'deliverymen'
   */
  async updateDeliverymanStatus(id: string, isAvailable: boolean) {
    const docRef = doc(this.firestore, `deliverymen/${id}`);
    await updateDoc(docRef, {
      isAvailable,
      lastSeen: serverTimestamp(),
    });
  }

  /**
   * دالة مساعدة: جلب الطلبات المخصصة لسائق محدد (مثلاً لتطبيق الدليفري)
   */
  getOrdersForDriver(
    driverId: string,
  ): Observable<(DocumentData & { id?: string })[]> {
    const q = query(
      collection(this.firestore, 'orders'),
      where('assignedDriverId', '==', driverId),
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' });
  }

  async sendBell(deliverymanId: string) {
    try {
      // 1. جيب reference للـ document باستخدام doc و collection functions
      const deliverymanRef = doc(this.firestore, 'deliverymen', deliverymanId);

      // 2. جيب البيانات
      const docSnap = await getDoc(deliverymanRef);

      if (!docSnap.exists()) {
        alert('المندوب مش موجود في القاعدة');
        return;
      }

      const token = docSnap.data()['fcmToken'];
      if (!token) {
        alert('المندوب مش متصل بالنت أو مفيش توكن');
        return;
      }

      // 3. ارسل الإشعار مباشرة عبر FCM API
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization:
            'key=BLHOzLNKwz11n-kcORAQCnc7mRtzQMZNQ7svyGMJqkc3zQOsy43yyajtyXl49Y9zJIJiAHQmIkDLzz-1gn8mf9o', // غيّر ده بـ server key الحقيقي بتاعك (خطير لو مكشوف!)
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: 'طلبية جاهزة!',
            body: 'تعالى خد الطلبية من الصيدلية دلوقتي',
          },
          priority: 'high', // اختياري، عشان يجي فورًا
        }),
      });

      if (response.ok) {
        alert('تم إرسال التنبيه بنجاح!');
      } else {
        const errorText = await response.text();
        console.error('فشل في الإرسال:', errorText);
        alert('فشل في الإرسال');
      }
    } catch (error) {
      console.error('خطأ في sendBell:', error);
      alert('حدث خطأ غير متوقع');
    }
  }

  async updateDeliverymanToken(id: string, token: string) {
    const docRef = doc(this.firestore, `deliverymen/${id}`);
    await setDoc(docRef, { deviceToken: token }, { merge: true });
  }

  // ──── للطلب الواحد ────

  /**
   * يرجع آخر موقع معروف للطلب (من حقل currentLocation في الـ order document)
   */
  getOrderCurrentLocation(orderId: string): Observable<any> {
    const orderRef = doc(this.firestore, `orders/${orderId}`);
    return docData(orderRef, { idField: 'id' });
  }

  /**
   * يرجع تاريخ المواقع (النقاط) من sub-collection locations
   * limit → عشان ما نقرأش آلاف النقاط مرة واحدة
   */
  getOrderLocationHistory(
    orderId: string,
    limitCount: number = 80,
  ): Observable<any[]> {
    const locationsRef = collection(
      this.firestore,
      `orders/${orderId}/locations`,
    );
    const q = query(
      locationsRef,
      orderBy('timestamp', 'asc'),
      limit(limitCount),
    );
    return collectionData(q);
  }

  async updateDeliverymanFlags(
    id: string,
    flags: {
      isDelivering?: boolean;
      isReturning?: boolean;
      currentPath?: { lat: number; lng: number }[];
    },
  ) {
    const docRef = doc(this.firestore, `deliverymen/${id}`);
    await updateDoc(docRef, {
      ...flags,
      lastUpdate: serverTimestamp(),
    });
  }

  async deleteDeliveryman(id: number | string): Promise<void> {
    const idStr = String(id).trim();
    const docRef = doc(this.firestore, 'deliverymen', idStr);

    try {
      await deleteDoc(docRef);
      console.log(`تم حذف المندوب ${idStr} من Firestore`);
    } catch (err) {
      console.error(`فشل حذف المندوب ${idStr} من Firestore:`, err);
      throw err; // نلقي الخطأ للـ caller يتعامل معاه
    }
  }
}
