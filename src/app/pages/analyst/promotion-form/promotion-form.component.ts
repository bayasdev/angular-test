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
import { map, takeUntil, switchMap } from 'rxjs/operators';

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
  isPrefillingForm = false;
  private editingItemId: number | null = null;

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
        if (list && list.items) {
          const itemToEdit = list.items.find(
            (item) => item.isEditable === true
          );
          if (itemToEdit) {
            const formProductId = this.promotionItemForm.get('product')?.value;
            const formQuantity =
              this.promotionItemForm.get('selectedQuantity')?.value;
            const formPrice =
              this.promotionItemForm.get('promotionalPrice')?.value;

            const needsPrefill =
              formProductId !== itemToEdit.id ||
              (formProductId === itemToEdit.id &&
                (formQuantity !== itemToEdit.selectedQuantity ||
                  formPrice !== itemToEdit.promotionalPrice));

            if (needsPrefill && !this.isPrefillingForm) {
              this.prefillForm(itemToEdit);
            }
          }
        }
      });

    this.promotionItemForm
      .get('product')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        switchMap((productId) => {
          if (productId === null) {
            return of(null);
          }
          return this.products$.pipe(
            map((products) => products.find((p) => p.id === productId) || null)
          );
        })
      )
      .subscribe((product) => {
        const previousSelectedProduct = this.selectedProduct;
        this.selectedProduct = product;

        if (this.isPrefillingForm) {
          const currentFormProductId =
            this.promotionItemForm.get('product')?.value;
          const itemToEdit = this.currentPromotionList?.items.find(
            (item) =>
              item.isEditable === true && item.id === currentFormProductId
          );

          if (itemToEdit && product && product.id === itemToEdit.id) {
            this.promotionItemForm.patchValue(
              {
                selectedQuantity: itemToEdit.selectedQuantity,
                promotionalPrice: itemToEdit.promotionalPrice,
              },
              { emitEvent: false }
            );

            this.promotionItemForm
              .get('selectedQuantity')
              ?.setValidators([
                Validators.required,
                Validators.min(product.minPromotionQuantity),
                Validators.max(product.maxPromotionQuantity),
                Validators.pattern(/^[1-9][0-9]*$/),
              ]);
            this.promotionItemForm
              .get('promotionalPrice')
              ?.setValidators([
                Validators.required,
                Validators.min(product.minPromotionPrice),
                (control: AbstractControl) =>
                  Validators.max(product.listPrice - 0.01)(control),
              ]);
            this.promotionItemForm
              .get('selectedQuantity')
              ?.updateValueAndValidity({ emitEvent: false });
            this.promotionItemForm
              .get('promotionalPrice')
              ?.updateValueAndValidity({ emitEvent: false });

            this.notificationService.info(
              `Editando el producto: "${itemToEdit.name}". Por favor, modifíquelo y guarde los cambios.`
            );

            this.cdr.detectChanges();

            Promise.resolve().then(() => {
              this.isPrefillingForm = false;
              const itemProcessedForPrefill = {
                ...itemToEdit,
                isEditable: false,
              };
              this.promotionService.updateItem(itemProcessedForPrefill);
            });
          } else {
            this.isPrefillingForm = false;
          }
        } else {
          if (product?.id !== previousSelectedProduct?.id) {
            this.promotionItemForm
              .get('selectedQuantity')
              ?.setValue(null, { emitEvent: false });
            this.promotionItemForm
              .get('promotionalPrice')
              ?.setValue(null, { emitEvent: false });
          }

          if (product) {
            this.promotionItemForm
              .get('selectedQuantity')
              ?.setValidators([
                Validators.required,
                Validators.min(product.minPromotionQuantity),
                Validators.max(product.maxPromotionQuantity),
                Validators.pattern(/^[1-9][0-9]*$/),
              ]);
            this.promotionItemForm
              .get('promotionalPrice')
              ?.setValidators([
                Validators.required,
                Validators.min(product.minPromotionPrice),
                (control: AbstractControl) =>
                  Validators.max(product.listPrice - 0.01)(control),
              ]);
          } else {
            this.promotionItemForm
              .get('selectedQuantity')
              ?.setValidators([
                Validators.required,
                Validators.pattern(/^[1-9][0-9]*$/),
              ]);
            this.promotionItemForm
              .get('promotionalPrice')
              ?.setValidators([Validators.required, Validators.min(0.01)]);
          }
          this.promotionItemForm
            .get('selectedQuantity')
            ?.updateValueAndValidity();
          this.promotionItemForm
            .get('promotionalPrice')
            ?.updateValueAndValidity();
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isProductDisabled(productId: number): boolean {
    if (!this.currentPromotionList || !this.currentPromotionList.items) {
      return false;
    }
    const itemInList = this.currentPromotionList.items.find(
      (item) => item.id === productId
    );

    if (!itemInList) {
      return false; // Not in list, not disabled.
    }

    if (itemInList.isEditable === true) {
      return false;
    }

    return true;
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

    const formValue = this.promotionItemForm.value;
    const currentSelectedProductId = this.selectedProduct!.id;

    const promotionItemPayload: PromotionItem = {
      ...this.selectedProduct!,
      selectedQuantity: formValue.selectedQuantity,
      promotionalPrice: Number(formValue.promotionalPrice),
      status: 'pending',
      isEditable: false, // isEditable is transient for prefill, not persisted as true
    };

    try {
      if (this.currentPromotionList?.status !== 'EDICION') {
        this.notificationService.error(
          'La lista no está en modo de edición. No se pueden guardar los cambios.'
        );
        return;
      }

      const wasEditingSpecificItem = this.editingItemId !== null;

      if (
        wasEditingSpecificItem &&
        currentSelectedProductId === this.editingItemId
      ) {
        // Case 1: True Update - User was editing an item, and submitted for that same item.
        this.promotionService.updateItem(promotionItemPayload);
        this.notificationService.success(
          `Producto "${promotionItemPayload.name}" actualizado.`
        );
      } else {
        // Case 2: Add New Item OR User was editing item X, but switched to item Y in dropdown.
        // In both sub-scenarios, we are effectively trying to add/validate currentSelectedProductId.

        const productAlreadyInList = this.currentPromotionList.items.some(
          (item) => item.id === currentSelectedProductId
        );

        if (productAlreadyInList) {
          this.notificationService.warning(
            'Este producto ya existe en la lista de promoción.'
          );
          return;
        }

        // If it doesn't exist, add it.
        this.promotionService.addItem(promotionItemPayload);
        if (
          wasEditingSpecificItem &&
          currentSelectedProductId !== this.editingItemId
        ) {
          this.notificationService.success(
            `Producto "${promotionItemPayload.name}" añadido (se cambió el producto durante la edición).`
          );
        } else {
          this.notificationService.success(
            `Producto "${promotionItemPayload.name}" añadido.`
          );
        }
      }

      // Common post-submission cleanup
      this.promotionItemForm.reset();
      this.selectedProduct = null;
      this.editingItemId = null; // Reset editing state
      this.promotionItemForm
        .get('product')
        ?.setValue(null, { emitEvent: true });
      this.cdr.detectChanges();
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al procesar el producto.'
      );
    }
  }

  isEditingMarkedItem(productId: number | undefined): boolean {
    if (
      !this.currentPromotionList ||
      !this.currentPromotionList.items ||
      !productId
    ) {
      return false;
    }
    const item = this.currentPromotionList.items.find(
      (i) => i.id === productId
    );
    return !!item && item.isEditable === true;
  }

  prefillForm(itemToEdit: PromotionItem): void {
    this.isPrefillingForm = true;
    this.editingItemId = itemToEdit.id; // Set the ID of the item being edited
    this.promotionItemForm
      .get('product')
      ?.setValue(itemToEdit.id, { emitEvent: true });
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
