"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionService = void 0;
exports.getRecommendedCourses = getRecommendedCourses;
const user_model_1 = require("../../users/models/user.model");
class InteractionService {
    /**
     * @swagger
     * /interactions:
     *   post:
     *     summary: Track user interaction
     *     description: Records a user interaction such as viewing a course, attempting a quiz, or rating content. Useful for analytics and recommendations.
     *     tags: [Interactions]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               userId:
     *                 type: integer
     *                 example: 12
     *               courseId:
     *                 type: integer
     *                 example: 5
     *               moduleId:
     *                 type: integer
     *                 example: 10
     *               quizId:
     *                 type: integer
     *                 example: 2
     *               eventType:
     *                 type: string
     *                 example: "view"
     *                 description: The type of interaction (e.g. 'view', 'attempt', 'rating', 'search')
     *               metadata:
     *                 type: object
     *                 example: { "score": 5, "duration": 120 }
     *     responses:
     *       201:
     *         description: Interaction successfully recorded
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               example:
     *                 id: 101
     *                 userId: 12
     *                 courseId: 5
     *                 eventType: "view"
     *                 createdAt: "2025-10-04T10:00:00Z"
     *       400:
     *         description: Invalid request or missing parameters
     */
    async trackInteraction(data) {
        return user_model_1.prisma.interaction.create({
            data: {
                ...data,
                metadata: data.metadata || undefined
            }
        });
    }
    /**
     * @swagger
     * /interactions/user/{userId}:
     *   get:
     *     summary: Get all user interactions
     *     description: Retrieves all recorded interactions for a given user.
     *     tags: [Interactions]
     *     parameters:
     *       - in: path
     *         name: userId
     *         required: true
     *         schema:
     *           type: integer
     *           example: 12
     *     responses:
     *       200:
     *         description: List of user interactions
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: integer
     *                   userId:
     *                     type: integer
     *                   courseId:
     *                     type: integer
     *                   eventType:
     *                     type: string
     *                   metadata:
     *                     type: object
     *                     nullable: true
     *                   createdAt:
     *                     type: string
     *                     format: date-time
     */
    async getUserInteractions(userId) {
        return user_model_1.prisma.interaction.findMany({
            where: { userId }
        });
    }
}
exports.InteractionService = InteractionService;
/**
 * @swagger
 * /recommendations/{userId}:
 *   get:
 *     summary: Get recommended courses for a user
 *     description: Generates personalized course recommendations based on a user’s past interactions (e.g., views, attempts, ratings, searches).
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *     responses:
 *       200:
 *         description: List of top recommended courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   price:
 *                     type: number
 *       404:
 *         description: No recommendations found for user
 */
async function getRecommendedCourses(userId) {
    const interactions = await user_model_1.prisma.interaction.findMany({ where: { userId } });
    const courseScores = {};
    interactions.forEach(i => {
        if (!i.courseId)
            return;
        let score = 0;
        switch (i.eventType) {
            case 'view':
                score += 1;
                break;
            case 'attempt':
                score += 3;
                break;
            case 'rating':
                const metadata = i.metadata;
                score += (metadata?.score || 0);
                break;
            case 'search':
                score += 2;
                break;
        }
        courseScores[i.courseId] = (courseScores[i.courseId] || 0) + score;
    });
    const topCourseIds = Object.entries(courseScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([courseId]) => Number(courseId));
    return user_model_1.prisma.course.findMany({
        where: { id: { in: topCourseIds } }
    });
}
