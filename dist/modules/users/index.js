"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserModule = registerUserModule;
// modules/users/index.ts
const users_routes_1 = __importDefault(require("./routes/rest/users.routes"));
const users_resolver_1 = require("./routes/graphql/users.resolver");
const express_graphql_1 = require("express-graphql");
function registerUserModule(app) {
    // REST
    app.use('/api/users', users_routes_1.default);
    // GraphQL
    app.use('/graphql/users', (0, express_graphql_1.graphqlHTTP)({
        schema: users_resolver_1.usersSchema,
        graphiql: true,
    }));
}
