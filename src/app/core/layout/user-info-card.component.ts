import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../models/user.model';
import {
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
} from '../../shared/components/card/card.component';

@Component({
  selector: 'app-user-info-card',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    CardHeaderComponent,
    CardContentComponent,
  ],
  template: `
    <app-card *ngIf="user" [class]="class">
      <app-card-header>
        <h3 class="text-lg font-semibold text-gray-700">
          Información del Usuario
        </h3>
      </app-card-header>
      <app-card-content>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <p>
            <span class="font-medium text-gray-600">Código:</span> {{ user.id }}
          </p>
          <p>
            <span class="font-medium text-gray-600">Nombre:</span>
            {{ user.name }}
          </p>
          <p>
            <span class="font-medium text-gray-600">Email (Username):</span>
            {{ user.username }}
          </p>
          <p>
            <span class="font-medium text-gray-600">Rol:</span>
            {{ user.roleCode | titlecase }}
          </p>
          <!-- Add RUC or other fields if available in User model and needed -->
        </div>
      </app-card-content>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInfoCardComponent {
  @Input() user: User | null = null;
  @Input() class = ''; // Allow passing additional Tailwind classes
}
