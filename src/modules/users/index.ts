// modules/users/index.ts
import restRoutes from './routes/rest/users.routes';
import oauthRoutes from './routes/rest/oauth.routes';
import adminRoutes from './routes/rest/admin.routes';
import { usersSchema } from './routes/graphql/users.resolver';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';

export function registerUserModule(app: express.Application) {
  // REST
  app.use('/api/users', restRoutes);
  app.use('/api', oauthRoutes);
  app.use('/api', adminRoutes);

  // GraphQL
  app.use('/graphql/users', graphqlHTTP({
    schema: usersSchema,
    graphiql: true,
  }));
}