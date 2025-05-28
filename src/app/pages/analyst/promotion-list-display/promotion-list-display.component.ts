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
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  FormControl,
} from '@angular/forms';
import { PromotionService } from '../../../core/services/promotion.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiService } from '../../../core/services/api.service';
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
import { InputComponent } from '../../../shared/components/input/input.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../shared/components/select/select.component';
import { PromotionItem } from '../../../core/models/promotion-item.model';
import { Product } from '../../../core/models/product.model';
import {
  PromotionList,
  PromotionListStatus,
} from '../../../core/models/promotion-list.model';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-promotion-list-display',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableComponent,
    ButtonComponent,
    BadgeComponent,
    AlertComponent,
    CurrencyPipe,
    TitleCasePipe,
    CardComponent,
    CardHeaderComponent,
    CardContentComponent,
    InputComponent,
    SelectComponent,
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
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  @ViewChild('actionsCell') actionsCellTemplate!: TemplateRef<unknown>;
  @ViewChild('statusCell') statusCellTemplate!: TemplateRef<unknown>;
  @ViewChild('priceCell') priceCellTemplate!: TemplateRef<unknown>;
  @ViewChild('editableQuantityCell')
  editableQuantityCellTemplate!: TemplateRef<unknown>;
  @ViewChild('editablePriceCell')
  editablePriceCellTemplate!: TemplateRef<unknown>;
  @ViewChild('newProductFormTemplate')
  newProductFormTemplate!: TemplateRef<unknown>;

  currentPromotionList$: Observable<PromotionList | null>;
  promotionItems$: Observable<PromotionItem[]> = of([]);
  columns: ColumnDef[] = [];

  listStatus: PromotionListStatus | null = null;
  private destroy$ = new Subject<void>();

  editingItemId: number | null = null;
  itemEditForm!: FormGroup;
  isAddingNewProduct = false;
  newProductForm!: FormGroup;
  products$: Observable<Product[]> = of([]);
  productOptions$: Observable<SelectOption[]> = of([]);
  selectedProduct: Product | null = null;

  constructor() {
    this.currentPromotionList$ = this.promotionService.currentPromotionList$;
    this.initializeForm();
    this.initializeNewProductForm();
    this.products$ = this.apiService.getProducts();
    this.productOptions$ = this.products$.pipe(
      map((products) => products.map((p) => ({ value: p.id, label: p.name })))
    );
  }

  ngOnInit(): void {
    this.currentPromotionList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.listStatus = list ? list.status : null;
        this.promotionItems$ = of(list ? list.items : []);
        this.cdr.detectChanges();
        if (
          this.editingItemId &&
          list &&
          !list.items.find((item) => item.id === this.editingItemId)
        ) {
          this.onCancelEdit();
        }
      });
  }

  ngAfterViewInit(): void {
    this.columns = [
      { key: 'name', header: 'Producto' },
      {
        key: 'selectedQuantity',
        header: 'Cantidad',
        cellRenderer: this.editableQuantityCellTemplate,
      },
      {
        key: 'listPrice',
        header: 'Precio Lista',
        cellRenderer: this.priceCellTemplate,
      },
      {
        key: 'promotionalPrice',
        header: 'Precio Promo',
        cellRenderer: this.editablePriceCellTemplate,
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
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.itemEditForm = this.fb.group({
      selectedQuantity: [
        null,
        [Validators.required, Validators.pattern(/^[1-9][0-9]*$/)],
      ],
      promotionalPrice: [null, [Validators.required, Validators.min(0.01)]],
    });
  }

  private initializeNewProductForm(): void {
    this.newProductForm = this.fb.group({
      product: [null, Validators.required],
      selectedQuantity: [null, [Validators.required, Validators.min(1)]],
      promotionalPrice: [null, [Validators.required, Validators.min(0.01)]],
    });

    this.newProductForm
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
        this.selectedProduct = product;

        if (product) {
          this.newProductForm
            .get('selectedQuantity')
            ?.setValidators([
              Validators.required,
              Validators.min(product.minPromotionQuantity),
              Validators.max(product.maxPromotionQuantity),
              Validators.pattern(/^[1-9][0-9]*$/),
            ]);
          this.newProductForm
            .get('promotionalPrice')
            ?.setValidators([
              Validators.required,
              Validators.min(product.minPromotionPrice),
              (control: AbstractControl) =>
                Validators.max(product.listPrice - 0.01)(control),
            ]);
        } else {
          this.newProductForm
            .get('selectedQuantity')
            ?.setValidators([
              Validators.required,
              Validators.pattern(/^[1-9][0-9]*$/),
            ]);
          this.newProductForm
            .get('promotionalPrice')
            ?.setValidators([Validators.required, Validators.min(0.01)]);
        }
        this.newProductForm.get('selectedQuantity')?.updateValueAndValidity();
        this.newProductForm.get('promotionalPrice')?.updateValueAndValidity();
        this.cdr.detectChanges();
      });
  }

  isEditing(item: PromotionItem): boolean {
    return this.editingItemId === item.id;
  }

  onEditItemClicked(item: PromotionItem): void {
    if (this.listStatus !== 'EDICION') {
      this.notificationService.warning(
        'Solo se pueden editar productos cuando la lista está en edición.'
      );
      return;
    }
    if (item.status === 'approved') {
      this.notificationService.warning(
        'Los productos aprobados no se pueden editar directamente en la tabla.'
      );
      return;
    }

    this.editingItemId = item.id;
    const productDetails = this.promotionService.getProductDetails(item.id);

    if (!productDetails) {
      this.notificationService.error(
        `No se pudieron obtener los detalles del producto para ${item.name}`
      );
      this.editingItemId = null;
      return;
    }

    this.itemEditForm.patchValue({
      selectedQuantity: item.selectedQuantity,
      promotionalPrice: item.promotionalPrice,
    });

    this.itemEditForm
      .get('selectedQuantity')
      ?.setValidators([
        Validators.required,
        Validators.min(productDetails.minPromotionQuantity),
        Validators.max(productDetails.maxPromotionQuantity),
        Validators.pattern(/^[1-9][0-9]*$/),
      ]);
    this.itemEditForm
      .get('promotionalPrice')
      ?.setValidators([
        Validators.required,
        Validators.min(productDetails.minPromotionPrice),
        (control: AbstractControl) =>
          Validators.max(productDetails.listPrice - 0.01)(control),
      ]);
    this.itemEditForm.get('selectedQuantity')?.updateValueAndValidity();
    this.itemEditForm.get('promotionalPrice')?.updateValueAndValidity();

    this.cdr.detectChanges();
  }

  onSaveItem(item: PromotionItem): void {
    if (!this.itemEditForm.valid || !this.editingItemId) {
      this.notificationService.error(
        'Por favor, corrija los errores en el formulario.'
      );
      Object.values(this.itemEditForm.controls).forEach((control) => {
        control.markAsTouched();
      });
      return;
    }

    const formValue = this.itemEditForm.value;

    try {
      const currentItem = this.promotionService.getItemById(item.id);
      if (!currentItem) {
        throw new Error(`El producto con ID ${item.id} no fue encontrado.`);
      }
      const fullUpdatedItem: PromotionItem = {
        ...currentItem,
        selectedQuantity: formValue.selectedQuantity,
        promotionalPrice: Number(formValue.promotionalPrice),
        status: item.status === 'rejected' ? 'pending' : item.status,
        isEditable: false,
      };

      this.promotionService.updateItem(fullUpdatedItem);
      this.notificationService.success(`Producto "${item.name}" actualizado.`);
      this.editingItemId = null;
      this.itemEditForm.reset();
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al actualizar el producto.'
      );
    }
    this.cdr.detectChanges();
  }

  onCancelEdit(): void {
    this.editingItemId = null;
    this.itemEditForm.reset();
    this.cdr.detectChanges();
  }

  getEditFormErrorMessage(controlName: string, item: PromotionItem): string {
    const control = this.itemEditForm.get(controlName);
    if (!control || !control.errors || this.editingItemId !== item.id)
      return '';

    const productDetails = this.promotionService.getProductDetails(item.id);
    if (!productDetails) return 'Error obteniendo detalles del producto.';

    if (control.hasError('required')) {
      return 'Requerido.';
    }

    if (controlName === 'selectedQuantity') {
      if (control.hasError('min')) {
        return `Mín: ${productDetails.minPromotionQuantity}.`;
      }
      if (control.hasError('max')) {
        return `Máx: ${productDetails.maxPromotionQuantity}.`;
      }
      if (control.hasError('pattern')) {
        return 'Inválido.';
      }
    }

    if (controlName === 'promotionalPrice') {
      if (control.hasError('min')) {
        return `Mín: ${this.formatCurrency(productDetails.minPromotionPrice)}.`;
      }
      if (control.hasError('max')) {
        return `Debe ser < ${this.formatCurrency(productDetails.listPrice)}.`;
      }
    }
    return 'Inválido.';
  }

  private formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
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

  editItem(item: PromotionItem): void {
    if (this.listStatus === 'EDICION') {
      this.promotionService.setItemToEdit(item.id);
      this.notificationService.info(
        `Editando el producto: "${item.name}". Por favor, modifíquelo en el formulario de arriba.`
      );
    } else {
      this.notificationService.warning(
        'Solo se pueden editar productos cuando la lista está en edición.'
      );
    }
  }

  editRejectedItem(item: PromotionItem): void {
    if (item.status === 'rejected' && this.listStatus === 'EDICION') {
      this.promotionService.setItemToEdit(item.id);
      this.notificationService.info(
        `Editando el producto rechazado: "${item.name}". Por favor, modifíquelo en el formulario de arriba.`
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

  // Add getters for form controls for easier and type-safe access in template
  get quantityControl(): FormControl {
    return this.itemEditForm.get('selectedQuantity') as FormControl;
  }

  get priceControl(): FormControl {
    return this.itemEditForm.get('promotionalPrice') as FormControl;
  }

  // Add getters for new product form controls
  get newProductSelectControl(): FormControl {
    return this.newProductForm.get('product') as FormControl;
  }

  get newProductQuantityControl(): FormControl {
    return this.newProductForm.get('selectedQuantity') as FormControl;
  }

  get newProductPromotionalPriceControl(): FormControl {
    return this.newProductForm.get('promotionalPrice') as FormControl;
  }

  onAddProduct(): void {
    if (this.listStatus !== 'EDICION') {
      this.notificationService.warning(
        'Solo se pueden agregar productos cuando la lista está en edición.'
      );
      return;
    }
    this.isAddingNewProduct = true;
    this.newProductForm.reset();
    this.cdr.detectChanges();
  }

  onCancelAddProduct(): void {
    this.isAddingNewProduct = false;
    this.newProductForm.reset();
    this.cdr.detectChanges();
  }

  onSaveNewProduct(): void {
    if (!this.newProductForm.valid || !this.selectedProduct) {
      this.notificationService.error(
        'Por favor, corrija los errores en el formulario.'
      );
      Object.values(this.newProductForm.controls).forEach((control) => {
        control.markAsTouched();
      });
      return;
    }

    const formValue = this.newProductForm.value;
    const promotionalPrice = Number(formValue.promotionalPrice);

    if (promotionalPrice >= this.selectedProduct.listPrice) {
      this.notificationService.error(
        'El precio promocional debe ser menor al precio de lista.'
      );
      return;
    }

    try {
      const newItem: PromotionItem = {
        ...this.selectedProduct,
        selectedQuantity: formValue.selectedQuantity,
        promotionalPrice: promotionalPrice,
        status: 'pending',
        isEditable: false,
      };

      this.promotionService.addItem(newItem);
      this.notificationService.success(`Producto "${newItem.name}" agregado.`);
      this.isAddingNewProduct = false;
      this.newProductForm.reset();
      this.selectedProduct = null;
    } catch (error: unknown) {
      this.notificationService.error(
        (error instanceof Error ? error.message : String(error)) ||
          'Error al agregar el producto.'
      );
    }
    this.cdr.detectChanges();
  }

  getNewProductFormErrorMessage(controlName: string): string {
    const control = this.newProductForm.get(controlName);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return 'Requerido.';
    }

    if (controlName === 'selectedQuantity') {
      if (control.hasError('min')) {
        return `Mín: ${this.selectedProduct?.minPromotionQuantity}.`;
      }
      if (control.hasError('max')) {
        return `Máx: ${this.selectedProduct?.maxPromotionQuantity}.`;
      }
      if (control.hasError('pattern')) {
        return 'Inválido.';
      }
    }

    if (controlName === 'promotionalPrice') {
      if (control.hasError('min')) {
        return `Mín: ${this.formatCurrency(
          this.selectedProduct?.minPromotionPrice || 0
        )}.`;
      }
      if (control.hasError('max')) {
        return `Debe ser < ${this.formatCurrency(
          this.selectedProduct?.listPrice || 0
        )}.`;
      }
    }

    return 'Inválido.';
  }
}
