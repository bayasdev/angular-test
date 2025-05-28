import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  @Input() type: AlertType = 'info';
  @Input() message = '';
  @Input() class = ''; // Allow passing additional Tailwind classes

  get alertClasses(): string {
    const baseClasses = 'p-4 rounded-md';
    const typeClasses = {
      info: 'bg-blue-100 text-blue-700',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
    };
    return `${baseClasses} ${typeClasses[this.type]} ${this.class}`.trim();
  }
}
