import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role } from '../models/role.model';
import { User } from '../models/user.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly urlBase =
    'https://my-json-server.typicode.com/AValleO/challenge-json-db';

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.urlBase}/roles`);
  }

  validateUser(username: string, password?: string): Observable<User[]> {
    let params = `?username=${username}`;
    if (password) {
      params += `&password=${password}`;
    }
    return this.http.get<User[]>(`${this.urlBase}/users${params}`);
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.urlBase}/products`);
  }
}
