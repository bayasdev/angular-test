import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  @Input() class = ''; // Allow passing additional Tailwind classes

  get cardClasses(): string {
    const baseClasses = 'bg-white shadow-md rounded-lg overflow-hidden';
    return `${baseClasses} ${this.class}`.trim();
  }
}

// Optional: Sub-components for card sections if complex structure is needed.
// For simplicity, we can use ng-content selectors and styled divs initially.

@Component({
  selector: 'app-card-header',
  standalone: true,
  imports: [CommonModule],
  template:
    '<div class="p-4 border-b border-gray-200"><ng-content></ng-content></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardHeaderComponent {}

@Component({
  selector: 'app-card-content',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="p-4"><ng-content></ng-content></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardContentComponent {}

@Component({
  selector: 'app-card-footer',
  standalone: true,
  imports: [CommonModule],
  template:
    '<div class="p-4 bg-gray-50 border-t border-gray-200"><ng-content></ng-content></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardFooterComponent {}
