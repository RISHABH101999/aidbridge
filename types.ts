
export enum UserType {
  Donor = 'Donor',
  NGO = 'NGO',
}

export enum ItemStatus {
  Available = 'Available',
  Reserved = 'Reserved',
  Donated = 'Donated',
}

export interface User {
  userId: string;
  email: string;
  fullName: string;
  userType: UserType;
  ngoVerificationId?: string;
  address?: string;
}

export interface DonatedItem {
  itemId: string;
  donorId: string;
  itemName: string;
  description: string;
  category: string;
  imageUrl: string;
  status: ItemStatus;
}

export interface ChatMessage {
  messageId: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

// The key for this will be `${donorId}_${ngoId}_${itemId}`
export type ChatThreads = Record<string, ChatMessage[]>;
