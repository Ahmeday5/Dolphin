import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';
import { CanActivateFn, Router } from '@angular/router';


export const canActivate: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn$.pipe(
    take(1),
    map((isLoggedIn) => {
      console.log('Guard checking, isLoggedIn:', isLoggedIn);
      if (!isLoggedIn) {
        console.warn('Guard redirecting to login');
        return router.createUrlTree(['/']);
      }
      return true;
    })
  );
};
