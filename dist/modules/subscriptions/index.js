"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionAccessService = exports.SubscriptionService = exports.registerSubscriptionRoutes = void 0;
const subscription_routes_1 = __importDefault(require("./routes/rest/subscription.routes"));
const subscription_access_routes_1 = __importDefault(require("./routes/rest/subscription-access.routes"));
const registerSubscriptionRoutes = (app) => {
    app.use('/api/subscriptions', subscription_routes_1.default);
    app.use('/api/subscriptions/access', subscription_access_routes_1.default);
};
exports.registerSubscriptionRoutes = registerSubscriptionRoutes;
var subscription_service_1 = require("./services/subscription.service");
Object.defineProperty(exports, "SubscriptionService", { enumerable: true, get: function () { return subscription_service_1.SubscriptionService; } });
var subscription_access_service_1 = require("./services/subscription-access.service");
Object.defineProperty(exports, "SubscriptionAccessService", { enumerable: true, get: function () { return subscription_access_service_1.SubscriptionAccessService; } });
__exportStar(require("./dtos/subscription.dto"), exports);
