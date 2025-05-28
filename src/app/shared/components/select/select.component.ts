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
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface SelectOption {
  value: string | number | boolean | null | undefined;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent
  implements ControlValueAccessor, OnInit, OnDestroy
{
  @Input() options: SelectOption[] = [];
  @Input() placeholder = '';
  @Input() label?: string;
  @Input() formControlName?: string;
  @Input() class = '';
  @Input() errorMessage = '';

  control: FormControl = new FormControl();
  private _value: SelectOption['value'];
  isDisabled = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange: (value: SelectOption['value']) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouched: () => void = () => {};
  private destroy$ = new Subject<void>();

  constructor(
    @Optional() private formGroupDirective: FormGroupDirective,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.formGroupDirective && this.formControlName) {
      const parentControl = this.formGroupDirective.form.get(
        this.formControlName
      );
      if (parentControl) {
        this.control.setValidators(parentControl.validator);
        if (parentControl.disabled) {
          this.control.disable({ emitEvent: false });
        } else {
          this.control.enable({ emitEvent: false });
        }
      } else {
        console.warn(
          `Control with name ${this.formControlName} not found in parent FormGroup for app-select.`
        );
      }
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

  writeValue(value: SelectOption['value']): void {
    this._value = value;
    this.control.setValue(value, { emitEvent: false });
  }

  registerOnChange(fn: (value: SelectOption['value']) => void): void {
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
    if (!this.control) return false;
    return (
      this.control.invalid &&
      (this.control.dirty ||
        this.control.touched ||
        (this.formGroupDirective && this.formGroupDirective.submitted))
    );
  }

  get selectClasses(): string {
    const baseSelectClasses =
      'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed';
    const errorClasses = this.showError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : '';
    return `${baseSelectClasses} ${errorClasses} ${this.class}`.trim();
  }

  get displayedErrorMessage(): string | null {
    if (!this.showError || !this.control) return null;
    if (this.control.hasError('required')) return 'Este campo es requerido.';
    // Add more specific error messages as needed
    return this.errorMessage || 'Selección inválida.';
  }

  onSelectChange(): void {
    this.onTouched();
    this.cdr.detectChanges();
  }
}
