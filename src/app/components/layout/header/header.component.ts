import { AuthService } from '../../../services/auth.service';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  breadcrumbs: { label: string; url: string }[] = []; // مصفوفة الـ breadcrumbs لتخزين الروابط وأسمائها

  constructor(
    private authService: AuthService, // حقن AuthService لتسجيل الخروج
    private router: Router, // حقن Router للتعامل مع التنقل
    private activatedRoute: ActivatedRoute // حقن ActivatedRoute للوصول للروت الحالي
  ) {}

  ngOnInit(): void {
    // الاشتراك في أحداث التنقل لتحديث الـ breadcrumbs
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd), // تصفية الأحداث لأحداث إكمال التنقل فقط
        map(() => this.activatedRoute), // الحصول على الروت الحالي
        map((route) => {
          // البحث عن الروت الأساسي (root)
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        map((route) => route.snapshot) // الحصول على snapshot للروت
      )
      .subscribe((route) => {
        this.breadcrumbs = this.getBreadcrumbs(route); // تحديث الـ breadcrumbs
      });
  }

  // دالة لبناء الـ breadcrumbs
  private getBreadcrumbs(
    route: any,
    url: string = '',
    breadcrumbs: { label: string; url: string }[] = []
  ): { label: string; url: string }[] {
    const routeData = route.data; // الحصول على بيانات الروت
    const routeUrl = route.url
      .map((segment: { path: any }) => segment.path)
      .join('/'); // بناء عنوان URL الخاص بالروت
    const label = routeData?.breadcrumb || ''; // الحصول على اسم breadcrumb من بيانات الروت

    // إضافة breadcrumb إذا كان موجود
    if (label) {
      breadcrumbs.push({ label, url: url + '/' + routeUrl });
    }

    // إذا كان هناك روت فرعي، استمر في البحث
    if (route.firstChild) {
      return this.getBreadcrumbs(
        route.firstChild,
        url + '/' + routeUrl,
        breadcrumbs
      );
    }

    return breadcrumbs; // إرجاع الـ breadcrumbs
  }

  // التحقق إذا كان الرابط نشطًا
  isActive(path: string): boolean {
    return this.router.isActive(path, {
      paths: 'subset',
      queryParams: 'subset',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  menuItems = [
    {
      label: 'الرئيسية',
      path: '/dashboard',
    },
    {
      label: 'التقارير',
      path: '/reportOrder',
    },
    {
      label: 'العملاء',
      path: '/Clients',
    },
    {
      label: 'المندوبين',
      path: '/Deliverymen',
    },
    {
      label: 'المستخدمين',
      path: '/Admins',
    },
  ];

  // دالة تسجيل الخروج
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
