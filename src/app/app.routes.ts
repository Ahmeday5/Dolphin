import { Router, Routes } from '@angular/router';
import { canActivate } from './guards/auth.guard';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { map } from 'rxjs';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ReportOrderComponent } from './components/orders/report-order/report-order.component';
import { EditReportOrderComponent } from './components/orders/edit-report-order/edit-report-order.component';
import { AllClientComponent } from './components/clients/all-client/all-client.component';
import { EditClientComponent } from './components/clients/edit-client/edit-client.component';
import { AllDeliverymanComponent } from './components/Deliverymen/all-deliveryman/all-deliveryman.component';
import { EditDeliverymanComponent } from './components/Deliverymen/edit-deliveryman/edit-deliveryman.component';
import { AllAdminComponent } from './components/admins/all-admin/all-admin.component';
import { EditAdminComponent } from './components/admins/edit-admin/edit-admin.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
    canActivate: [
      () => {
        const authService = inject(AuthService);
        const router = inject(Router);
        return authService.isLoggedIn$.pipe(
          map((isLoggedIn) => {
            if (isLoggedIn) {
              return router.createUrlTree(['/dashboard']);
            }
            return true;
          })
        );
      },
    ],
  },
  { path: 'login', redirectTo: '', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [canActivate],
  },
  {
    path: 'reportOrder',
    component: ReportOrderComponent,
    canActivate: [canActivate],
  },
  {
    path: 'editReportOrder/:id',
    component: EditReportOrderComponent,
    canActivate: [canActivate],
  },
  {
    path: 'Clients',
    component: AllClientComponent,
    canActivate: [canActivate],
  },
  {
    path: 'editClient/:id',
    component: EditClientComponent,
    canActivate: [canActivate],
  },
  {
    path: 'Deliverymen',
    component: AllDeliverymanComponent,
    canActivate: [canActivate],
  },
  {
    path: 'editDeliverymen/:id',
    component: EditDeliverymanComponent,
    canActivate: [canActivate],
  },
  {
    path: 'Admins',
    component: AllAdminComponent,
    canActivate: [canActivate],
  },
  {
    path: 'editAdmin/:id',
    component: EditAdminComponent,
    canActivate: [canActivate],
  },
];
