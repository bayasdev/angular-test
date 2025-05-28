import {
  Component,
  OnDestroy,
  inject,
  ChangeDetectorRef,
  ViewChild,
  TemplateRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule, CurrencyPipe, TitleCasePipe } from '@angular/common';
import { PromotionService } from '../../core/services/promotion.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  TableComponent,
  ColumnDef,
} from '../../shared/components/table/table.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import {
  CardComponent,
  CardHeaderComponent,
  CardContentComponent,
  CardFooterComponent,
} from '../../shared/components/card/card.component';
import { PromotionItem } from '../../core/models/promotion-item.model';
import {
  PromotionList,
  PromotionListStatus,
} from '../../core/models/promotion-list.model';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-sales-manager-page',
  standalone: true,
  imports: [
    CommonModule,
    TableComponent,
    ButtonComponent,
    BadgeComponent,
    AlertComponent,
    CurrencyPipe,
    TitleCasePipe,
    CardComponent,
    CardHeaderComponent,
    CardContentComponent,
    CardFooterComponent,
  ],
  templateUrl: './sales-manager-page.component.html',
  styleUrls: ['./sales-manager-page.component.css'],
})
export class SalesManagerPageComponent implements OnDestroy, AfterViewInit {
  private readonly promotionService = inject(PromotionService);
  private readonly notificationService = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('managerActionsCell')
  managerActionsCellTemplate!: TemplateRef<unknown>;
  @ViewChild('statusCellSm') statusCellSmTemplate!: TemplateRef<unknown>;
  @ViewChild('priceCellSm') priceCellSmTemplate!: TemplateRef<unknown>;

  currentPromotionList$: Observable<PromotionList | null>;
  promotionItems$: Observable<PromotionItem[]> = of([]);
  columns: ColumnDef[] = [];

  listStatus: PromotionListStatus | null = null;
  canFinalize = false;
  canReturnToAnalyst = false;

  private destroy$ = new Subject<void>();

  constructor() {
    this.currentPromotionList$ =
      this.promotionService.currentPromotionList$.pipe(
        takeUntil(this.destroy$),
        tap((list) => {
          if (list && list.status === 'APROBACION') {
            this.canFinalize = list.items.every(
              (item) => item.status === 'approved'
            );
            this.canReturnToAnalyst = list.items.some(
              (item) => item.status === 'rejected'
            );
          } else {
            this.canFinalize = false;
            this.canReturnToAnalyst = false;
          }
          this.listStatus = list ? list.status : null;
          this.promotionItems$ = of(list ? list.items : []);
          this.cdr.detectChanges();
        })
      );
  }

  ngAfterViewInit(): void {
    this.columns = [
      { key: 'name', header: 'Producto' },
      { key: 'selectedQuantity', header: 'Cantidad' },
      {
        key: 'listPrice',
        header: 'Precio Lista',
        cellRenderer: this.priceCellSmTemplate,
      },
      {
        key: 'promotionalPrice',
        header: 'Precio Promo',
        cellRenderer: this.priceCellSmTemplate,
      },
      {
        key: 'status',
        header: 'Estado',
        cellRenderer: this.statusCellSmTemplate,
        cellClass: 'text-center',
      },
      {
        key: 'actions',
        header: 'Acciones',
        cellRenderer: this.managerActionsCellTemplate,
        cellClass: 'text-center',
      },
    ];
    this.cdr.detectChanges(); // Ensure table columns are updated after view init
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateItemStatus(item: PromotionItem, status: 'approved' | 'rejected'): void {
    if (this.listStatus !== 'APROBACION') {
      this.notificationService.warning(
        'La lista no está en estado de aprobación.'
      );
      return;
    }
    try {
      this.promotionService.updateItemStatus(item.id, status);
      this.notificationService.success(
        `Estado del producto "${item.name}" actualizado a ${status}.`
      );
      // No need to manually update canFinalize/canReturnToAnalyst, piped observable will do it
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al actualizar estado del ítem.'
      );
    }
  }

  returnToAnalyst(): void {
    if (!this.canReturnToAnalyst) {
      this.notificationService.warning(
        'No hay items rechazados para devolver la lista a edición.'
      );
      return;
    }
    try {
      this.promotionService.returnToAnalyst();
      this.notificationService.info('Lista devuelta al analista para edición.');
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al devolver la lista.'
      );
    }
  }

  finalizeApproval(): void {
    if (!this.canFinalize) {
      this.notificationService.warning(
        'No todos los items están aprobados para finalizar la lista.'
      );
      return;
    }
    try {
      this.promotionService.finalizeApproval();
      this.notificationService.success(
        'Lista de promociones aprobada y finalizada.'
      );
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al finalizar la aprobación.'
      );
    }
  }

  getBadgeVariant(
    status: PromotionItem['status']
  ): 'primary' | 'secondary' | 'destructive' | 'success' | 'warning' {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'pending': // Should not happen in manager view if workflow is correct
        return 'warning';
      default:
        return 'secondary';
    }
  }
}
