import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';
import { SidebarComponent } from './components/layout/sidebar/sidebar.component';
import { HeaderComponent } from './components/layout/header/header.component';
import { NgwWowService } from 'ngx-wow';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'DolphinDashboard';
  isLoggedIn$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private wowService: NgwWowService
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.wowService.init();
    setTimeout(() => this.checkAuth(), 0);
  }

  checkAuth(): void {
    this.isLoggedIn$.pipe(take(1)).subscribe((isLoggedIn) => {
      console.log('Checking auth, isLoggedIn:', isLoggedIn);
      if (!isLoggedIn) {
        const currentUrl = this.router.url;
        if (currentUrl !== '/' && currentUrl !== '/login') {
          console.warn('User not logged in, redirecting to login');
          this.router.navigate(['/']);
        }
      }
    });
  }
}
