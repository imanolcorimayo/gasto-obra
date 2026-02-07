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

export const EXPENSE_CATEGORIES = [
  { value: 'materiales', label: 'Materiales', color: '#3498DB' },
  { value: 'herramientas', label: 'Herramientas', color: '#E67E22' },
  { value: 'transporte', label: 'Transporte', color: '#F1C40F' },
  { value: 'mano de obra', label: 'Mano de obra', color: '#9B59B6' },
  { value: 'comida', label: 'Comida', color: '#27AE60' },
  { value: 'otros', label: 'Otros', color: '#95A5A6' }
];

export const getCategoryLabel = (value: string): string => {
  const cat = EXPENSE_CATEGORIES.find(c => c.value === value);
  return cat ? cat.label : capitalizeFirst(value);
};

export const getCategoryColor = (value: string): string => {
  const cat = EXPENSE_CATEGORIES.find(c => c.value === value);
  return cat ? cat.color : '#95A5A6';
};

export const getCategoryStyles = (value: string) => {
  const color = getCategoryColor(value);
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
  { value: 'payment', label: 'Pago del cliente', color: '#27AE60' },
  { value: 'provider_expense', label: 'Gasto propio', color: '#95A5A6' }
];
