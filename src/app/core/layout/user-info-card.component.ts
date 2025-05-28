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
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div class="space-y-2">
            <p>
              <span class="font-bold text-gray-600">Nombre:</span>
              {{ user.name.first }} {{ user.name.last }}
            </p>
            <p>
              <span class="font-bold text-gray-600">Usuario:</span>
              {{ user.username }}
            </p>
          </div>
          <div class="space-y-2">
            <p>
              <span class="font-bold text-gray-600">Código:</span>
              {{ user.id }}
            </p>
            <p>
              <span class="font-bold text-gray-600">Rol:</span>
              {{ user.role | titlecase }}
            </p>
          </div>
          <div class="flex items-center justify-center">
            <img
              *ngIf="user.picture.large"
              [src]="user.picture.large"
              alt="Foto de perfil"
              class="w-20 h-20 rounded-full"
            />
          </div>
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
