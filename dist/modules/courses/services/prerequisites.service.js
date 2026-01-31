"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrerequisitesService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class PrerequisitesService {
    /**
     * Add a prerequisite to a course
     */
    async addPrerequisite(data) {
        // Prevent self-reference
        if (data.courseId === data.prerequisiteId) {
            throw new Error('A course cannot be a prerequisite of itself');
        }
        // Check if prerequisite program exists
        const prerequisiteCourse = await prisma_1.prisma.program.findUnique({
            where: { id: data.prerequisiteId },
        });
        if (!prerequisiteCourse) {
            throw new Error('Prerequisite program not found');
        }
        // Check if program exists
        const course = await prisma_1.prisma.program.findUnique({
            where: { id: data.collectionId || data.courseId },
        });
        if (!course) {
            throw new Error('Program not found');
        }
        // Check for circular dependencies
        const wouldCreateCycle = await this.wouldCreateCircularDependency(data.courseId, data.prerequisiteId);
        if (wouldCreateCycle) {
            throw new Error('Adding this prerequisite would create a circular dependency');
        }
        // Check if prerequisite already exists
        const existing = await prisma_1.prisma.programPrerequisite.findUnique({
            where: {
                programId_prerequisiteId: {
                    programId: data.collectionId || data.courseId,
                    prerequisiteId: data.prerequisiteId,
                },
            },
        });
        if (existing) {
            throw new Error('This prerequisite already exists');
        }
        const prerequisite = await prisma_1.prisma.programPrerequisite.create({
            data: {
                programId: data.collectionId || data.courseId,
                prerequisiteId: data.prerequisiteId,
                isRequired: data.isRequired ?? true,
            },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                prerequisite: {
                    select: {
                        id: true,
                        title: true,
                        difficulty: true,
                    },
                },
            },
        });
        // Invalidate cache
        await (0, cache_1.deleteCache)(`program:${data.collectionId || data.courseId}`);
        await (0, cache_1.deleteCache)(`program:${data.prerequisiteId}`);
        return this.mapToDto(prerequisite);
    }
    /**
     * Remove a prerequisite from a course
     */
    async removePrerequisite(courseId, prerequisiteId) {
        const prerequisite = await prisma_1.prisma.programPrerequisite.findUnique({
            where: {
                programId_prerequisiteId: {
                    programId: courseId,
                    prerequisiteId,
                },
            },
        });
        if (!prerequisite) {
            throw new Error('Prerequisite not found');
        }
        await prisma_1.prisma.programPrerequisite.delete({
            where: {
                id: prerequisite.id,
            },
        });
        // Invalidate cache
        await (0, cache_1.deleteCache)(`program:${courseId}`);
    }
    /**
     * Get all prerequisites for a course
     */
    async getCoursePrerequisites(courseId) {
        const prerequisites = await prisma_1.prisma.programPrerequisite.findMany({
            where: { programId: courseId },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                prerequisite: {
                    select: {
                        id: true,
                        title: true,
                        difficulty: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return prerequisites.map(this.mapToDto);
    }
    /**
     * Get all courses that require this course as a prerequisite
     */
    async getDependentCourses(courseId) {
        const dependents = await prisma_1.prisma.programPrerequisite.findMany({
            where: { prerequisiteId: courseId },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                prerequisite: {
                    select: {
                        id: true,
                        title: true,
                        difficulty: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return dependents.map(this.mapToDto);
    }
    /**
     * Check if a student has completed all required prerequisites
     */
    async checkPrerequisites(studentId, courseId) {
        const prerequisites = await prisma_1.prisma.programPrerequisite.findMany({
            where: {
                programId: courseId,
                isRequired: true,
            },
            include: {
                prerequisite: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
        if (prerequisites.length === 0) {
            return {
                canEnroll: true,
                missingPrerequisites: [],
            };
        }
        // Check if student has completed all prerequisites
        const prerequisiteIds = prerequisites.map((p) => p.prerequisiteId);
        const completedCourses = await prisma_1.prisma.certificate.findMany({
            where: {
                studentId,
                programId: { in: prerequisiteIds },
            },
            select: {
                programId: true,
            },
        });
        const completedCourseIds = new Set(completedCourses.map((c) => c.programId));
        const missingPrerequisites = prerequisites
            .filter((p) => !completedCourseIds.has(p.prerequisiteId))
            .map((p) => ({
            id: p.prerequisite.id,
            title: p.prerequisite.title,
            isRequired: p.isRequired,
        }));
        return {
            canEnroll: missingPrerequisites.length === 0,
            missingPrerequisites,
        };
    }
    /**
     * Check if adding a prerequisite would create a circular dependency
     */
    async wouldCreateCircularDependency(courseId, prerequisiteId) {
        // If the prerequisite course has the current course as a prerequisite (direct or indirect),
        // it would create a cycle
        const visited = new Set();
        const queue = [prerequisiteId];
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (currentId === courseId) {
                return true; // Cycle detected
            }
            if (visited.has(currentId)) {
                continue;
            }
            visited.add(currentId);
            // Get all prerequisites of the current course
            const prereqs = await prisma_1.prisma.programPrerequisite.findMany({
                where: { programId: currentId },
                select: { prerequisiteId: true },
            });
            for (const prereq of prereqs) {
                if (!visited.has(prereq.prerequisiteId)) {
                    queue.push(prereq.prerequisiteId);
                }
            }
        }
        return false;
    }
    mapToDto(prerequisite) {
        return {
            id: prerequisite.id,
            courseId: prerequisite.programId,
            course: {
                id: prerequisite.program.id,
                title: prerequisite.program.title,
            },
            prerequisiteId: prerequisite.prerequisiteId,
            prerequisite: {
                id: prerequisite.prerequisite.id,
                title: prerequisite.prerequisite.title,
                difficulty: prerequisite.prerequisite.difficulty || undefined,
            },
            isRequired: prerequisite.isRequired,
            createdAt: prerequisite.createdAt,
            updatedAt: prerequisite.updatedAt,
        };
    }
}
exports.PrerequisitesService = PrerequisitesService;
