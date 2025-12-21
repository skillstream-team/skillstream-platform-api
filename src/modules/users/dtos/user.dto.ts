// modules/users/dtos/user.dto.ts
export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  referralCode?: string;
}

export interface UpdateUserDTO {
  username?: string;
  email?: string;
  password?: string;
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
}