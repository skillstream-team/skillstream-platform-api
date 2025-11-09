export interface CreatePaymentDto {
  studentId: number;
  courseId: number;
  amount: number;
  currency?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  provider: string;
  transactionId?: string;
}

export interface PaymentResponseDto {
  id: number;
  studentId: number;
  courseId: number;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  transactionId?: string;
  createdAt: Date;
  student: {
    id: number;
    username: string;
    email: string;
  };
  course: {
    id: number;
    title: string;
    price: number;
  };
}

export interface UpdatePaymentStatusDto {
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionId?: string;
}
