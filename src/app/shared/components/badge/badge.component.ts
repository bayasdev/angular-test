import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'primary';
  @Input() text = '';
  @Input() class = ''; // Allow passing additional Tailwind classes

  get badgeClasses(): string {
    const baseClasses =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const variantClasses = {
      primary: 'bg-indigo-100 text-indigo-800',
      secondary: 'bg-gray-100 text-gray-800',
      destructive: 'bg-red-100 text-red-800',
      outline: 'text-gray-700 border border-gray-300',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
    };
    return `${baseClasses} ${variantClasses[this.variant]} ${
      this.class
    }`.trim();
  }
}
