import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationComponent } from './shared/components/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent],
  template: `
    <router-outlet />
    <app-notification />
  `,
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'angular-test';
}
