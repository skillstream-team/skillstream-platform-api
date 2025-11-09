// modules/users/models/user.model.ts
import { User } from '@prisma/client';
import { prisma } from '../../../utils/prisma';

export { prisma };
export type UserType = User;