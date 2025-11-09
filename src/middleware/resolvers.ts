// middleware/auth.ts
import { verifyToken } from '../utils/jwt';
import { GraphQLResolveInfo } from 'graphql';

export const authenticated = (resolverFn: Function) => {
  return (parent: any, args: any, context: any, info: GraphQLResolveInfo) => {
    const authHeader = context.req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) throw new Error('Authentication required');

    const payload = verifyToken(token);
    context.user = payload;
    return resolverFn(parent, args, context, info);
  };
};