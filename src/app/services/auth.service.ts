import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { LoginCredentials, LoginResponse } from '../types/login.type';
import { Router } from '@angular/router';

interface JwtPayload {
  exp?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://78.89.159.126:9393/PharmacyDolphenAPI/api/Auth';
  public isLoggedInSubject = new BehaviorSubject<boolean>(
    localStorage.getItem('isLoggedIn') === 'true'
  );
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  private userDataSubject = new BehaviorSubject<LoginResponse | null>(null);

  constructor(private http: HttpClient) {
    this.loadUserData();
  }

  private loadUserData(): void {
    const userData = localStorage.getItem('userData');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    /*console.log(
      'Loading user data, isLoggedIn:',
      isLoggedIn,
      'userData:',
      userData
    );*/
    if (userData && isLoggedIn) {
      try {
        const parsedData = JSON.parse(userData) as LoginResponse;
        this.userDataSubject.next(parsedData);
        const isAccessTokenValid =
          !!parsedData.accessToken && !this.isTokenExpired();
        const isRefreshTokenValid = !this.isRefreshTokenExpired();
        /*console.log(
          'AccessToken valid:',
          isAccessTokenValid,
          'RefreshToken valid:',
          isRefreshTokenValid
        );*/
        if (isAccessTokenValid && isRefreshTokenValid) {
          //console.log('User data loaded, tokens are valid');
          this.isLoggedInSubject.next(true);
          this.startTokenRefreshTimer();
        } else if (isRefreshTokenValid) {
          //console.log('AccessToken expired, attempting to refresh');
          this.refresh().catch((error) => {
            //console.error('Failed to refresh token on load:', error);
            this.isLoggedInSubject.next(false);
            inject(Router).navigate(['/']);
          });
        } else {
          //console.warn('RefreshToken expired, redirecting to login');
          this.isLoggedInSubject.next(false);
          inject(Router).navigate(['/']);
        }
      } catch (error) {
        //console.error('Error parsing userData:', error);
        this.isLoggedInSubject.next(false);
        inject(Router).navigate(['/']);
      }
    } else {
      //console.warn('No user data or login state found in localStorage');
      this.isLoggedInSubject.next(false);
      this.userDataSubject.next(null);
    }
  }

