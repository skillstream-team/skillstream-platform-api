export interface CreateEnrollmentDto {
  courseId: number;
  studentId: number;
  amount: number;
  currency?: string;
  provider: string;
  transactionId?: string;
}

export interface EnrollmentResponseDto {
  id: number;
  courseId: number;
  studentId: number;
  paymentId: number;
  createdAt: Date;
  course: {
    id: number;
    title: string;
    price: number;
  };
  student: {
    id: number;
    username: string;
    email: string;
  };
  payment: {
    id: number;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    transactionId?: string;
  };
}

export interface CourseEnrollmentDto {
  id: number;
  username: string;
  email: string;
  enrollmentDate: Date;
}

export interface CourseStatsDto {
  enrolledCount: number;
  totalRevenue: number;
}
