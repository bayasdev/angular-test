export interface Role {
  id: number;
  code: 'analyst' | 'manager' | 'accounting' | string;
  name: string;
  isSupported: boolean;
}
