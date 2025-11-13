"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersSchema = void 0;
// modules/users/routes/graphql/users.resolver.ts
const users_service_1 = require("../../services/users.service");
const graphql_1 = require("graphql");
const bcrypt_1 = __importDefault(require("bcrypt"));
const service = new users_service_1.UsersService();
// ------------------ GraphQL Types ------------------
const UserType = new graphql_1.GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) },
        username: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
        email: { type: graphql_1.GraphQLString },
        role: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
    }),
});
// Input type for updating user
const UserUpdateInputType = new graphql_1.GraphQLInputObjectType({
    name: 'UserUpdateInput',
    fields: {
        username: { type: graphql_1.GraphQLString },
        email: { type: graphql_1.GraphQLString },
    },
});
// ------------------ Queries ------------------
const usersQuery = {
    users: {
        type: new graphql_1.GraphQLList(UserType),
        resolve: async () => await service.getAllUsers(),
    },
    user: {
        type: UserType,
        args: { id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            const user = await service.getUserById(args.id);
            // @ts-ignore
            return { ...user, id: Number(user.id) };
        },
    },
    userProfile: {
        type: UserType,
        args: { userId: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) } },
        resolve: async (_, args) => {
            const profile = await service.getUserProfile(args.userId);
            // @ts-ignore
            return { ...profile, id: Number(profile.id) };
        },
    },
    roles: {
        type: new graphql_1.GraphQLList(graphql_1.GraphQLString),
        resolve: async () => await service.getRoles(),
    },
};
// ------------------ Mutations ------------------
const usersMutation = {
    updateUser: {
        type: UserType,
        args: {
            id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) },
            input: { type: (0, graphql_1.GraphQLNonNull)(UserUpdateInputType) },
        },
        resolve: async (_, args) => {
            const updated = await service.updateUser(args.id, args.input);
            return { ...updated, id: Number(updated.id) };
        },
    },
    changePassword: {
        type: graphql_1.GraphQLString, // return success message
        args: {
            id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) },
            oldPassword: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
            newPassword: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
        },
        resolve: async (_, args) => {
            const user = await service.getUserById(args.id);
            // @ts-ignore
            const valid = await bcrypt_1.default.compare(args.oldPassword, user.password);
            if (!valid)
                throw new Error('Old password is incorrect');
            await service.changePassword(args.id, args.newPassword);
            return 'Password changed successfully';
        },
    },
    updateUserRole: {
        type: UserType,
        args: {
            id: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLInt) },
            role: { type: (0, graphql_1.GraphQLNonNull)(graphql_1.GraphQLString) },
        },
        resolve: async (_, args) => {
            const updated = await service.updateUserRole(args.id, args.role);
            return { ...updated, id: Number(updated.id) };
        },
    },
};
// ------------------ Schema ------------------
exports.usersSchema = new graphql_1.GraphQLSchema({
    query: new graphql_1.GraphQLObjectType({
        name: 'Query',
        fields: usersQuery,
    }),
    mutation: new graphql_1.GraphQLObjectType({
        name: 'Mutation',
        fields: usersMutation,
    }),
});
