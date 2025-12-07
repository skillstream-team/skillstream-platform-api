// modules/users/dtos/user.dto.ts
export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  role: 'STUDENT' | 'Teacher' | 'ADMIN';
}

export interface UpdateUserDTO {
  username?: string;
  email?: string;
  password?: string;
  role?: 'STUDENT' | 'Teacher' | 'ADMIN';
}