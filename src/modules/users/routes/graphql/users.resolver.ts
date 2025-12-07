// modules/users/routes/graphql/users.resolver.ts
import { UsersService } from '../../services/users.service';
import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
} from 'graphql';
import bcrypt from 'bcrypt';

const service = new UsersService();

// ------------------ GraphQL Types ------------------
const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt) },
    username: { type: GraphQLNonNull(GraphQLString) },
    email: { type: GraphQLString },
    role: { type: GraphQLNonNull(GraphQLString) },
  }),
});

// Input type for updating user
const UserUpdateInputType = new GraphQLInputObjectType({
  name: 'UserUpdateInput',
  fields: {
    username: { type: GraphQLString },
    email: { type: GraphQLString },
  },
});

// ------------------ Queries ------------------
const usersQuery = {
  users: {
    type: new GraphQLList(UserType),
    args: {
      page: { type: GraphQLInt },
      limit: { type: GraphQLInt },
    },
    resolve: async (_: any, args: any) => {
      const result = await service.getAllUsers(args.page || 1, args.limit || 20);
      return result.data;
    },
  },
  user: {
    type: UserType,
    args: { id: { type: GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      const user = await service.getUserById(args.id);
      // @ts-ignore
        return { ...user, id: Number(user.id) };
    },
  },
  userProfile: {
    type: UserType,
    args: { userId: { type: GraphQLNonNull(GraphQLInt) } },
    resolve: async (_: any, args: any) => {
      const profile = await service.getUserProfile(args.userId);
      // @ts-ignore
        return { ...profile, id: Number(profile.id) };
    },
  },
  roles: {
    type: new GraphQLList(GraphQLString),
    resolve: async () => await service.getRoles(),
  },
};

// ------------------ Mutations ------------------
const usersMutation = {
  updateUser: {
    type: UserType,
    args: {
      id: { type: GraphQLNonNull(GraphQLInt) },
      input: { type: GraphQLNonNull(UserUpdateInputType) },
    },
    resolve: async (_: any, args: any) => {
      const updated = await service.updateUser(args.id, args.input);
      return { ...updated, id: Number(updated.id) };
    },
  },
  changePassword: {
    type: GraphQLString, // return success message
    args: {
      id: { type: GraphQLNonNull(GraphQLInt) },
      oldPassword: { type: GraphQLNonNull(GraphQLString) },
      newPassword: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (_: any, args: any) => {
      const user = await service.getUserById(args.id);
      // @ts-ignore
        const valid = await bcrypt.compare(args.oldPassword, user.password);
      if (!valid) throw new Error('Old password is incorrect');

      await service.changePassword(args.id, args.newPassword);
      return 'Password changed successfully';
    },
  },
  updateUserRole: {
    type: UserType,
    args: {
      id: { type: GraphQLNonNull(GraphQLInt) },
      role: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (_: any, args: any) => {
      const updated = await service.updateUserRole(args.id, args.role);
      return { ...updated, id: Number(updated.id) };
    },
  },
};

// ------------------ Schema ------------------
export const usersSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: usersQuery,
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: usersMutation,
  }),
});