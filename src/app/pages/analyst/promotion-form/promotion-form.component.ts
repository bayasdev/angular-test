import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { PromotionService } from '../../../core/services/promotion.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../shared/components/select/select.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {
  CardComponent,
  CardHeaderComponent,
  CardContentComponent,
} from '../../../shared/components/card/card.component';
import { Product } from '../../../core/models/product.model';
import { PromotionItem } from '../../../core/models/promotion-item.model';
import { PromotionList } from '../../../core/models/promotion-list.model';
import { Observable, Subject, of } from 'rxjs';
import { map, takeUntil, tap, filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-promotion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputComponent,
    SelectComponent,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardContentComponent,
  ],
  templateUrl: './promotion-form.component.html',
  styleUrls: ['./promotion-form.component.css'],
})
export class PromotionFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly promotionService = inject(PromotionService);
  private readonly notificationService = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  promotionItemForm!: FormGroup;
  products$: Observable<Product[]> = of([]);
  productOptions$: Observable<SelectOption[]> = of([]);
  selectedProduct: Product | null = null;

  currentPromotionList: PromotionList | null = null;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.promotionItemForm = this.fb.group({
      product: [null, Validators.required],
      selectedQuantity: [
        null,
        [Validators.required, Validators.pattern(/^[1-9][0-9]*$/)], // Integer > 0
      ],
      promotionalPrice: [null, [Validators.required, Validators.min(0.01)]],
    });

    this.products$ = this.apiService.getProducts();
    this.productOptions$ = this.products$.pipe(
      map((products) => products.map((p) => ({ value: p.id, label: p.name })))
    );

    this.promotionService.currentPromotionList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.currentPromotionList = list;
        this.cdr.detectChanges(); // Update view if list changes (e.g. status)
      });

    this.promotionItemForm
      .get('product')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.selectedProduct = null;
          // Reset dependent fields when product changes
          this.promotionItemForm
            .get('selectedQuantity')
            ?.setValue(null, { emitEvent: false });
          this.promotionItemForm
            .get('promotionalPrice')
            ?.setValue(null, { emitEvent: false });
          this.promotionItemForm.get('selectedQuantity')?.clearValidators();
          this.promotionItemForm.get('promotionalPrice')?.clearValidators();
          this.promotionItemForm
            .get('selectedQuantity')
            ?.updateValueAndValidity({ emitEvent: false });
          this.promotionItemForm
            .get('promotionalPrice')
            ?.updateValueAndValidity({ emitEvent: false });
        }),
        filter((productId) => productId !== null),
        switchMap((productId) =>
          this.products$.pipe(
            map((products) => products.find((p) => p.id === productId) || null)
          )
        )
      )
      .subscribe((product) => {
        this.selectedProduct = product;
        if (product) {
          this.promotionItemForm
            .get('selectedQuantity')
            ?.setValidators([
              Validators.required,
              Validators.min(product.minPromotionQuantity),
              Validators.max(product.maxPromotionQuantity),
              Validators.pattern(/^[1-9][0-9]*$/),
            ]);
          this.promotionItemForm.get('promotionalPrice')?.setValidators([
            Validators.required,
            Validators.min(product.minPromotionPrice),
            (control: AbstractControl) =>
              Validators.max(product.listPrice - 0.01)(control), // Ensure it's less than listPrice
          ]);
        }
        this.promotionItemForm
          .get('selectedQuantity')
          ?.updateValueAndValidity();
        this.promotionItemForm
          .get('promotionalPrice')
          ?.updateValueAndValidity();
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isProductDisabled(productId: number): boolean {
    if (!this.currentPromotionList || !this.currentPromotionList.items)
      return false;
    const itemInList = this.currentPromotionList.items.find(
      (item) => item.id === productId
    );
    // Disable if product is in list and not a rejected, editable item
    return (
      !!itemInList &&
      !(itemInList.status === 'rejected' && itemInList.isEditable)
    );
  }

  onSubmit(): void {
    if (this.promotionItemForm.invalid || !this.selectedProduct) {
      this.notificationService.error(
        'Por favor, complete el formulario correctamente.'
      );
      Object.values(this.promotionItemForm.controls).forEach((control) =>
        control.markAsTouched()
      );
      return;
    }

    const isEditingExistingRejected = this.isEditingRejectedItem(
      this.selectedProduct.id
    );

    // Check if product is already in list and not the one being edited (if it was rejected)
    if (
      this.currentPromotionList?.items.some(
        (item) =>
          item.id === this.selectedProduct!.id &&
          item.id !==
            (isEditingExistingRejected ? this.selectedProduct!.id : -1) &&
          item.status !== 'rejected'
      )
    ) {
      this.notificationService.warning(
        'Este producto ya existe en la lista de promoción.'
      );
      return;
    }

    const formValue = this.promotionItemForm.value;
    const promotionItem: PromotionItem = {
      ...this.selectedProduct,
      selectedQuantity: formValue.selectedQuantity,
      promotionalPrice: Number(formValue.promotionalPrice),
      status: 'pending',
      isEditable: true,
    };

    try {
      if (
        this.currentPromotionList &&
        (this.currentPromotionList.status === 'EDICION' ||
          isEditingExistingRejected)
      ) {
        this.promotionService.addItem(promotionItem);
        this.notificationService.success(
          `Producto "${promotionItem.name}" ${
            isEditingExistingRejected ? 'actualizado' : 'añadido'
          }.`
        );
        this.promotionItemForm.reset();
        this.selectedProduct = null;
        this.promotionItemForm
          .get('product')
          ?.setValue(null, { emitEvent: true }); // emit event to re-trigger productOptions update
        this.cdr.detectChanges();
      } else {
        this.notificationService.error(
          'No se puede añadir/actualizar el producto. La lista no está en modo de edición o el ítem no es un ítem rechazado editable válido.'
        );
      }
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al procesar el producto.'
      );
    }
  }

  isEditingRejectedItem(productId: number): boolean {
    if (!this.currentPromotionList || !this.currentPromotionList.items)
      return false;
    const item = this.currentPromotionList.items.find(
      (i) => i.id === productId
    );
    return !!item && item.status === 'rejected' && item.isEditable === true;
  }

  get promotionalPriceErrorMessage(): string {
    const control = this.promotionItemForm.get('promotionalPrice');
    if (!control || !control.errors) return 'Precio inválido.';

    if (control.hasError('required')) return 'Precio requerido.';
    if (control.hasError('min')) {
      const minPrice = this.selectedProduct?.minPromotionPrice;
      return `Precio debe ser al menos ${
        minPrice ? this.formatCurrency(minPrice) : 'válido'
      }.`;
    }
    if (control.hasError('max')) {
      const listPrice = this.selectedProduct?.listPrice;
      return `Precio debe ser menor que el precio de lista (${
        listPrice ? this.formatCurrency(listPrice) : 'válido'
      }).`;
    }
    return 'Precio inválido.';
  }

  private formatCurrency(value: number): string {
    // Basic currency formatting, consider using CurrencyPipe for more robustness if needed here
    // For simplicity in this getter, doing a basic format.
    // Note: Angular's CurrencyPipe is best used in templates or with DI.
    return `$${value.toFixed(2)}`;
  }
}
