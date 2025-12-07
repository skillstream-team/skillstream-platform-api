"use strict";
/**
 * Pagination utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
exports.createPaginatedResponse = createPaginatedResponse;
/**
 * Parse pagination parameters from query string
 */
function parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20)); // Max 100 per page
    const skip = (page - 1) * limit;
    return { skip, take: limit, page, limit };
}
/**
 * Create paginated response
 */
function createPaginatedResponse(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
