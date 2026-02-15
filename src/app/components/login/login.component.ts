import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})

export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.isLoggedIn$.pipe(take(1)).subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        const savedEmail = this.authService.getSavedEmail();
        if (savedEmail) {
          this.email = savedEmail;
          this.rememberMe = true;
        }
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(form: NgForm): Promise<void> {
    this.errorMessage = null;
    if (form.valid) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        this.errorMessage = 'البريد الإلكتروني غير صالح.';
        return;
      }

      if (this.password.length < 6) {
        this.errorMessage = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
        return;
      }

      this.isLoading = true;

      try {
        await this.authService.login(
          this.email,
          this.password,
          this.rememberMe
        );
        this.errorMessage = null;
        await this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.errorMessage = error.message || 'حدث خطأ غير معروف.';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.errorMessage = 'يرجى تعبئة جميع الحقول بشكل صحيح.';
    }
  }
}
