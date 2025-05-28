import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
  ViewChild,
  TemplateRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule, CurrencyPipe, TitleCasePipe } from '@angular/common';
import { PromotionService } from '../../../core/services/promotion.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  TableComponent,
  ColumnDef,
} from '../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import {
  CardComponent,
  CardHeaderComponent,
  CardContentComponent,
} from '../../../shared/components/card/card.component';
import { PromotionItem } from '../../../core/models/promotion-item.model';
import {
  PromotionList,
  PromotionListStatus,
} from '../../../core/models/promotion-list.model';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-promotion-list-display',
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
  ],
  templateUrl: './promotion-list-display.component.html',
  styleUrls: ['./promotion-list-display.component.css'],
})
export class PromotionListDisplayComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  private readonly promotionService = inject(PromotionService);
  private readonly notificationService = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('actionsCell') actionsCellTemplate!: TemplateRef<unknown>;
  @ViewChild('statusCell') statusCellTemplate!: TemplateRef<unknown>;
  @ViewChild('priceCell') priceCellTemplate!: TemplateRef<unknown>;

  currentPromotionList$: Observable<PromotionList | null>;
  promotionItems$: Observable<PromotionItem[]> = of([]);
  columns: ColumnDef[] = [];

  listStatus: PromotionListStatus | null = null;
  private destroy$ = new Subject<void>();

  constructor() {
    this.currentPromotionList$ = this.promotionService.currentPromotionList$;
  }

  ngOnInit(): void {
    this.currentPromotionList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.listStatus = list ? list.status : null;
        this.promotionItems$ = of(list ? list.items : []);
        this.cdr.detectChanges();
      });
  }

  ngAfterViewInit(): void {
    this.columns = [
      { key: 'name', header: 'Producto' },
      { key: 'selectedQuantity', header: 'Cantidad' },
      {
        key: 'listPrice',
        header: 'Precio Lista',
        cellRenderer: this.priceCellTemplate,
      },
      {
        key: 'promotionalPrice',
        header: 'Precio Promo',
        cellRenderer: this.priceCellTemplate,
      },
      {
        key: 'status',
        header: 'Estado',
        cellRenderer: this.statusCellTemplate,
        cellClass: 'text-center',
      },
      {
        key: 'actions',
        header: 'Acciones',
        cellRenderer: this.actionsCellTemplate,
        cellClass: 'text-right',
      },
    ];
    this.cdr.detectChanges(); // Required because ViewChild is accessed
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  removeItem(item: PromotionItem): void {
    if (this.listStatus === 'EDICION') {
      try {
        this.promotionService.removeItem(item.id);
        this.notificationService.success(
          `Producto "${item.name}" eliminado de la lista.`
        );
      } catch (error: unknown) {
        this.notificationService.error(
          (error instanceof Error ? error.message : String(error)) ||
            'Error al eliminar el producto.'
        );
      }
    } else {
      this.notificationService.warning(
        'Solo se pueden eliminar productos cuando la lista está en edición.'
      );
    }
  }

  editRejectedItem(item: PromotionItem): void {
    if (item.status === 'rejected' && this.listStatus === 'EDICION') {
      // Mark item as editable for the form component to pick up and prefill
      // The PromotionFormComponent should handle prefilling based on this or a dedicated event/service call
      // For now, we ensure PromotionService correctly updates the item's editable state for consistency
      const updatedItem = { ...item, isEditable: true };
      this.promotionService.updateItem(updatedItem);
      this.notificationService.info(
        `Editando el producto rechazado: "${item.name}". Por favor, modifíquelo en el formulario de arriba.`
      );
      // Potentially scroll to form or emit event to PromotionFormComponent
    } else {
      this.notificationService.warning(
        'Este ítem no puede ser editado en el estado actual.'
      );
    }
  }

  submitList(): void {
    try {
      this.promotionService.submitForApproval();
      this.notificationService.success('Lista enviada para aprobación.');
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al enviar la lista.'
      );
    }
  }

  canSubmitList(list: PromotionList | null): boolean {
    if (!list || list.items.length === 0) return false;
    return (
      list.status === 'EDICION' ||
      list.items.some((it) => it.status === 'rejected')
    );
  }

  getBadgeVariant(
    status: PromotionItem['status']
  ): 'primary' | 'secondary' | 'destructive' | 'success' | 'warning' {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  }
}
