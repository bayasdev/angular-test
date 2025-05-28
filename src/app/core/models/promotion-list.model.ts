import { PromotionItem } from './promotion-item.model';

export type PromotionListStatus = 'EDICION' | 'APROBACION' | 'APROBADO';

export interface PromotionList {
  id: string; // client-generated UUID
  items: PromotionItem[];
  status: PromotionListStatus;
  submittedBy?: number; // User ID
  submittedAt?: Date;
  lastUpdatedBy?: number; // User ID
  lastUpdatedAt?: Date;
}
