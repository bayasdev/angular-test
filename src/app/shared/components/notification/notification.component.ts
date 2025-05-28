import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NotificationService,
  Notification,
} from '../../../core/services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0, transform: 'translateY(-20px)' })),
      state('*', style({ opacity: 1, transform: 'translateY(0)' })),
      transition(':enter', [animate('300ms ease-out')]),
      transition(':leave', [animate('300ms ease-in')]),
    ]),
  ],
})
export class NotificationComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  notifications: Notification[] = [];
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.notificationService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification: Notification) => {
        this.notifications.push(notification);
        // Automatically remove notification after a delay
        setTimeout(
          () => this.removeNotification(notification),
          notification.duration || 5000
        );
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  removeNotification(notificationToRemove: Notification): void {
    this.notifications = this.notifications.filter(
      (n) => n !== notificationToRemove
    );
  }

  getIconHtml(type: 'success' | 'error' | 'info' | 'warning'): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  }

  getAlertClass(type: 'success' | 'error' | 'info' | 'warning'): string {
    const baseClasses =
      'shadow-lg transform transition-all duration-300 ease-in-out';
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-600`;
      case 'error':
        return `${baseClasses} bg-red-600`;
      case 'info':
        return `${baseClasses} bg-blue-600`;
      case 'warning':
        return `${baseClasses} bg-yellow-600`;
      default:
        return `${baseClasses} bg-gray-600`;
    }
  }
}
