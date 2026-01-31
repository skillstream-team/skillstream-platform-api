"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserModule = registerUserModule;
// modules/users/index.ts
const users_routes_1 = __importDefault(require("./routes/rest/users.routes"));
const oauth_routes_1 = __importDefault(require("./routes/rest/oauth.routes"));
const admin_routes_1 = __importDefault(require("./routes/rest/admin.routes"));
const settings_routes_1 = __importDefault(require("./routes/rest/settings.routes"));
const notifications_routes_1 = __importDefault(require("./routes/rest/notifications.routes"));
const push_notifications_routes_1 = __importDefault(require("./routes/rest/push-notifications.routes"));
const data_export_routes_1 = __importDefault(require("./routes/rest/data-export.routes"));
const webhooks_routes_1 = __importDefault(require("./routes/rest/webhooks.routes"));
const analytics_routes_1 = __importDefault(require("./routes/rest/analytics.routes"));
const api_keys_routes_1 = __importDefault(require("./routes/rest/api-keys.routes"));
const bulk_operations_routes_1 = __importDefault(require("./routes/rest/bulk-operations.routes"));
const activity_log_routes_1 = __importDefault(require("./routes/rest/activity-log.routes"));
const gamification_routes_1 = __importDefault(require("./routes/rest/gamification.routes"));
const admin_management_routes_1 = __importDefault(require("./routes/rest/admin-management.routes"));
const admin_platform_routes_1 = __importDefault(require("./routes/rest/admin-platform.routes"));
const teachers_routes_1 = __importDefault(require("./routes/rest/teachers.routes"));
const users_resolver_1 = require("./routes/graphql/users.resolver");
const express_graphql_1 = require("express-graphql");
function registerUserModule(app) {
    // REST
    app.use('/api/users', users_routes_1.default);
    app.use('/api', oauth_routes_1.default);
    app.use('/api', admin_routes_1.default);
    app.use('/api', settings_routes_1.default);
    app.use('/api', notifications_routes_1.default);
    app.use('/api/users', push_notifications_routes_1.default);
    app.use('/api', data_export_routes_1.default);
    app.use('/api', webhooks_routes_1.default);
    app.use('/api', analytics_routes_1.default);
    app.use('/api', api_keys_routes_1.default);
    app.use('/api', bulk_operations_routes_1.default);
    app.use('/api', activity_log_routes_1.default);
    app.use('/api', gamification_routes_1.default);
    app.use('/api', admin_management_routes_1.default);
    app.use('/api', admin_platform_routes_1.default);
    app.use('/api', teachers_routes_1.default);
    // GraphQL
    app.use('/graphql/users', (0, express_graphql_1.graphqlHTTP)({
        schema: users_resolver_1.usersSchema,
        graphiql: true,
    }));
}
