import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../core/layout/main-layout.component';
import { SalesManagerPageComponent } from './sales-manager-page.component';

export const SALES_MANAGER_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: SalesManagerPageComponent,
        title: 'Gestión de Promociones',
      },
    ],
  },
];
