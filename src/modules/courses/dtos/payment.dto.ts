export interface CreatePaymentDto {
  studentId: string;
  courseId: string;
  amount: number;
  currency?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  provider: string;
  transactionId?: string;
}

export interface PaymentResponseDto {
  id: string;
  studentId: string;
  courseId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  transactionId?: string;
  createdAt: Date;
  student: {
    id: string;
    username: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    price: number;
  };
}

export interface UpdatePaymentStatusDto {
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionId?: string;
}
