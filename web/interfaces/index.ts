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
  createdAt: any;
  updatedAt: any;
}

export interface Expense {
  id: string;
  projectId: string;
  providerId: string;
  title: string;
  description: string;
  amount: number;
  category: string;
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
