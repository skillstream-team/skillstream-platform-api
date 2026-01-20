"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkshopService = exports.registerWorkshopRoutes = void 0;
const workshops_routes_1 = __importDefault(require("./routes/rest/workshops.routes"));
const registerWorkshopRoutes = (app) => {
    app.use('/api/workshops', workshops_routes_1.default);
};
exports.registerWorkshopRoutes = registerWorkshopRoutes;
var workshop_service_1 = require("./services/workshop.service");
Object.defineProperty(exports, "WorkshopService", { enumerable: true, get: function () { return workshop_service_1.WorkshopService; } });
