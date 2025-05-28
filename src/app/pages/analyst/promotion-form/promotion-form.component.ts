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

  get formMode(): 'create' | 'edit' {
    // If we have an editingItemId, we're definitely in edit mode
    if (this.editingItemId !== null) {
      return 'edit';
    }

    // Otherwise check if the selected product is marked as editable
    if (!this.selectedProduct?.id || !this.currentPromotionList?.items) {
      return 'create';
    }

    const item = this.currentPromotionList.items.find(
      (item) => item.id === this.selectedProduct?.id && item.isEditable === true
    );
    return item ? 'edit' : 'create';
  }

  get isEditMode(): boolean {
    return this.formMode === 'edit';
  }

  get isCreateMode(): boolean {
    return this.formMode === 'create';
  }

  get formTitle(): string {
    console.log('Form Mode:', this.formMode);
    console.log('Selected Product:', this.selectedProduct);
    console.log('Current List:', this.currentPromotionList);
    console.log('Is Edit Mode:', this.isEditMode);
    return this.isEditMode
      ? 'Actualizar Producto en Promoción'
      : 'Añadir Producto a Promoción';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Actualizar Producto' : 'Añadir Producto';
  }

  get cancelButtonText(): string {
    return this.isEditMode ? 'Cancelar Edición' : 'Cancelar';
  }

  get canSubmit(): boolean {
    if (this.promotionItemForm.invalid || !this.selectedProduct) {
      return false;
    }
    if (this.currentPromotionList?.status !== 'EDICION' && !this.isEditMode) {
      return false;
    }
    return true;
  }

  getErrorMessage(controlName: string): string {
    const control = this.promotionItemForm.get(controlName);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return 'Este campo es requerido.';
    }

    if (controlName === 'selectedQuantity') {
      if (control.hasError('min')) {
        return `Cantidad debe ser al menos ${this.selectedProduct?.minPromotionQuantity}.`;
      }
      if (control.hasError('max')) {
        return `Cantidad no debe exceder ${this.selectedProduct?.maxPromotionQuantity}.`;
      }
      if (control.hasError('pattern')) {
        return 'Cantidad debe ser un número entero positivo.';
      }
    }

    if (controlName === 'promotionalPrice') {
      if (control.hasError('min')) {
        return `Precio debe ser al menos ${this.formatCurrency(
          this.selectedProduct?.minPromotionPrice || 0
        )}.`;
      }
      if (control.hasError('max')) {
        return `Precio debe ser menor que el precio de lista (${this.formatCurrency(
          this.selectedProduct?.listPrice || 0
        )}).`;
      }
    }

    return 'Valor inválido.';
  }

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
    if (!this.canSubmit) {
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
      isEditable: false,
    };

    try {
      if (this.currentPromotionList?.status !== 'EDICION') {
        this.notificationService.error(
          'La lista no está en modo de edición. No se pueden guardar los cambios.'
        );
        return;
      }

      if (this.isEditMode) {
        // Update existing item
        this.promotionService.updateItem(promotionItemPayload);
        this.notificationService.success(
          `Producto "${promotionItemPayload.name}" actualizado.`
        );
      } else {
        // Add new item
        const productAlreadyInList = this.currentPromotionList.items.some(
          (item) => item.id === currentSelectedProductId
        );

        if (productAlreadyInList) {
          this.notificationService.warning(
            'Este producto ya existe en la lista de promoción.'
          );
          return;
        }

        this.promotionService.addItem(promotionItemPayload);
        this.notificationService.success(
          `Producto "${promotionItemPayload.name}" añadido.`
        );
      }

      // Common post-submission cleanup
      this.resetForm();
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al procesar el producto.'
      );
    }
  }

  prefillForm(itemToEdit: PromotionItem): void {
    this.isPrefillingForm = true;
    this.editingItemId = itemToEdit.id;

    // Ensure the item is marked as editable in the list
    if (this.currentPromotionList?.items) {
      const itemToUpdate = this.currentPromotionList.items.find(
        (item) => item.id === itemToEdit.id
      );
      if (itemToUpdate) {
        const updatedItem = {
          ...itemToUpdate,
          isEditable: true,
        };
        this.promotionService.updateItem(updatedItem);
      }
    }

    this.promotionItemForm
      .get('product')
      ?.setValue(itemToEdit.id, { emitEvent: true });
  }

  private formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  resetForm(): void {
    // If we're editing an item, update its isEditable flag back to false
    if (this.isEditMode && this.currentPromotionList?.items) {
      const itemToUpdate = this.currentPromotionList.items.find(
        (item) => item.id === this.selectedProduct?.id
      );
      if (itemToUpdate) {
        const updatedItem = {
          ...itemToUpdate,
          isEditable: false,
        };
        this.promotionService.updateItem(updatedItem);
      }
    }

    // Reset form state
    this.promotionItemForm.reset();
    this.selectedProduct = null;
    this.editingItemId = null;
    this.promotionItemForm.get('product')?.setValue(null, { emitEvent: true });
    this.cdr.detectChanges();
  }
}
