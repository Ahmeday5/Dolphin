import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import {
  allDeliverymen,
  DeliverymenResponse,
} from '../../types/deliverymen.type';
import { InDeliveryOrders } from '../../types/InDeliveryOrders.type';
import { RealtimeService } from '../../services/realtime.service'; //firebase
import { Subscription } from 'rxjs'; //firebase
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { GoogleMap, GoogleMapsModule, MapMarker } from '@angular/google-maps';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleMapsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private realtimeSubs: Subscription[] = []; // نخزن الاشتراكات لنبطلها لاحقًا

  @ViewChild('form') form!: NgForm;
  @ViewChild('form', { static: false, read: ElementRef })
  formElement!: ElementRef<HTMLFormElement>;
  isLoading: boolean = false;
  @ViewChild(GoogleMap) googleMap!: GoogleMap;

  /*******allDeliverymen*********/
  noDeliverymenMessage: string | null = null;
  Deliverymen: allDeliverymen[] = [];
  loading: boolean = true;

  /********getInDeliveryOrders******/
  InDeliveryOrders: InDeliveryOrders[] = [];

  /****************/
  order = {
    amount: '',
    address: '',
    deliveryManId: 0,
    clientId: 0,
    orderCode: '',
    notes: '',
  };
  availableDeliveryMan: { id: number; name: string }[] = [];
  Clients: {
    id: number;
    name: string;
    phoneNumber: string;
    location: string;
  }[] = [];
  errorMessage: string = '';
  successMessage: string = '';

  get validDeliverymen(): allDeliverymen[] {
    return this.Deliverymen.filter(
      (d) =>
        d.id != null &&
        d.id !== 0 &&
        !isNaN(Number(d.id)) &&
        String(d.id).trim() !== '',
    );
  }

  get validInDeliveryOrders(): InDeliveryOrders[] {
    return this.InDeliveryOrders.filter(
      (order) =>
        order.orderId != null &&
        order.orderId !== '' &&
        !isNaN(Number(order.orderId)), // اختياري لو orderId لازم يكون رقم
    );
  }

  // Google Maps vars
  apiLoaded = false;
  center: google.maps.LatLngLiteral = { lat: 30.0444, lng: 31.2357 };
  zoom = 12;
  markers: {
    position: google.maps.LatLngLiteral;
    label: string;
    title: string;
    info: string;
    icon?: google.maps.Icon | string; // ← غيّرنا هنا
    color?: string; // للنبض بعدين
  }[] = [];
  deliveryPolylines: {
    orderId: string | number | undefined;
    path: google.maps.LatLngLiteral[];
    options: google.maps.PolylineOptions;
  }[] = [];
  deliveryMarkers: Map<string, google.maps.Marker> = new Map(); // لتخزين الماركرات بالـ ID
  visibleMarkers: Array<{
    id: number;
    position: google.maps.LatLngLiteral;
    title: string;
    info: string;
    icon: google.maps.Icon | google.maps.Symbol;
  }> = [];
  trackedId: number | null = null;

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private realtime: RealtimeService, // الحقن هنا
  ) {
    this.loadGoogleMapsApi();
  }

  private loadGoogleMapsApi(): void {
    if (typeof google !== 'undefined' && google.maps) {
      this.apiLoaded = true;
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.apiLoaded = true;
      this.cdr.detectChanges();
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      this.errorMessage = 'فشل تحميل الخريطة، تحقق من الإنترنت أو المفتاح.';
    };
    document.head.appendChild(script);
  }

  // دالة لعرض الصورة في الـ modal
  showImage() {
    this.cdr.detectChanges();
  }

  getFullImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return '/assets/img/logo.jpg'; // صورة افتراضية
    }

    // إذا كان المسار كامل (يبدأ بـ http) رجعه كما هو
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // إذا كان نسبي، أضف الـ base URL
    const baseUrl = 'http://78.89.159.126:9393/PharmacyAPI';
    return `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  onImageError(event: any) {
    event.target.src = 'assets/images/default-avatar.png'; // fallback
  }

  // دالة لحساب الوقت المنقضي (time ago) بالعربية
  getTimeAgo(timestamp: any): string {
    if (!timestamp || !timestamp.seconds) {
      return 'غير معروف';
    }
    const now = new Date().getTime();
    const updateTime = timestamp.seconds * 1000;
    const diff = Math.floor((now - updateTime) / 1000); // في ثواني

    if (diff < 60) {
      return 'الآن';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `منذ ${minutes} دقيقة`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
    } else {
      const days = Math.floor(diff / 86400);
      return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
    }
  }

  // دالة للتركيز على مندوب معين وفتح InfoWindow
  focusOnDeliveryman(deliverymanId: number | string) {
    console.log(
      '[focusOnDeliveryman] بداية الدالة – الـ ID المدخل:',
      deliverymanId,
      'نوعه:',
      typeof deliverymanId,
    );

    const idStr = String(deliverymanId).trim();
    console.log('[focusOnDeliveryman] البحث بـ string key:', `"${idStr}"`);

    if (!this.googleMap?.googleMap) {
      console.warn('[focusOnDeliveryman] الخريطة غير جاهزة بعد');
      return;
    }

    const marker = this.deliveryMarkers.get(idStr);
    console.log('[focusOnDeliveryman] الماركر موجود؟', !!marker);

    if (!marker) {
      console.warn(`[focusOnDeliveryman] ماركر غير موجود للـ key: "${idStr}"`);
      console.log(
        'المفاتيح الحالية في Map:',
        Array.from(this.deliveryMarkers.keys()),
      );
      return;
    }

    const position = marker.getPosition();
    if (!position) {
      console.warn('[focusOnDeliveryman] الموقع null');
      return;
    }

    console.log(
      '[focusOnDeliveryman] تنفيذ panTo و setZoom → lat:',
      position.lat(),
      'lng:',
      position.lng(),
    );

    // تركيز الخريطة
    this.googleMap.googleMap.panTo(position);
    this.googleMap.googleMap.setZoom(15);

    // فتح InfoWindow غني
    let content = `<h3>${marker.getTitle() || 'مندوب'}</h3>`;
    content += `<p>ID: ${idStr} | ${this.getTimeAgo(this.Deliverymen.find((d) => String(d.id) === idStr)?.lastUpdate)}</p>`;

    const order = this.InDeliveryOrders.find(
      (o) => String(o.deliveryManId) === idStr,
    );
    if (order) {
      content += `<br><strong>طلب:</strong> ${order.orderId || '?'}<br>`;
      content += `<strong>العميل:</strong> ${order.clientName || 'غير معروف'}<br>`;
      content += `<strong>الهاتف:</strong> ${order.clientphoneNumber || 'غير متوفر'}<br>`;
      content += `<strong>القيمة:</strong> ${order.amount || '?'} جنيه`;
    }

    const infoWindow = new google.maps.InfoWindow({
      content,
      position,
    });
    infoWindow.open(this.googleMap.googleMap);
  }

  startTracking(idRaw: string | null) {
    console.log(
      '[startTracking] تم الاستدعاء – القيمة الخام:',
      idRaw,
      'نوعها:',
      typeof idRaw,
    );

    if (!this.googleMap?.googleMap) {
      console.warn('[startTracking] الخريطة غير جاهزة بعد');
      return;
    }

    // حالة "لا تتبع أحد"
    if (!idRaw || idRaw === '0') {
      console.log(
        '[startTracking] اختيار "لا تتبع" – إيقاف التتبع وإرجاع الخريطة للعرض العام',
      );

      this.trackedId = null;

      // حساب حدود المندوبين المتاحين
      const bounds = new google.maps.LatLngBounds();
      let hasAvailable = false;

      this.Deliverymen.filter((d) => d.isAvaliable === true).forEach((d) => {
        const lat = d.currentLat ?? this.center.lat;
        const lng = d.currentLng ?? this.center.lng;
        bounds.extend({ lat, lng });
        hasAvailable = true;
      });

      if (hasAvailable && !bounds.isEmpty()) {
        // عرض كل المندوبين المتاحين مع padding
        this.googleMap.googleMap.fitBounds(bounds, {
          top: 60,
          bottom: 60,
          left: 60,
          right: 60,
        });
        console.log('[startTracking] تم fitBounds على المندوبين المتاحين');
      } else {
        // لو مفيش مندوبين متاحين → رجع للمركز الافتراضي
        this.googleMap.googleMap.setCenter(this.center);
        this.googleMap.googleMap.setZoom(12);
        console.log(
          '[startTracking] مفيش مندوبين متاحين → رجع للمركز الافتراضي + zoom 12',
        );
      }

      return;
    }

    // حالة اختيار مندوب معين
    const idStr = idRaw.trim();
    const numId = Number(idStr);

    console.log(
      '[startTracking] محاولة تتبع مندوب → string:',
      idStr,
      'number:',
      numId,
      'isNaN?',
      isNaN(numId),
    );

    if (isNaN(numId) || numId <= 0) {
      console.warn('[startTracking] قيمة ID غير صالحة');
      return;
    }

    this.trackedId = numId;

    const marker = this.deliveryMarkers.get(idStr);
    if (!marker) {
      console.warn(`[startTracking] ماركر غير موجود للـ ID: ${idStr}`);
      // محاولة fallback: نستخدم آخر موقع معروف من Deliverymen
      const man = this.Deliverymen.find((d) => d.id === numId);
      if (man) {
        const lat = man.currentLat ?? this.center.lat;
        const lng = man.currentLng ?? this.center.lng;
        this.googleMap.googleMap.panTo({ lat, lng });
        this.googleMap.googleMap.setZoom(18);
        console.log('[startTracking] fallback → panTo باستخدام آخر موقع معروف');
      }
      return;
    }

    const pos = marker.getPosition();
    if (!pos) {
      console.warn('[startTracking] موقع الماركر null');
      return;
    }

    console.log(
      '[startTracking] تنفيذ panTo و setZoom → lat:',
      pos.lat(),
      'lng:',
      pos.lng(),
    );

    this.googleMap.googleMap.panTo(pos);
    this.googleMap.googleMap.setZoom(18);
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;

    // 1. استمع للمندوبين من Firestore (للـ real-time)
    const sub1 = this.realtime.getDeliverymen().subscribe(async (data) => {
      this.Deliverymen = data.map((d) => ({
        id: d.id,
        name: d.name,
        isAvaliable: d.isAvaliable ?? false,
        imageUrl: d.imageUrl,
        deviceToken: d.deviceToken || null,
        currentLat: d.currentLat ?? 30.0444,
        currentLng: d.currentLng ?? 31.2357,
        lastUpdate: d.lastUpdate,
        isDelivering: d.isDelivering ?? false,
        isReturning: d.isReturning ?? false,
        currentPath: d.currentPath ?? [],
      }));

      // 2. جيب deviceToken من backend وخزنه في Firestore + في الـ array
      try {
        const backendResponse = await firstValueFrom(
          this.apiService.getAllDeliverymen(1, 100),
        ); // جيب كلهم
        const backendMap = new Map(
          backendResponse.items.map((item: any) => [item.id, item.deviceToken]),
        );

        for (const deliveryman of this.Deliverymen) {
          const backendToken = backendMap.get(Number(deliveryman.id));
          if (backendToken && deliveryman.deviceToken !== backendToken) {
            // خزن في Firestore
            await this.realtime.updateDeliverymanToken(
              deliveryman.id.toString(),
              backendToken,
            );
            // حدث في الـ array
            deliveryman.deviceToken = backendToken;
          }
        }

        // حدث availableDeliveryMan
        this.availableDeliveryMan = this.Deliverymen.filter(
          (d) => d.isAvaliable,
        ).map((d) => ({ id: d.id as number, name: d.name }));
      } catch (error) {
        console.error('خطأ في جلب deviceToken من backend:', error);
      }

      this.updateAllMarkersAndLines();
      this.loading = false;
      this.cdr.detectChanges();
    });
    this.realtimeSubs.push(sub1);

    // باقي الاشتراكات (InDeliveryOrders) زي ما هي
    const sub2 = this.realtime.getInDeliveryOrders().subscribe((orders) => {
      this.InDeliveryOrders = orders || [];
      this.updateAllMarkersAndLines(); // تحديث الخريطة مع الطلبات
      this.cdr.detectChanges();
    });
    this.realtimeSubs.push(sub2);

    this.fetchClients();
  }

  private updateAllMarkersAndLines() {
    console.log(
      '[updateAllMarkersAndLines] بداية التحديث – عدد المندوبين:',
      this.Deliverymen.length,
    );

    this.Deliverymen.forEach((d) => {
      const idStr = String(d.id); // ← دايمًا string
      console.log(`  معالجة مندوب ID: ${idStr} (${typeof d.id})`);

      const isAvailable = d.isAvaliable ?? false;

      let lat = d.currentLat ?? 30.0444;
      let lng = d.currentLng ?? 31.2357;
      if (Array.isArray(d.currentPath) && d.currentPath.length > 0) {
        const lastPoint = d.currentPath[d.currentPath.length - 1];
        lat = lastPoint.lat ?? lat;
        lng = lastPoint.lng ?? lng;
      }
      const newPosition: google.maps.LatLngLiteral = { lat, lng };

      let rotation = 0;
      if (Array.isArray(d.currentPath) && d.currentPath.length >= 2) {
        const prev = d.currentPath[d.currentPath.length - 2];
        const curr = d.currentPath[d.currentPath.length - 1];
        rotation = this.calculateBearing(prev, curr);
      }

      let icon: google.maps.Icon | google.maps.Symbol;
      if (rotation !== 0) {
        icon = {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          fillColor: isAvailable ? '#00cc44' : '#ff4444',
          fillOpacity: 0.9,
          strokeWeight: 1.5,
          strokeColor: '#000000',
          scale: 6.5,
          rotation: rotation,
          anchor: new google.maps.Point(0, 2.5),
        };
      } else {
        icon = isAvailable
          ? {
              url: '/assets/img/food-truck.png',
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40),
            }
          : {
              url: '/assets/img/food-truck-no.png',
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 36),
            };
      }

      const title = `${d.name} (${isAvailable ? 'جاهز' : 'غير متاح'}) ${d.isDelivering ? '(في توصيل)' : ''} ${d.isReturning ? '(راجع)' : ''}`;

      let info = `ID: ${d.id} | آخر تحديث: ${this.getTimeAgo(d.lastUpdate)}`;
      const order = this.InDeliveryOrders.find((o) => o.deliveryManId === d.id);
      if (order) {
        info += `<br><strong>طلب:</strong> ${order.orderId || '?'}<br><strong>العميل:</strong> ${order.clientName || 'غير معروف'}<br><strong>الهاتف:</strong> ${order.clientphoneNumber || 'غير متوفر'}<br><strong>القيمة:</strong> ${order.amount || '?'} جنيه`;
      }

      // استخدام string كـ key
      let marker = this.deliveryMarkers.get(idStr);

      if (!marker) {
        console.log(`  إنشاء ماركر جديد لـ ${idStr}`);
        marker = new google.maps.Marker({
          position: newPosition,
          map: this.googleMap.googleMap,
          icon,
          title,
          label: d.name.charAt(0),
        });
        this.deliveryMarkers.set(idStr, marker);

        marker.addListener('click', () => {
          this.focusOnDeliveryman(idStr);
        });
      } else {
        console.log(`  تحديث ماركر موجود لـ ${idStr}`);
        const currentPos = marker.getPosition();
        if (currentPos) {
          this.animateMarker(
            marker,
            currentPos,
            new google.maps.LatLng(newPosition),
            1200,
          );
        }
        marker.setIcon(icon);
        marker.setTitle(title);
        marker.setLabel(d.name.charAt(0));
      }
    });

    // باقي الكود (الخطوط، fitBounds، التتبع) بدون تغيير كبير
    this.deliveryPolylines = [];
    this.Deliverymen.forEach((d) => {
      if (
        (d.isDelivering || d.isReturning) &&
        Array.isArray(d.currentPath) &&
        d.currentPath.length >= 2
      ) {
        const path = d.currentPath.map((p) => ({
          lat: p.lat ?? 30.0444,
          lng: p.lng ?? 31.2357,
        }));
        this.deliveryPolylines.push({
          orderId: d.id,
          path,
          options: {
            strokeColor: d.isDelivering ? '#1E90FF' : '#FF4444',
            strokeOpacity: 0.65,
            strokeWeight: 5,
            geodesic: true,
          },
        });
      }
    });

    /*if (this.googleMap?.googleMap && this.Deliverymen.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      this.Deliverymen.filter((d) => d.isAvaliable).forEach((d) => {
        bounds.extend({
          lat: d.currentLat ?? 30.0444,
          lng: d.currentLng ?? 31.2357,
        });
      });

      // ← التعديل هنا: اجعل fitBounds مشروطًا
      if (this.trackedId === null) {
        // فقط لو مفيش تتبع
        if (bounds.isEmpty()) {
          this.googleMap.googleMap.setCenter(this.center);
          this.googleMap.googleMap.setZoom(12);
        } else {
          this.googleMap.googleMap.fitBounds(bounds, {
            top: 60,
            bottom: 60,
            left: 60,
            right: 60,
          });
        }
      }
    }*/

    // التتبع
    // بدلًا من ذلك: نتحكم يدويًا في المركز والزوم
    if (this.googleMap?.googleMap) {
      if (this.trackedId !== null) {
        // وضع التتبع: نركز على المندوب فقط
        const trackedMan = this.Deliverymen.find(
          (d) => d.id === this.trackedId,
        );
        if (trackedMan) {
          let lat = trackedMan.currentLat ?? 30.0444;
          let lng = trackedMan.currentLng ?? 31.2357;

          if (trackedMan.currentPath?.length) {
            const last =
              trackedMan.currentPath[trackedMan.currentPath.length - 1];
            lat = last.lat ?? lat;
            lng = last.lng ?? lng;
          }

          console.log('[Tracking Update] panTo →', lat, lng);
          this.googleMap.googleMap.panTo({ lat, lng });

          // نضمن الزوم 18 في **كل** تحديث أثناء التتبع
          this.googleMap.googleMap.setZoom(18);
        }
      }
      // لو مفيش تتبع → نعمل fitBounds **هنا فقط** لو عايز
      else {
        // اختياري: لو عايز ترجع للعرض العام لما تختار "لا تتبع"
        const bounds = new google.maps.LatLngBounds();
        let hasAvailable = false;

        this.Deliverymen.filter((d) => d.isAvaliable).forEach((d) => {
          bounds.extend({
            lat: d.currentLat ?? 30.0444,
            lng: d.currentLng ?? 31.2357,
          });
          hasAvailable = true;
        });

        if (hasAvailable && !bounds.isEmpty()) {
          this.googleMap.googleMap.fitBounds(bounds, {
            top: 60,
            bottom: 60,
            left: 60,
            right: 60,
          });
        } else {
          this.googleMap.googleMap.setCenter(this.center);
          this.googleMap.googleMap.setZoom(12);
        }
      }
    }

    this.cdr.detectChanges();
  }

  // دالة للتحريك السلس (تستخدم linear interpolation)
  private animateMarker(
    marker: google.maps.Marker,
    start: google.maps.LatLng,
    end: google.maps.LatLng,
    duration: number,
  ) {
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const lat = start.lat() + (end.lat() - start.lat()) * progress;
      const lng = start.lng() + (end.lng() - start.lng()) * progress;
      marker.setPosition(new google.maps.LatLng(lat, lng));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        marker.setAnimation(google.maps.Animation.BOUNCE); // bounce في النهاية
        setTimeout(() => marker.setAnimation(null), 1000); // إيقاف بعد ثانية
      }
    };
    animate();
  }

  // حساب bearing (الاتجاه) بين نقطتين
  private calculateBearing(
    pointA: google.maps.LatLngLiteral,
    pointB: google.maps.LatLngLiteral,
  ): number {
    const lat1 = pointA.lat * (Math.PI / 180);
    const lat2 = pointB.lat * (Math.PI / 180);
    const dLon = (pointB.lng - pointA.lng) * (Math.PI / 180);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360; // إيجابي 0-360
    return bearing;
  }

  openInfo(
    event: google.maps.MapMouseEvent | google.maps.IconMouseEvent | null,
    content: string,
  ) {
    if (
      !event ||
      !('latLng' in event) ||
      !event.latLng ||
      !this.googleMap?.googleMap
    ) {
      console.warn('No valid map event or latLng available');
      return;
    }

    const infoWindow = new google.maps.InfoWindow({
      content: `<h3>${content}</h3>`,
      position: event.latLng,
    });

    infoWindow.open({
      map: this.googleMap.googleMap,
    });
  }

  ngOnDestroy(): void {
    // الغاء كل الاشتراكات للـ Firestore لمنع memory leaks
    this.realtimeSubs.forEach((s) => s.unsubscribe());
  }

  /*async fetchAvailableDeliveryMan(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.apiService.getAvailableDeliveryMen()
      );
      console.log('DeliveryMen Response:', response);
      this.availableDeliveryMan = response || [];
    } catch (error) {
      console.error('فشل في جلب الدليفري:', error);
    }
  }*/

  async fetchClients(): Promise<void> {
    this.Clients = [];
    try {
      let allClients: any[] = [];
      let page = 1;
      const pageSize = 50; // أي رقم معقول (50-200)
      let totalPages = 1;
      do {
        const response = await firstValueFrom(
          this.apiService.getAllClients(page, pageSize),
        );

        // أضف العملاء من الصفحة الحالية
        if (Array.isArray(response.items)) {
          allClients.push(...response.items);
        }

        // حدّث عدد الصفحات
        totalPages = response.totalPages || 1;
        page++;

        // تأخير بسيط (اختياري) عشان ما نضغطش على السيرفر
        await new Promise((r) => setTimeout(r, 50));
      } while (page <= totalPages);

      this.Clients = allClients;
      console.log(`تم جلب ${this.Clients.length} عميل بنجاح`);
    } catch (error) {
      console.error('فشل في جلب العملاء:', error);
      this.Clients = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  /*async handleSubmit(): Promise<void> {
    const formElement = this.formElement.nativeElement;

    if (!formElement.checkValidity()) {
      formElement.classList.add('was-validated');
      this.form.control.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const body = {
      amount: this.order.amount,
      address: this.order.address,
      deliveryManId: this.order.deliveryManId,
      clientId: this.order.clientId,
    };

    try {
      const response = await firstValueFrom(this.apiService.addOrder(body));
      console.log('Response from Add Order API:', response);
      if (response.success) {
        this.successMessage = response.message;
        await this.realtime.addOrder({
          id: response.data.id,
          clientId: this.order.clientId,
          clientName:
            this.Clients.find((c) => c.id === +this.order.clientId)?.name || '',
          deliveryManId: this.order.deliveryManId,
          deliveryManName:
            this.availableDeliveryMan.find(
              (d) => d.id === +this.order.deliveryManId
            )?.name || '',
          amount: Number(this.order.amount),
          address: this.order.address,
          status: 'pending',
        });
        this.form.resetForm();
        this.order = {
          amount: '',
          address: '',
          deliveryManId: 0,
          clientId: 0,
        };
        formElement.classList.remove('was-validated');
        this.isLoading = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        this.fetchInDeliveryOrders();
      } else {
        this.errorMessage = 'فشل في إضافة الطلب';
        this.isLoading = false;
      }
    } catch (error: any) {
      this.isLoading = false;
      let errorMessage = 'حدث خطأ أثناء الإضافة';
      if (error && 'message' in error) {
        errorMessage = error.message;
      }
      this.errorMessage = errorMessage;
      console.error('خطأ في إضافة الطلب:', error);
    }
  }

  // دالة لجلب كل المندوبين (مع استدعاء getVisiblePages)
  fetchAllDeliverymen() {
    this.loading = true;
    this.noDeliverymenMessage = null;

    this.apiService.getAllDeliverymen(1, 3).subscribe({
      next: (
        response: DeliverymenResponse | { error: boolean; message: string }
      ) => {
        console.log('API Response in Component deliveryDashboard:', response);
        if ('error' in response) {
          this.Deliverymen = [];
          if (this.Deliverymen.length === 0) {
            this.noDeliverymenMessage = 'لا يوجد مندوبين متاحين';
          }
          this.noDeliverymenMessage = response.message;
        } else {
          this.Deliverymen = response.items || [];
        }

        console.log('Extracted Deliverymen:', this.Deliverymen);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Unexpected error in fetchAllDeliverymen:', error);
        this.Deliverymen = [];
        this.noDeliverymenMessage = 'حدث خطأ غير متوقع في جلب المندوبين';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }*/

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

    const body = {
      amount: this.order.amount,
      address: this.order.address,
      deliveryManId: this.order.deliveryManId,
      clientId: this.order.clientId,
      orderCode: this.order.orderCode,
      notes: this.order.notes,
    };

    try {
      const newOrderId = await this.apiService.addOrderAndGetId(body);
      console.log('New Order ID:', newOrderId);

      if (newOrderId) {
        // جيب الاسم من Deliverymen (اللي محدث من Firestore)
        const deliveryMan = this.Deliverymen.find(
          (d) => Number(d.id) === +this.order.deliveryManId,
        );
        const deliveryManName = deliveryMan?.name || 'غير معروف';

        const client = this.Clients.find((c) => c.id === +this.order.clientId);
        const clientName = client?.name || 'غير معروف';
        const clientLocation = client?.location || '';
        const clientPhone = client?.phoneNumber || '';

        await this.realtime.addOrder({
          id: newOrderId,
          clientId: this.order.clientId,
          clientName,
          clientLocation,
          clientphoneNumber: clientPhone,
          deliveryManId: this.order.deliveryManId,
          deliveryManName, // الاسم هنا مضمون
          amount: Number(this.order.amount),
          address: this.order.address,
          status: 'Pending',
        });

        this.successMessage = 'تمت إضافة الطلب بنجاح';
        this.resetForm(formElement);
        this.isLoading = false;
        setTimeout(() => (this.successMessage = ''), 3000);
      } else {
        throw new Error('لم يتم العثور على معرف الطلب');
      }
    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage = error.message || 'فشل في إضافة الطلب';
      console.error('خطأ:', error);
    }
  }

  private resetForm(formElement: HTMLFormElement) {
    this.form.resetForm();
    this.order = {
      amount: '',
      address: '',
      deliveryManId: 0,
      clientId: 0,
      notes: '',
      orderCode: '',
    };
    formElement.classList.remove('was-validated');
  }

  // 👇 دالة جلب كل المندوبين (بدون تغيير كبير)
  fetchAllDeliverymen() {
    this.loading = true;
    this.noDeliverymenMessage = null;

    this.apiService.getAllDeliverymen(1, 3).subscribe({
      next: (
        response: DeliverymenResponse | { error: boolean; message: string },
      ) => {
        console.log('API Response in Component deliveryDashboard:', response);
        if ('error' in response) {
          this.Deliverymen = [];
          if (this.Deliverymen.length === 0) {
            this.noDeliverymenMessage = 'لا يوجد مندوبين متاحين';
          }
          this.noDeliverymenMessage = response.message;
        } else {
          this.Deliverymen = response.items || [];
        }

        console.log('Extracted Deliverymen:', this.Deliverymen);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Unexpected error in fetchAllDeliverymen:', error);
        this.Deliverymen = [];
        this.noDeliverymenMessage = 'حدث خطأ غير متوقع في جلب المندوبين';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  //دالة لجلب الطلبات قيد التوصيل
  async fetchInDeliveryOrders(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response = await firstValueFrom(
        this.apiService.getInDeliveryOrders(),
      );
      this.InDeliveryOrders = response || [];
      if (this.InDeliveryOrders.length === 0) {
        this.errorMessage = 'لا يوجد مستخدم متاحين';
      }
      console.log('كل المستخدم:', this.InDeliveryOrders);
      this.loading = false;
    } catch (error: any) {
      console.error('فشل في جلب المستخدم:', error);
      this.errorMessage = error.message || 'حدث خطأ أثناء جلب المستخدم';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /********************************************************************** */
  // دالة لما تضغط على الجرس بجانب المندوب المتاح
  async sendBell(deliverymanId: number | string) {
    if (!confirm('هل تريد ارسال اشعار للمندوب؟')) {
      return;
    }

    const deliveryman = this.Deliverymen.find((d) => d.id === deliverymanId);

    if (!deliveryman) {
      alert('حدث خطأ، المندوب غير موجود في القائمة حاليًا.');
      return;
    }

    if (!deliveryman.deviceToken) {
      // رسالة ودية وواضحة بدل "مفيش device token"
      alert(
        `المندوب "${deliveryman.name}" غير متصل حاليًا بالتطبيق.\n\nيرجى الانتظار حتى يقوم بفتح التطبيق على موبايله، ثم يمكنك إرسال التنبيه.`,
      );
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      const body = {
        deviceToken: deliveryman.deviceToken,
        title: 'طلبية جاهزة!',
        body: 'اذهب لاستلام الطلبية من الصيدلية علي الفور',
      };

      const response = await firstValueFrom(
        this.apiService.sendNotification(body),
      );
      this.successMessage = `تم إرسال التنبيه بنجاح للمندوب "${deliveryman.name}"`;
      setTimeout(() => (this.successMessage = ''), 4000);
    } catch (error: any) {
      this.errorMessage = `فشل إرسال التنبيه إلى "${deliveryman.name}" \nممكن يكون موبايله مقفل أو مفيش نت، حاول مرة اخري بعد قليل .`;
      setTimeout(() => {
        this.errorMessage = '';
      }, 4000);
      console.error(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
