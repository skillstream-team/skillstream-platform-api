"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRevenueService = exports.TeacherEarningsService = exports.registerEarningsRoutes = void 0;
const earnings_routes_1 = __importDefault(require("./routes/rest/earnings.routes"));
const registerEarningsRoutes = (app) => {
    app.use('/api/earnings', earnings_routes_1.default);
};
exports.registerEarningsRoutes = registerEarningsRoutes;
var teacher_earnings_service_1 = require("./services/teacher-earnings.service");
Object.defineProperty(exports, "TeacherEarningsService", { enumerable: true, get: function () { return teacher_earnings_service_1.TeacherEarningsService; } });
var subscription_revenue_service_1 = require("./services/subscription-revenue.service");
Object.defineProperty(exports, "SubscriptionRevenueService", { enumerable: true, get: function () { return subscription_revenue_service_1.SubscriptionRevenueService; } });
