"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstructorQAService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class InstructorQAService {
    /**
     * Ask a question
     */
    async askQuestion(data) {
        // Verify student is enrolled
        const enrollment = await prisma_1.prisma.enrollment.findFirst({
            where: {
                programId: data.programId,
                studentId: data.studentId,
            },
        });
        if (!enrollment) {
            throw new Error('You must be enrolled in the program to ask questions');
        }
        const qa = await prisma_1.prisma.instructorQA.create({
            data: {
                programId: data.programId,
                studentId: data.studentId,
                question: data.question,
            },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                student: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                answers: {
                    include: {
                        instructor: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        return this.mapToDto(qa);
    }
    /**
     * Answer a question
     */
    async answerQuestion(data) {
        const qa = await prisma_1.prisma.instructorQA.findUnique({
            where: { id: data.qaId },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                        instructorId: true,
                    },
                },
            },
        });
        if (!qa) {
            throw new Error('Question not found');
        }
        // Verify instructor is the collection instructor
        if (qa.program.instructorId !== data.instructorId) {
            throw new Error('Only the collection instructor can answer questions');
        }
        const answer = await prisma_1.prisma.instructorQAAnswer.create({
            data: {
                qaId: data.qaId,
                instructorId: data.instructorId,
                answer: data.answer,
            },
        });
        // Update QA as answered
        await prisma_1.prisma.instructorQA.update({
            where: { id: data.qaId },
            data: {
                isAnswered: true,
            },
        });
        // Invalidate cache
        await (0, cache_1.deleteCache)(`collection:${qa.programId}`);
        return this.getQuestionById(data.qaId);
    }
    /**
     * Get question by ID
     */
    async getQuestionById(qaId) {
        const qa = await prisma_1.prisma.instructorQA.findUnique({
            where: { id: qaId },
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                student: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                answers: {
                    include: {
                        instructor: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!qa) {
            throw new Error('Question not found');
        }
        return this.mapToDto(qa);
    }
    /**
     * Get questions for a collection
     */
    async getProgramQuestions(programId, page = 1, limit = 20, answeredOnly) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const where = { programId };
        if (answeredOnly !== undefined) {
            where.isAnswered = answeredOnly;
        }
        const [questions, total] = await Promise.all([
            prisma_1.prisma.instructorQA.findMany({
                where,
                skip,
                take,
                include: {
                    program: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    student: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    answers: {
                        include: {
                            instructor: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.instructorQA.count({ where }),
        ]);
        return {
            data: questions.map(this.mapToDto),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }
    /**
     * Get student's questions
     */
    async getStudentQuestions(studentId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [questions, total] = await Promise.all([
            prisma_1.prisma.instructorQA.findMany({
                where: { studentId },
                skip,
                take,
                include: {
                    program: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    student: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    answers: {
                        include: {
                            instructor: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.instructorQA.count({ where: { studentId } }),
        ]);
        return {
            data: questions.map(this.mapToDto),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }
    mapToDto(qa) {
        return {
            id: qa.id,
            programId: qa.programId,
            program: {
                id: qa.program.id,
                title: qa.program.title,
            },
            studentId: qa.studentId,
            student: {
                id: qa.student.id,
                username: qa.student.username,
                email: qa.student.email,
            },
            question: qa.question,
            isAnswered: qa.isAnswered,
            answers: qa.answers.map((a) => ({
                id: a.id,
                instructorId: a.instructorId,
                instructor: {
                    id: a.instructor.id,
                    username: a.instructor.username,
                    email: a.instructor.email,
                },
                answer: a.answer,
                createdAt: a.createdAt,
            })),
            createdAt: qa.createdAt,
            updatedAt: qa.updatedAt,
        };
    }
}
exports.InstructorQAService = InstructorQAService;
