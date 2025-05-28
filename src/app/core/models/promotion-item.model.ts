import { Product } from './product.model';

export interface PromotionItem extends Product {
  selectedQuantity: number;
  promotionalPrice: number;
  status: 'pending' | 'approved' | 'rejected';
  isEditable?: boolean;
}
