import {
  Component,
  Input,
  forwardRef,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  Optional,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  FormControl,
  FormGroupDirective,
  Validators,
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

  private _value: unknown;
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  onChange: (value: unknown) => void = (_value: unknown) => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouched: () => void = () => {};
  isDisabled = false;
  control: FormControl = new FormControl();

  private destroy$ = new Subject<void>();

  constructor(@Optional() private formGroupDirective: FormGroupDirective) {}

  ngOnInit() {
    if (this.formGroupDirective && this.formControlName) {
      const formControl = this.formGroupDirective.form.get(
        this.formControlName
      );
      if (formControl instanceof FormControl) {
        this.control = formControl;
      } else {
        console.warn(
          `Control with name ${this.formControlName} not found or not a FormControl. Initializing a new FormControl for app-input.`
        );
        if (this.type === 'email') {
          this.control.setValidators([Validators.email]);
          this.control.updateValueAndValidity();
        }
      }
    } else {
      // No formGroupDirective, initialize simple control without email validation by default
    }

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
    if (this.control) {
      this.control.setValue(value, { emitEvent: false });
    }
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    if (this.control) {
      if (isDisabled) {
        this.control.disable({ emitEvent: false });
      } else {
        this.control.enable({ emitEvent: false });
      }
    }
  }

  onBlur() {
    this.onTouched();
  }

  get showError(): boolean {
    if (!this.control) return false;
    return (
      this.control.invalid &&
      (this.control.dirty ||
        this.control.touched ||
        (this.formGroupDirective && this.formGroupDirective.submitted))
    );
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
    if (!this.showError || !this.control) return null;

    if (this.control.hasError('required')) return 'Este campo es requerido.';
    if (this.control.hasError('minlength'))
      return `Debe tener al menos ${this.control.errors?.['minlength']?.requiredLength} caracteres.`;
    if (this.control.hasError('maxlength'))
      return `No debe exceder los ${this.control.errors?.['maxlength']?.requiredLength} caracteres.`;
    if (this.control.hasError('pattern')) return 'Formato inválido.';
    if (this.control.hasError('min'))
      return `El valor debe ser mayor o igual a ${this.control.errors?.['min']?.min}.`;
    if (this.control.hasError('max'))
      return `El valor debe ser menor o igual a ${this.control.errors?.['max']?.max}.`;
    return this.errorMessage || 'Valor inválido.';
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._value = value;
    this.onChange(this._value);
    this.onTouched();
  }
}
