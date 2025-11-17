"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = exports.realtimeService = void 0;
exports.registerMessagingModule = registerMessagingModule;
const messaging_routes_1 = __importDefault(require("./routes/rest/messaging.routes"));
const realtime_messaging_service_1 = require("./services/realtime-messaging.service");
let realtimeService = null;
exports.realtimeService = realtimeService;
function registerMessagingModule(app, io) {
    // REST routes
    app.use('/api/messaging', messaging_routes_1.default);
    // Socket.IO real-time messaging
    if (io) {
        exports.realtimeService = realtimeService = new realtime_messaging_service_1.RealtimeMessagingService(io);
        console.log('✅ Messaging module registered with Socket.IO support');
    }
    else {
        console.log('⚠️  Messaging module registered without Socket.IO (real-time features disabled)');
    }
}
var messaging_service_1 = require("./services/messaging.service");
Object.defineProperty(exports, "MessagingService", { enumerable: true, get: function () { return messaging_service_1.MessagingService; } });
