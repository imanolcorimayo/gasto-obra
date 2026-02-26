export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(price || 0);
};

export const formatDate = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const capitalizeFirst = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

import type { ExpenseCategory } from '~/interfaces';

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { value: 'materiales', label: 'Materiales', color: '#3498DB' },
  { value: 'herramientas', label: 'Herramientas', color: '#E67E22' },
  { value: 'transporte', label: 'Transporte', color: '#F1C40F' },
  { value: 'mano de obra', label: 'Mano de obra', color: '#9B59B6' },
  { value: 'comida', label: 'Comida', color: '#27AE60' },
  { value: 'otros', label: 'Otros', color: '#95A5A6' }
];

// Backward compat alias
export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;

export const resolveCategories = (
  globalCats: ExpenseCategory[],
  projectCats?: ExpenseCategory[]
): ExpenseCategory[] => {
  // If no custom categories at all, return defaults
  if (globalCats.length === 0 && (!projectCats || projectCats.length === 0)) {
    return DEFAULT_EXPENSE_CATEGORIES;
  }

  // Start with global categories
  const merged = [...globalCats];

  // Project categories override global ones with the same value
  if (projectCats && projectCats.length > 0) {
    for (const pc of projectCats) {
      const idx = merged.findIndex(c => c.value === pc.value);
      if (idx !== -1) {
        merged[idx] = pc;
      } else {
        merged.push(pc);
      }
    }
  }

  return merged.length > 0 ? merged : DEFAULT_EXPENSE_CATEGORIES;
};

export const getCategoryLabel = (value: string, categories?: ExpenseCategory[]): string => {
  const list = categories && categories.length > 0 ? categories : DEFAULT_EXPENSE_CATEGORIES;
  const cat = list.find(c => c.value === value);
  return cat ? cat.label : capitalizeFirst(value);
};

export const getCategoryColor = (value: string, categories?: ExpenseCategory[]): string => {
  const list = categories && categories.length > 0 ? categories : DEFAULT_EXPENSE_CATEGORIES;
  const cat = list.find(c => c.value === value);
  return cat ? cat.color : '#95A5A6';
};

export const getCategoryStyles = (value: string, categories?: ExpenseCategory[]) => {
  const color = getCategoryColor(value, categories);
  return {
    backgroundColor: `${color}26`,
    color: color
  };
};

export const PROJECT_STATUSES = [
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Completado' }
];

export const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Gasto', color: '#3498DB' },
  { value: 'payment', label: 'Cobro', color: '#27AE60' },
  { value: 'provider_expense', label: 'Gasto propio', color: '#95A5A6' }
];

export const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Pagado', color: '#27AE60' },
  { value: 'pending', label: 'Pendiente', color: '#E74C3C' }
];

export const PAYMENT_METHODS = [
  { value: 'transferencia', label: 'Transferencia', color: '#3498DB' },
  { value: 'efectivo', label: 'Efectivo', color: '#27AE60' },
  { value: 'tarjeta', label: 'Tarjeta', color: '#9B59B6' },
  { value: 'mercadopago', label: 'Mercado Pago', color: '#00B1EA' }
];

export const getPaymentStatusLabel = (value: string): string => {
  const status = PAYMENT_STATUSES.find(s => s.value === value);
  return status ? status.label : capitalizeFirst(value);
};

export const getPaymentStatusColor = (value: string): string => {
  const status = PAYMENT_STATUSES.find(s => s.value === value);
  return status ? status.color : '#95A5A6';
};

export const getPaymentStatusStyles = (value: string) => {
  const color = getPaymentStatusColor(value);
  return {
    backgroundColor: `${color}26`,
    color: color
  };
};

export const getPaymentMethodLabel = (value: string): string => {
  const method = PAYMENT_METHODS.find(m => m.value === value);
  return method ? method.label : capitalizeFirst(value);
};
