export interface Project {
  id: string;
  name: string;
  tag: string;
  description: string;
  address: string;
  clientName: string;
  clientPhone: string;
  providerId: string;
  status: 'active' | 'completed' | 'paused';
  shareToken: string;
  budget: number | null;
  startDate: any | null;
  estimatedEndDate: any | null;
  clientUserId: string | null;
  reportNumber: string | null;
  createdAt: any;
  updatedAt: any;
}

export interface Recipient {
  name: string;
  bankInfo: string;
  platform: string;
  cuit: string;
}

export interface RecipientDoc extends Recipient {
  id: string;
  userId: string;
}

export interface VendorDoc {
  id: string;
  userId: string;
  name: string;
}

export type ExpenseType = 'expense' | 'payment' | 'provider_expense';
export type ScopeType = 'original' | 'addition';

export interface ExpenseItem {
  name: string;
  amount: number;
}

export interface Expense {
  id: string;
  projectId: string;
  providerId: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  type: ExpenseType;
  scopeType: ScopeType;
  items: ExpenseItem[] | null;
  imageUrl: string | null;
  audioUrl: string | null;
  audioTranscription: string | null;
  fileUrl: string | null;
  originalMessage: string;
  paymentMethod: string | null;
  recipientName: string | null;
  recipientBankInfo: string | null;
  recipientPlatform: string | null;
  recipientCuit: string | null;
  linkedExpenseId: string | null;
  linkedPaymentId: string | null;
  deliveryId: string | null;
  installmentPercent: number | null;
  installmentGroupId: string | null;
  vendor: string | null;
  amountBase: number | null;
  managementFeePercent: number | null;
  source: 'whatsapp' | 'web';
  date: any;
  createdAt: any;
}

export interface ExpenseCategory {
  value: string;
  label: string;
  color: string;
}

export interface CategoryDoc extends ExpenseCategory {
  id: string;
  userId: string;
  projectId: string | null;
}

export interface Delivery {
  id: string;
  projectId: string;
  providerId: string;
  number: number;
  date: any;
  description: string;
  createdAt: any;
  updatedAt: any;
}

export interface WhatsappLink {
  id: string;
  status: 'pending' | 'linked';
  userId: string;
  phoneNumber: string;
  contactName: string;
  createdAt: any;
  linkedAt: any;
}
