import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PromotionService } from '../../core/services/promotion.service';
import { PromotionListDisplayComponent } from './promotion-list-display/promotion-list-display.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PromotionList } from '../../core/models/promotion-list.model';
import { Observable, Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';

@Component({
  selector: 'app-analyst-page',
  standalone: true,
  imports: [
    CommonModule,
    PromotionListDisplayComponent,
    ButtonComponent,
    AlertComponent,
  ],
  templateUrl: './analyst-page.component.html',
  styleUrls: ['./analyst-page.component.css'],
})
export class AnalystPageComponent implements OnInit, OnDestroy {
  private readonly promotionService = inject(PromotionService);
  private readonly notificationService = inject(NotificationService);

  currentPromotionList$: Observable<PromotionList | null>;
  private destroy$ = new Subject<void>();

  constructor() {
    this.currentPromotionList$ = this.promotionService.currentPromotionList$;
  }

  ngOnInit(): void {
    // Check if a list exists, if not, or if current list is APROBADO, create a new one.
    this.promotionService.currentPromotionList$
      .pipe(
        takeUntil(this.destroy$),
        tap((list) => {
          if (!list || list.status === 'APROBADO') {
            this.createNewList();
          }
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createNewList(): void {
    try {
      const newList = this.promotionService.createNewLine();
      this.notificationService.info(
        `Nueva lista de promoción con ID: ${newList.id} creada.`
      );
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al crear nueva lista.'
      );
    }
  }

  canCreateNewList(currentList: PromotionList | null): boolean {
    // Allow creating a new list if no list exists, or current one is approved or in approval (to start fresh)
    return (
      !currentList ||
      currentList.status === 'APROBADO' ||
      currentList.status === 'APROBACION'
    );
  }
}
