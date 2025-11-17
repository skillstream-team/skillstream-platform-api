"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.testDatabaseConnection = testDatabaseConnection;
const client_1 = require("@prisma/client");
// Singleton pattern to prevent multiple instances of Prisma Client
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
/**
 * Test database connection
 */
async function testDatabaseConnection() {
    try {
        await exports.prisma.$connect();
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
