import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { PromotionList } from '../models/promotion-list.model';
import { PromotionItem } from '../models/promotion-item.model';
import { LocalStorageService } from './local-storage.service';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

const PROMOTION_LIST_STORAGE_KEY = 'promotionList';

@Injectable({
  providedIn: 'root',
})
export class PromotionService {
  private readonly localStorageService = inject(LocalStorageService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private currentPromotionListSubject =
    new BehaviorSubject<PromotionList | null>(this.loadListFromStorage());
  public currentPromotionList$: Observable<PromotionList | null> =
    this.currentPromotionListSubject.asObservable();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  private loadListFromStorage(): PromotionList | null {
    return this.localStorageService.getItem<PromotionList>(
      PROMOTION_LIST_STORAGE_KEY
    );
  }

  private saveListToStorage(list: PromotionList): void {
    this.localStorageService.setItem(PROMOTION_LIST_STORAGE_KEY, list);
  }

  private updateList(updatedFields: Partial<PromotionList>): void {
    let currentList = this.currentPromotionListSubject.getValue();
    if (currentList) {
      currentList = {
        ...currentList,
        ...updatedFields,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: this.authService.getCurrentUserSnapshot()?.id,
      };
      this.currentPromotionListSubject.next(currentList);
      // Only save to storage if list is not in EDICION state
      if (currentList.status !== 'EDICION') {
        this.saveListToStorage(currentList);
      }
    }
  }

  createNewLine(): PromotionList {
    const newList: PromotionList = {
      id: uuidv4(),
      items: [],
      status: 'EDICION',
      submittedBy: this.authService.getCurrentUserSnapshot()?.id,
      submittedAt: new Date(), // Or set this only on actual submission
      lastUpdatedAt: new Date(),
      lastUpdatedBy: this.authService.getCurrentUserSnapshot()?.id,
    };
    this.currentPromotionListSubject.next(newList);
    // Don't save to storage until submitted
    return newList;
  }

  addItem(item: PromotionItem): void {
    const currentList = this.currentPromotionListSubject.getValue();
    if (currentList && currentList.status === 'EDICION') {
      // Prevent adding duplicate products
      const existingItemIndex = currentList.items.findIndex(
        (i) => i.id === item.id
      );
      if (existingItemIndex > -1) {
        // Optionally update existing item or throw error
        console.warn(
          'Product already in list, updating quantity or price if needed'
        );
        // For now, let's assume we replace it or update - this part might need more specific logic
        const updatedItems = [...currentList.items];
        updatedItems[existingItemIndex] = item;
        this.updateList({ items: updatedItems });
        return;
      }
      this.updateList({ items: [...currentList.items, item] });
    } else {
      console.error(
        'Cannot add item: List not in EDICION state or does not exist.'
      );
      // Optionally throw an error or notify the user
    }
  }

  removeItem(itemId: number): void {
    const currentList = this.currentPromotionListSubject.getValue();
    if (currentList && currentList.status === 'EDICION') {
      this.updateList({
        items: currentList.items.filter((i) => i.id !== itemId),
      });
    } else {
      console.error(
        'Cannot remove item: List not in EDICION state or does not exist.'
      );
    }
  }

  updateItem(updatedItem: PromotionItem): void {
    const currentList = this.currentPromotionListSubject.getValue();
    if (currentList) {
      if (
        currentList.status === 'EDICION' ||
        (currentList.status === 'APROBACION' &&
          updatedItem.status === 'rejected')
      ) {
        const items = currentList.items.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        );
        this.updateList({ items });
      } else {
        console.error(
          'Cannot update item: List not in editable state for this item.'
        );
      }
    }
  }

  submitForApproval(): void {
    const currentList = this.currentPromotionListSubject.getValue();
    if (
      currentList &&
      currentList.items.length > 0 &&
      (currentList.status === 'EDICION' ||
        currentList.items.some((it) => it.status === 'rejected'))
    ) {
      const allItemsPending = currentList.items.map((item) => ({
        ...item,
        status: 'pending' as 'pending' | 'approved' | 'rejected',
        isEditable: false,
      }));
      const updatedList: PromotionList = {
        ...currentList,
        status: 'APROBACION' as const,
        items: allItemsPending,
        submittedAt: new Date(),
        submittedBy: this.authService.getCurrentUserSnapshot()?.id,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: this.authService.getCurrentUserSnapshot()?.id,
      };
      this.currentPromotionListSubject.next(updatedList);
      // Save to storage when submitted
      this.saveListToStorage(updatedList);
    } else {
      throwError(
        () => new Error('List is empty or not in a submittable state.')
      );
    }
  }

  returnToAnalyst(): void {
    const currentList = this.currentPromotionListSubject.getValue();
    if (
      currentList &&
      currentList.status === 'APROBACION' &&
      currentList.items.some((i) => i.status === 'rejected')
    ) {
      const editableItems = currentList.items.map((item) => ({
        ...item,
        isEditable: item.status === 'rejected',
      }));
      this.updateList({ status: 'EDICION', items: editableItems });
    } else {
      throwError(
        () =>
          new Error(
            'List cannot be returned to analyst or no items were rejected.'
          )
      );
    }
  }

  finalizeApproval(): void {
    const currentList = this.currentPromotionListSubject.getValue();
    if (
      currentList &&
      currentList.status === 'APROBACION' &&
      currentList.items.every((i) => i.status === 'approved')
    ) {
      this.updateList({ status: 'APROBADO' });
      // Potentially clear from local storage or send to a backend
      // For now, just updating status.
    } else {
      throwError(
        () =>
          new Error(
            'List is not ready for final approval or not all items are approved.'
          )
      );
    }
  }

  // Allow manager to update status of individual items
  updateItemStatus(itemId: number, newStatus: 'approved' | 'rejected'): void {
    const currentList = this.currentPromotionListSubject.getValue();
    if (currentList && currentList.status === 'APROBACION') {
      const items = currentList.items.map((item) =>
        item.id === itemId
          ? { ...item, status: newStatus, isEditable: newStatus === 'rejected' }
          : item
      );
      this.updateList({ items });
    } else {
      console.error('Cannot update item status: List not in APROBACION state.');
    }
  }

  getPromotionListSnapshot(): PromotionList | null {
    return this.currentPromotionListSubject.getValue();
  }

  getProductDetails(itemId: number): PromotionItem | undefined {
    const currentList = this.currentPromotionListSubject.getValue();
    if (!currentList) return undefined;
    // In a real app, this might need to fetch from a product master list
    // if PromotionItem doesn't have all details like min/max quantities/prices.
    // For now, we assume PromotionItem has all necessary details.
    return currentList.items.find((item) => item.id === itemId);
  }

  getItemById(itemId: number): PromotionItem | undefined {
    const currentList = this.currentPromotionListSubject.getValue();
    if (!currentList) return undefined;
    return currentList.items.find((item) => item.id === itemId);
  }

  setItemToEdit(itemId: number): void {
    const currentList = this.currentPromotionListSubject.getValue();
    if (currentList && currentList.status === 'EDICION') {
      const items = currentList.items.map(
        (item) =>
          item.id === itemId
            ? { ...item, isEditable: true }
            : { ...item, isEditable: false } // Ensure only one item is editable
      );
      this.updateList({ items });
      // No direct notification here, the component initiating edit should inform user.
    } else {
      console.warn(
        'Cannot set item to edit: List not in EDICION state or does not exist.'
      );
    }
  }
}