  async login(
    email: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<LoginResponse> {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('savedEmail');

    try {
      //console.log('Sending login request:', { email, password, rememberMe });
      const response = await firstValueFrom(
        this.http
          .post<LoginResponse>(
            `${this.API_URL}/login-appuser`,
            { email, password, rememberMe },
            { headers: { 'Content-Type': 'application/json' } }
          )
          .pipe(
            catchError((error) => {
              let errorMessage = 'حدث خطأ غير معروف';
              if (error.status === 400) {
                errorMessage = 'بيانات الإدخال غير صحيحة.';
              } else if (error.status === 401) {
                errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
              }
              //console.error('Login error:', error);
              return throwError(() => new Error(errorMessage));
            })
          )
      );
      //console.log('Login response:', response);
      this.userDataSubject.next(response);
      this.isLoggedInSubject.next(true);
      localStorage.setItem('userData', JSON.stringify(response));
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('isLoggedIn', 'true');
      if (rememberMe) {
        localStorage.setItem('savedEmail', email);
      }
      this.startTokenRefreshTimer();
      return response;
    } catch (error: any) {
      //console.error('Login failed:', error);
      throw new Error(error.message || 'فشل تسجيل الدخول');
    }
  }

  startTokenRefreshTimer(): void {
    const token = this.getToken();
    if (!token) {
      console.warn('No access token for refresh timer');
      this.isLoggedInSubject.next(false);
      inject(Router).navigate(['/']);
      return;
    }

    try {
      const decoded: JwtPayload = jwtDecode(token);
      if (!decoded.exp) {
        console.warn('AccessToken does not contain expiry information');
        this.isLoggedInSubject.next(false);
        inject(Router).navigate(['/']);
        return;
      }
      const expiry = decoded.exp * 1000; // تحويل إلى ميلي ثانية
      const now = Date.now();
      const timeUntilExpiry = expiry - now;
      const refreshThreshold = 2 * 60 * 1000; // 2 دقيقة بدل 5 دقايق

      /*console.log(
        `AccessToken expiry: ${new Date(expiry)}, Time until expiry: ${
          timeUntilExpiry / 1000
        }s, Refresh threshold: ${refreshThreshold / 1000}s`
      );*/

      if (timeUntilExpiry > refreshThreshold) {
        /*console.log(
          `Scheduling access token refresh in ${
            timeUntilExpiry - refreshThreshold
          }ms`
        );*/
        setTimeout(() => {
          this.refresh().catch((error) => {
            //console.error('Proactive refresh failed:', error);
            if (this.isRefreshTokenExpired()) {
              //console.warn('RefreshToken expired, redirecting to login');
              this.isLoggedInSubject.next(false);
              inject(Router).navigate(['/']);
            }
          });
        }, timeUntilExpiry - refreshThreshold);
      } else if (timeUntilExpiry > 0) {
        //console.warn('AccessToken expires soon, refreshing immediately');
        this.refresh().catch((error) => {
          //console.error('Immediate refresh failed:', error);
          if (this.isRefreshTokenExpired()) {
            //console.warn('RefreshToken expired, redirecting to login');
            this.isLoggedInSubject.next(false);
            inject(Router).navigate(['/']);
          }
        });
      } else {
        //console.warn('AccessToken already expired');
        if (!this.isRefreshTokenExpired()) {
          //.log('RefreshToken still valid, attempting to refresh');
          this.refresh().catch((error) => {
            //console.error('Refresh failed:', error);
            //console.warn('RefreshToken expired or invalid, redirecting to login');
            this.isLoggedInSubject.next(false);
            inject(Router).navigate(['/']);
          });
        } else {
          //console.warn('RefreshToken expired, redirecting to login');
          this.isLoggedInSubject.next(false);
          inject(Router).navigate(['/']);
        }
      }
    } catch (e) {
      //console.error('Error decoding access token for refresh timer:', e);
      this.isLoggedInSubject.next(false);
      inject(Router).navigate(['/']);
    }
  }

  async refresh(): Promise<LoginResponse> {
    const userData = this.userDataSubject.value;
    const refreshToken = userData?.refreshToken;
    if (!refreshToken) {
      //console.warn('No refresh token available');
      this.isLoggedInSubject.next(false);
      inject(Router).navigate(['/']);
      throw new Error('لا يوجد ريفريش توكن');
    }
    try {
      //console.log('Sending refresh request with:', { refreshToken });
      const response = await firstValueFrom(
        this.http
          .post<LoginResponse>(
            `${this.API_URL}/refresh`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          )
          .pipe(
            catchError((error) => {
              let errorMessage = 'فشل تجديد التوكن';
              if (error.status === 400 || error.status === 401) {
                errorMessage = 'الريفريش توكن غير صالح.';
              }
              console.error('Refresh token error:', error);
              return throwError(() => new Error(errorMessage));
            })
          )
      );
      //console.log('Refresh response:', response);
      // التحقق من وجود expiresAt في الاستجابة، وإلا نستخدم القديم
      const updatedUserData: LoginResponse = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt || userData?.expiresAt || '', // الاحتفاظ بـ expiresAt الأصلي
      };
      this.userDataSubject.next(updatedUserData);
      this.isLoggedInSubject.next(true);
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('isLoggedIn', 'true');
      this.startTokenRefreshTimer();
      return response;
    } catch (error: any) {
      console.error('Refresh failed:', error);
      this.isLoggedInSubject.next(false);
      inject(Router).navigate(['/']);
      throw new Error(error.message || 'فشل تجديد التوكن');
    }
  }

  logout(): void {
    const refreshToken = this.userDataSubject.value?.refreshToken;
    if (refreshToken) {
      this.http
        .post(
          `${this.API_URL}/revoke`,
          { refreshToken },
          { responseType: 'text' }
        )
        .pipe(
          catchError((error) => {
            //console.warn('Failed to revoke token:', error);
            return of('Token revocation failed, proceeding with logout');
          })
        )
        .subscribe();
    }
    this.isLoggedInSubject.next(false);
    this.userDataSubject.next(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userData');
    localStorage.removeItem('savedEmail');
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      console.warn('No access token found');
      return true;
    }
    try {
      const decoded: JwtPayload = jwtDecode(token);
      if (!decoded.exp) {
        console.warn('AccessToken does not contain expiry information');
        return true;
      }
      const expiry = decoded.exp * 1000;
      const now = Date.now();
      const isExpired = expiry < now;
      /*console.log(
        `AccessToken expiry: ${new Date(expiry)}, Now: ${new Date(
          now
        )}, Expired: ${isExpired}`
      );*/
      return isExpired;
    } catch (e) {
      console.error('Error decoding access token:', e);
      return true;
    }
  }

  isRefreshTokenExpired(): boolean {
    const userData = this.userDataSubject.value;
    if (!userData || !userData.expiresAt) {
      //console.warn('No user data or refresh token expiry found');
      return true;
    }
    try {
      const expiry = Date.parse(userData.expiresAt);
      if (isNaN(expiry)) {
        //console.warn('Invalid expiresAt format:', userData.expiresAt);
        return true;
      }
      const now = Date.now();
      const isExpired = expiry < now;
      /*console.log(
        `RefreshToken expiry: ${new Date(expiry)}, Now: ${new Date(
          now
        )}, Expired: ${isExpired}`
      );*/
      return isExpired;
    } catch (e) {
      console.error('Error parsing refresh token expiresAt:', e);
      return true;
    }
  }

  getToken(): string | null {
    return (
      this.userDataSubject.value?.accessToken ||
      localStorage.getItem('token') ||
      null
    );
  }

  getSavedEmail(): string | null {
    return localStorage.getItem('savedEmail');
  }
}
