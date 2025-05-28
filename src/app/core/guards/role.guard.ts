import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { Observable, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service'; // Optional: for messages

@Injectable({
  providedIn: 'root',
})
export class RoleGuard {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService); // Optional

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const expectedRoles = route.data?.['expectedRoles'] as string[];

    if (!expectedRoles || expectedRoles.length === 0) {
      return of(true); // No roles specified, allow access
    }

    return this.authService.currentUser$.pipe(
      take(1),
      switchMap((user) => {
        if (!user || !user.roleCode) {
          this.notificationService.error(
            'Acceso denegado. No tienes un rol asignado.'
          );
          this.router.navigate(['/login']);
          return of(false);
        }

        // Check if the user's roleCode is in the expected roles directly
        if (expectedRoles.includes(user.roleCode)) {
          return of(true);
        }

        this.notificationService.error(
          'No tienes permiso para acceder a esta página.'
        );
        // Redirect based on role
        if (user.roleCode === 'analyst') {
          this.router.navigate(['/analyst']);
        } else if (user.roleCode === 'manager') {
          this.router.navigate(['/sales-manager']);
        } else {
          this.router.navigate(['/login']);
        }
        return of(false);
      })
    );
  }
}

// Functional wrapper for the class-based guard if you prefer to use it as CanActivateFn directly in routes
export const roleGuardFn: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean> => {
  return inject(RoleGuard).canActivate(route);
};
