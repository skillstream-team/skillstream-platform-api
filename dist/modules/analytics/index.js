"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementService = exports.registerAnalyticsRoutes = void 0;
const engagement_routes_1 = __importDefault(require("./routes/rest/engagement.routes"));
const registerAnalyticsRoutes = (app) => {
    app.use('/api/analytics', engagement_routes_1.default);
};
exports.registerAnalyticsRoutes = registerAnalyticsRoutes;
var engagement_service_1 = require("./services/engagement.service");
Object.defineProperty(exports, "EngagementService", { enumerable: true, get: function () { return engagement_service_1.EngagementService; } });
