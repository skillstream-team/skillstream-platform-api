export interface CreateEnrollmentDto {
  collectionId?: string; // Backward compatibility
  programId?: string;
  studentId: string;
  amount: number;
  currency?: string;
  provider: string;
  transactionId?: string;
}

export interface EnrollmentResponseDto {
  id: string;
  collectionId?: string; // Backward compatibility
  programId?: string;
  studentId: string;
  paymentId: string | null;
  createdAt: Date;
  collection?: { // Backward compatibility
    id: string;
    title: string;
    price: number;
  };
  program?: {
    id: string;
    title: string;
    price: number;
  };
  student: {
    id: string;
    username: string;
    email: string;
  };
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    transactionId?: string;
  };
}

export interface CourseEnrollmentDto {
  id: string;
  username: string;
  email: string;
  enrollmentDate: Date;
}

export interface CourseStatsDto {
  enrolledCount: number;
  totalRevenue: number;
}
