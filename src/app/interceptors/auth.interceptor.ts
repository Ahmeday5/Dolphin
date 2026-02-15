import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
} from '@angular/common/http';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LoginResponse } from '../types/login.type';
import { Router } from '@angular/router';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<
  string | null
>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const accessToken = authService.getToken();

  //console.log(`Interceptor processing request: ${req.url}, Token: ${accessToken ? 'Present' : 'Missing'}`);

  if (
    !req.url.includes('/login-appuser') &&
    !req.url.includes('/refresh') &&
    !req.url.includes('/revoke') &&
    accessToken &&
    !authService.isTokenExpired()
  ) {
    //console.log('Adding Authorization header with token');
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    });
  } else if (accessToken && authService.isTokenExpired()) {
    //console.warn(`AccessToken expired for request: ${req.url}`);
  }

  return next(req).pipe(
    catchError((error) => {
      if (
        error.status === 401 &&
        !req.url.includes('/refresh') &&
        !req.url.includes('/login-appuser') &&
        !req.url.includes('/revoke')
      ) {
        //console.warn(`401 error for request: ${req.url}, attempting token refresh`);
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return from(authService.refresh()).pipe(
            switchMap((tokens: LoginResponse) => {
              //console.log('Token refreshed successfully, new token:', tokens.accessToken);
              isRefreshing = false;
              refreshTokenSubject.next(tokens.accessToken);
              return next(
                req.clone({
                  setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
                })
              );
            }),
            catchError((err) => {
              isRefreshing = false;
              //console.error('Refresh token failed:', err);
              authService.isLoggedInSubject.next(false);
              inject(Router).navigate(['/']);
              return throwError(() => err);
            })
          );
        } else {
          //console.log('Another refresh is in progress, waiting for new token');
          return refreshTokenSubject.pipe(
            filter((token) => token != null),
            take(1),
            switchMap((token) => {
              //console.log('Using new token for retrying request:', token);
              return next(
                req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
              );
            })
          );
        }
      }
      //console.error(`Error processing request: ${req.url}`, error);
      return throwError(() => error);
    })
  );
};
