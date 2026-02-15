import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common'; // إضافة CommonModule

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule], // إضافة RouterModule لدعم routerLink و routerLinkActive
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit, AfterViewInit {
  // حالة الـ Sidebar (مفتوحة أو مغلقة)
  isSidebarOpen: boolean = window.innerWidth > 992;

  // حقن Router و AuthService
  constructor(private authService: AuthService, private router: Router) {}

  // التهيئة عند تحميل الكومبوننت
  ngOnInit(): void {
    // لا حاجة لتهيئة إضافية
  }

  // بعد تحميل العرض
  ngAfterViewInit(): void {
    // إضافة مستمع لتغيير حجم النافذة
    window.addEventListener('resize', () => {
      this.isSidebarOpen = window.innerWidth > 992;
    });
  }

  // فتح/قفل الـ Sidebar
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
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

  // قائمة العناصر في الـ Sidebar
  menuItems = [
    {
      label: 'الرئيسية',
      path: '/dashboard',
      iconActive: 'fas fa-home fa-xl',
      iconInactive: 'fas fa-home fa-xl',
    },
    {
      label: 'الطلبيات',
      path: '/allorders',
      iconActive: 'fas fa-shopping-bag fa-xl',
      iconInactive: 'fas fa-shopping-bag fa-xl',
    },
    {
      label: 'الموردين',
      path: '/all-supplier',
      iconActive: 'fas fa-truck fa-xl',
      iconInactive: 'fas fa-truck fa-xl',
    },
    {
      label: 'المشترين ',
      path: '/all-inactiveBuyers',
      iconActive: 'fas fa-users fa-xl',
      iconInactive: 'fas fa-users fa-xl',
    },
    {
      label: 'الأدمن',
      path: '/admins',
      iconActive: 'fas fa-users-cog fa-xl',
      iconInactive: 'fas fa-users-cog fa-xl',
    },
    {
      label: 'كشف حساب',
      path: '/all-supplierStatement',
      iconActive: 'fas fa-file-invoice-dollar fa-xl',
      iconInactive: 'fas fa-file-invoice-dollar fa-xl',
    },
    {
      label: 'الإعلانات',
      path: '/advertisements',
      iconActive: 'fas fa-bullhorn fa-xl',
      iconInactive: 'fas fa-bullhorn fa-xl',
    },
  ];
}
