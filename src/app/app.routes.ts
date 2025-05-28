import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuardFn } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: 'analyst',
    loadChildren: () =>
      import('./pages/analyst/analyst.routes').then((m) => m.ANALYST_ROUTES),
    canActivate: [authGuard, roleGuardFn],
    data: { expectedRoles: ['analyst'] },
  },
  {
    path: 'sales-manager',
    loadChildren: () =>
      import('./pages/sales-manager/sales-manager.routes').then(
        (m) => m.SALES_MANAGER_ROUTES
      ),
    canActivate: [authGuard, roleGuardFn],
    data: { expectedRoles: ['manager'] },
  },
  // Default route: redirect to login or a dashboard based on auth status
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  // Wildcard route for 404
  {
    path: '**',
    redirectTo: '/login', // Or a dedicated 404 component
  },
];
