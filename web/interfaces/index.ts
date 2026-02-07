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
  estimatedEndDate: any | null;
  clientUserId: string | null;
  createdAt: any;
  updatedAt: any;
}

export type ExpenseType = 'expense' | 'payment' | 'provider_expense';

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
  items: ExpenseItem[] | null;
  imageUrl: string | null;
  audioTranscription: string | null;
  originalMessage: string;
  source: 'whatsapp' | 'web';
  date: any;
  createdAt: any;
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
