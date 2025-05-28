import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserInfoCardComponent } from './user-info-card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { NotificationComponent } from '../../shared/components/notification/notification.component';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    UserInfoCardComponent,
    ButtonComponent,
    NotificationComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
})
export class MainLayoutComponent {
  private readonly authService: AuthService = inject(AuthService);

  currentUser$: Observable<User | null>;

  constructor() {
    this.currentUser$ = this.authService.currentUser$;
  }

  logout(): void {
    this.authService.logout();
  }
}
