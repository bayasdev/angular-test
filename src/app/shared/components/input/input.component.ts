import {
  Component,
  Input,
  forwardRef,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  Optional,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  FormControl,
  FormGroupDirective,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() type: 'text' | 'password' | 'email' | 'number' = 'text';
  @Input() placeholder = '';
  @Input() label?: string;
  @Input() errorMessage?: string;
  @Input('aria-label') ariaLabel?: string;
  @Input() formControlName?: string;
  @Input() readonly = false;
  @Input() class = '';

  control: FormControl = new FormControl();
  private _value: unknown;
  private parentControl: AbstractControl | null = null;
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  onChange: (value: unknown) => void = (_value: unknown) => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouched: () => void = () => {};
  isDisabled = false;

  private destroy$ = new Subject<void>();

  constructor(
    @Optional() private formGroupDirective: FormGroupDirective,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.formGroupDirective && this.formControlName) {
      this.parentControl = this.formGroupDirective.form.get(
        this.formControlName
      );

      if (this.parentControl) {
        this.control.setValidators(this.parentControl.validator);
        if (this.parentControl.disabled) {
          this.control.disable({ emitEvent: false });
        } else {
          this.control.enable({ emitEvent: false });
        }

        // Sync the internal control with parent control state
        this.parentControl.statusChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            // Sync validation state
            if (this.parentControl?.errors) {
              this.control.setErrors(this.parentControl.errors);
            } else {
              this.control.setErrors(null);
            }
            // Mark as touched/dirty to match parent
            if (this.parentControl?.touched) {
              this.control.markAsTouched({ onlySelf: true });
            }
            if (this.parentControl?.dirty) {
              this.control.markAsDirty({ onlySelf: true });
            }
            this.cdr.markForCheck();
          });
      } else {
        console.warn(
          `Control with name ${this.formControlName} not found in parent FormGroup for app-input.`
        );
      }
    }

    if (this.type === 'email' && !this.control.validator) {
      this.control.setValidators([Validators.email]);
    }
    this.control.updateValueAndValidity({ emitEvent: false });

    this.control.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.onChange(value);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: unknown): void {
    this._value = value;
    this.control.setValue(value, { emitEvent: false });
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    if (isDisabled) {
      this.control.disable({ emitEvent: false });
    } else {
      this.control.enable({ emitEvent: false });
    }
  }

  onBlur() {
    this.onTouched();
  }

  get showError(): boolean {
    // Use parent control if available, otherwise fall back to internal control
    const controlToCheck = this.parentControl || this.control;

    if (!controlToCheck) return false;

    const hasCustomError = !!this.errorMessage;
    const hasValidationError = controlToCheck.invalid;
    const shouldShow =
      controlToCheck.dirty ||
      controlToCheck.touched ||
      (this.formGroupDirective && this.formGroupDirective.submitted);

    return (hasCustomError || hasValidationError) && shouldShow;
  }

  get inputClasses(): string {
    const baseInputClasses =
      'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed';
    const errorClasses = this.showError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : '';
    return `${baseInputClasses} ${errorClasses} ${this.class}`.trim();
  }

  get displayedErrorMessage(): string | null {
    if (!this.showError) return null;

    // Prioritize custom error message from parent
    if (this.errorMessage) return this.errorMessage;

    // Use parent control for error checking if available
    const controlToCheck = this.parentControl || this.control;
    if (!controlToCheck) return null;

    if (controlToCheck.hasError('required')) return 'Este campo es requerido.';
    if (controlToCheck.hasError('minlength'))
      return `Debe tener al menos ${controlToCheck.errors?.['minlength']?.requiredLength} caracteres.`;
    if (controlToCheck.hasError('maxlength'))
      return `No debe exceder los ${controlToCheck.errors?.['maxlength']?.requiredLength} caracteres.`;
    if (controlToCheck.hasError('pattern')) return 'Formato inválido.';
    if (controlToCheck.hasError('min'))
      return `El valor debe ser mayor o igual a ${controlToCheck.errors?.['min']?.min}.`;
    if (controlToCheck.hasError('max'))
      return `El valor debe ser menor o igual a ${controlToCheck.errors?.['max']?.max}.`;
    if (controlToCheck.hasError('email')) return 'Email inválido.';

    return 'Valor inválido.';
  }

  onInput(): void {
    this.onTouched();
  }
}
