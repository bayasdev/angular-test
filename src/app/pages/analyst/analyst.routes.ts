import { Route } from '@angular/router';
import { MainLayoutComponent } from '../../core/layout/main-layout.component';
import { AnalystPageComponent } from './analyst-page.component';

export const ANALYST_ROUTES: Route[] = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [{ path: '', component: AnalystPageComponent }],
  },
];
