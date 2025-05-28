import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { LocalStorageService } from './local-storage.service';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';

const USER_STORAGE_KEY = 'currentUser';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly router = inject(Router);

  private currentUserSubject = new BehaviorSubject<User | null>(
    this.loadUserFromStorage()
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  public isAuthenticated$: Observable<boolean> = this.currentUser$.pipe(
    map((user) => !!user)
  );

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  private loadUserFromStorage(): User | null {
    return this.localStorageService.getItem<User>(USER_STORAGE_KEY);
  }

  private saveUserToStorage(user: User): void {
    this.localStorageService.setItem(USER_STORAGE_KEY, user);
  }

  private clearUserFromStorage(): void {
    this.localStorageService.removeItem(USER_STORAGE_KEY);
  }

  login(username: string, password?: string): Observable<User> {
    return this.apiService.validateUser(username, password).pipe(
      switchMap((users) => {
        if (users && users.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const apiUser = users[0] as any;
          const user: User = {
            id: apiUser.id,
            username: apiUser.username,
            roleCode: apiUser.role,
            name: `${apiUser.name.first} ${apiUser.name.last}`,
            picture: apiUser.picture,
          };
          return this.apiService.getRoles().pipe(
            map((roles) => {
              const userRole = roles.find((r) => r.code === user.roleCode);
              if (!userRole) {
                throw new Error('Rol no encontrado para el usuario.');
              }
              if (!userRole.isSupported) {
                throw new Error('Rol no soportado.');
              }
              this.saveUserToStorage(user);
              this.currentUserSubject.next(user);
              return user;
            })
          );
        } else {
          return throwError(() => new Error('Credenciales inválidas'));
        }
      }),
      catchError((error) => {
        console.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.clearUserFromStorage();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getUserRole(): Observable<Role | undefined> {
    const currentUser = this.currentUserSubject.getValue();
    if (!currentUser || !currentUser.roleCode) {
      return of(undefined);
    }
    return this.apiService
      .getRoles()
      .pipe(map((roles) => roles.find((r) => r.code === currentUser.roleCode)));
  }

  getCurrentUserSnapshot(): User | null {
    return this.currentUserSubject.getValue();
  }
}
