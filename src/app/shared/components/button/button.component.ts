import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'], // We'll add Tailwind classes in the HTML and a base CSS if needed
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() class = ''; // Allow passing additional Tailwind classes

  @Output() clickEvent = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent) {
    if (!this.disabled) {
      this.clickEvent.emit(event);
    }
  }

  get buttonClasses(): string {
    const baseClasses =
      'inline-flex items-center justify-center rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantClasses = {
      primary:
        'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
      secondary:
        'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      outline:
        'border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
      ghost: 'text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
      link: 'text-indigo-600 hover:underline focus:ring-indigo-500',
    };

    return `${baseClasses} ${sizeClasses[this.size]} ${
      variantClasses[this.variant]
    } ${this.class}`.trim();
  }
}
