import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
} from '../../shared/components/card/card.component';
import { InputComponent } from '../../shared/components/input/input.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AlertComponent } from '../../shared/components/alert/alert.component'; // For error messages
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardContentComponent,
    InputComponent,
    ButtonComponent,
    AlertComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  public readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  loginForm!: FormGroup;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos correctamente.';
      // Mark all fields as touched to display errors
      Object.values(this.loginForm.controls).forEach((control) => {
        control.markAsTouched();
      });
      return;
    }
    this.errorMessage = null;

    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
      next: (user: User) => {
        this.notificationService.success('Inicio de sesión exitoso!');
        if (user.roleCode === 'analyst') {
          this.router.navigate(['/analyst']);
        } else if (user.roleCode === 'manager') {
          this.router.navigate(['/sales-manager']);
        } else {
          this.notificationService.warning(
            'Rol de usuario no compatible para redirección automática.'
          );
          this.router.navigate(['/']);
        }
      },
      error: (err: Error) => {
        this.errorMessage =
          err.message || 'Ocurrió un error durante el inicio de sesión.';
        this.notificationService.error(this.errorMessage || 'Error en login');
      },
    });
  }
}
