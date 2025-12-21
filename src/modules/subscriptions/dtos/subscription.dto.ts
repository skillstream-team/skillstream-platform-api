export interface CreateSubscriptionDto {
  userId: string;
  provider: string;
  transactionId?: string;
}

export interface SubscriptionResponseDto {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  provider: string;
  transactionId?: string;
  startsAt: Date;
  expiresAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionStatusDto {
  isActive: boolean;
  status: string;
  expiresAt?: Date;
  subscription?: SubscriptionResponseDto;
}

export interface ActivateSubscriptionDto {
  transactionId: string;
  provider: string;
}
