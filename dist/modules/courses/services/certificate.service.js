"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificateService = exports.CertificateService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_1 = require("../../../utils/prisma");
const email_service_1 = require("../../users/services/email.service");
class CertificateService {
    /**
     * Check if a student has completed a course
     * Course is considered complete when:
     * - All modules are completed
     * - All required quizzes are passed
     * - All required assignments are submitted and graded
     */
    async checkCourseCompletion(studentId, courseId) {
        // Get all course content
        const [modules, quizzes, assignments, progress] = await Promise.all([
            prisma_1.prisma.courseModule.findMany({
                where: { courseId },
                select: { id: true, title: true },
            }),
            prisma_1.prisma.quiz.findMany({
                where: { courseId, isPublished: true },
                select: { id: true, title: true, passingScore: true },
            }),
            prisma_1.prisma.assignment.findMany({
                where: { courseId, isPublished: true },
                select: { id: true, title: true },
            }),
            prisma_1.prisma.progress.findMany({
                where: { studentId, courseId },
                select: { type: true, itemId: true, status: true },
            }),
        ]);
        const totalItems = modules.length + quizzes.length + assignments.length;
        const missingItems = [];
        let completedItems = 0;
        // Check modules
        for (const module of modules) {
            const moduleProgress = progress.find((p) => p.type === 'module' && p.itemId === module.id);
            if (moduleProgress?.status === 'completed') {
                completedItems++;
            }
            else {
                missingItems.push(`Module: ${module.title}`);
            }
        }
        // Get all quiz attempts for this student in this course (batch query)
        const quizIds = quizzes.map(q => q.id);
        const quizAttempts = await prisma_1.prisma.quizAttempt.findMany({
            where: {
                studentId,
                quizId: { in: quizIds },
            },
            select: {
                quizId: true,
                isPassed: true,
                percentage: true,
                submittedAt: true,
            },
            orderBy: { submittedAt: 'desc' },
        });
        // Group attempts by quizId (get latest attempt per quiz)
        const latestAttempts = new Map();
        for (const attempt of quizAttempts) {
            if (!latestAttempts.has(attempt.quizId) ||
                (latestAttempts.get(attempt.quizId).submittedAt || new Date(0)) < (attempt.submittedAt || new Date(0))) {
                latestAttempts.set(attempt.quizId, attempt);
            }
        }
        // Check quizzes
        for (const quiz of quizzes) {
            const quizProgress = progress.find((p) => p.type === 'quiz' && p.itemId === quiz.id);
            const attempt = latestAttempts.get(quiz.id);
            // Quiz is complete if:
            // 1. Has a passing attempt (isPassed = true), OR
            // 2. Progress status is 'passed', OR
            // 3. Progress status is 'completed' and (no passing score required OR percentage meets passing score)
            if (attempt && attempt.isPassed) {
                completedItems++;
            }
            else if (quizProgress?.status === 'passed') {
                completedItems++;
            }
            else if (quizProgress?.status === 'completed' && (!quiz.passingScore || (attempt && attempt.percentage && attempt.percentage >= quiz.passingScore))) {
                completedItems++;
            }
            else {
                missingItems.push(`Quiz: ${quiz.title}`);
            }
        }
        // Get all submissions for this student in this course (batch query)
        const assignmentIds = assignments.map(a => a.id);
        const submissions = await prisma_1.prisma.submission.findMany({
            where: {
                studentId,
                assignmentId: { in: assignmentIds },
            },
            select: {
                assignmentId: true,
                gradedAt: true,
                submittedAt: true,
            },
            orderBy: { submittedAt: 'desc' },
        });
        // Group submissions by assignmentId (get latest submission per assignment)
        const latestSubmissions = new Map();
        for (const submission of submissions) {
            if (!latestSubmissions.has(submission.assignmentId) ||
                (latestSubmissions.get(submission.assignmentId).submittedAt || new Date(0)) < (submission.submittedAt || new Date(0))) {
                latestSubmissions.set(submission.assignmentId, submission);
            }
        }
        // Check assignments
        for (const assignment of assignments) {
            const assignmentProgress = progress.find((p) => p.type === 'assignment' && p.itemId === assignment.id);
            const submission = latestSubmissions.get(assignment.id);
            // Assignment is complete if progress is completed OR submission exists and is graded
            if (assignmentProgress?.status === 'completed' || (submission && submission.gradedAt)) {
                completedItems++;
            }
            else {
                missingItems.push(`Assignment: ${assignment.title}`);
            }
        }
        const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        const isComplete = completionPercentage === 100 && missingItems.length === 0;
        return {
            isComplete,
            completionPercentage,
            completedItems,
            totalItems,
            missingItems,
        };
    }
    /**
     * Automatically issue certificate if course is completed
     */
    async autoIssueCertificate(studentId, courseId) {
        try {
            // Check if certificate already exists
            const existingCertificate = await prisma_1.prisma.certificate.findFirst({
                where: {
                    studentId,
                    courseId,
                },
            });
            if (existingCertificate) {
                return {
                    issued: false,
                    message: 'Certificate already issued',
                    certificate: existingCertificate,
                };
            }
            // Check course completion
            const completion = await this.checkCourseCompletion(studentId, courseId);
            if (!completion.isComplete) {
                return {
                    issued: false,
                    message: `Course not completed. ${completion.completedItems}/${completion.totalItems} items completed. Missing: ${completion.missingItems.slice(0, 3).join(', ')}`,
                };
            }
            // Get student and course details
            const [student, course] = await Promise.all([
                prisma_1.prisma.user.findUnique({
                    where: { id: studentId },
                    select: { id: true, username: true, email: true, firstName: true, lastName: true },
                }),
                prisma_1.prisma.course.findUnique({
                    where: { id: courseId },
                    select: { id: true, title: true, description: true },
                }),
            ]);
            if (!student || !course) {
                throw new Error('Student or course not found');
            }
            // Create certificate
            const certificate = await prisma_1.prisma.certificate.create({
                data: {
                    studentId,
                    courseId,
                    title: `Certificate of Completion - ${course.title}`,
                    description: `This certifies that ${student.username} has successfully completed ${course.title}`,
                    issuedAt: new Date(),
                    isActive: true,
                },
                include: {
                    student: {
                        select: { id: true, username: true, email: true },
                    },
                    course: {
                        select: { id: true, title: true, description: true },
                    },
                },
            });
            // Send email notification
            try {
                await email_service_1.emailService.sendSystemNotificationEmail(student.email, 'Course Completed - Certificate Issued! 🎉', `Congratulations ${student.firstName || student.username}! You have successfully completed the course "${course.title}" and your certificate has been issued.`, `${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses/${courseId}/certificates/${studentId}`);
            }
            catch (emailError) {
                console.error('Failed to send certificate email:', emailError);
                // Don't fail certificate issuance if email fails
            }
            return {
                issued: true,
                certificate,
                message: 'Certificate issued successfully',
            };
        }
        catch (error) {
            console.error('Error auto-issuing certificate:', error);
            throw new Error(`Failed to issue certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Manually issue certificate (for admin/teacher use)
     */
    async issueCertificate(studentId, courseId, title, description) {
        // Check if certificate already exists
        const existing = await prisma_1.prisma.certificate.findFirst({
            where: {
                studentId,
                courseId,
                isActive: true,
            },
        });
        if (existing) {
            throw new Error('Certificate already exists for this student and course');
        }
        const [student, course] = await Promise.all([
            prisma_1.prisma.user.findUnique({
                where: { id: studentId },
                select: { id: true, username: true, email: true },
            }),
            prisma_1.prisma.course.findUnique({
                where: { id: courseId },
                select: { id: true, title: true, description: true },
            }),
        ]);
        if (!student || !course) {
            throw new Error('Student or course not found');
        }
        const certificate = await prisma_1.prisma.certificate.create({
            data: {
                studentId,
                courseId,
                title: title || `Certificate of Completion - ${course.title}`,
                description: description || `This certifies that ${student.username} has successfully completed ${course.title}`,
                issuedAt: new Date(),
                isActive: true,
            },
            include: {
                student: {
                    select: { id: true, username: true, email: true },
                },
                course: {
                    select: { id: true, title: true, description: true },
                },
            },
        });
        // Send email notification
        try {
            await email_service_1.emailService.sendSystemNotificationEmail(student.email, 'Certificate Issued! 🎉', `Congratulations! Your certificate for "${course.title}" has been issued.`, `${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses/${courseId}/certificates/${studentId}`);
        }
        catch (emailError) {
            console.error('Failed to send certificate email:', emailError);
        }
        return certificate;
    }
    /**
     * Generate PDF certificate
     */
    async generatePDF(certificate) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    size: 'LETTER',
                    layout: 'landscape',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });
                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(buffers);
                    resolve(pdfBuffer);
                });
                doc.on('error', reject);
                // Background/border (decorative)
                doc.rect(0, 0, doc.page.width, doc.page.height)
                    .strokeColor('#E8E8E8')
                    .lineWidth(3)
                    .stroke();
                // Inner border
                doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
                    .strokeColor('#667eea')
                    .lineWidth(2)
                    .stroke();
                // Header section
                doc.fontSize(36)
                    .fillColor('#667eea')
                    .font('Helvetica-Bold')
                    .text('Certificate of Completion', doc.page.width / 2, 100, {
                    align: 'center',
                    width: doc.page.width - 100
                });
                // Decorative line
                doc.moveTo(100, 150)
                    .lineTo(doc.page.width - 100, 150)
                    .strokeColor('#667eea')
                    .lineWidth(2)
                    .stroke();
                // Main text
                doc.fontSize(24)
                    .fillColor('#333333')
                    .font('Helvetica')
                    .text('This is to certify that', doc.page.width / 2, 200, {
                    align: 'center',
                    width: doc.page.width - 100
                });
                // Student name
                doc.fontSize(32)
                    .fillColor('#667eea')
                    .font('Helvetica-Bold')
                    .text(certificate.student.username, doc.page.width / 2, 260, {
                    align: 'center',
                    width: doc.page.width - 100
                });
                // Course completion text
                doc.fontSize(20)
                    .fillColor('#666666')
                    .font('Helvetica')
                    .text('has successfully completed the course', doc.page.width / 2, 330, {
                    align: 'center',
                    width: doc.page.width - 100
                });
                // Course title
                doc.fontSize(28)
                    .fillColor('#333333')
                    .font('Helvetica-Bold')
                    .text(certificate.course.title, doc.page.width / 2, 380, {
                    align: 'center',
                    width: doc.page.width - 100
                });
                // Date section
                const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                doc.fontSize(16)
                    .fillColor('#666666')
                    .font('Helvetica')
                    .text(`Issued on ${issueDate}`, doc.page.width / 2, 480, {
                    align: 'center',
                    width: doc.page.width - 100
                });
                // Certificate number
                if (certificate.certificateNumber) {
                    doc.fontSize(12)
                        .fillColor('#999999')
                        .font('Helvetica')
                        .text(`Certificate ID: ${certificate.certificateNumber}`, doc.page.width / 2, 520, {
                        align: 'center',
                        width: doc.page.width - 100
                    });
                }
                else {
                    // Use certificate ID as certificate number
                    doc.fontSize(12)
                        .fillColor('#999999')
                        .font('Helvetica')
                        .text(`Certificate ID: ${certificate.id.substring(0, 8).toUpperCase()}`, doc.page.width / 2, 520, {
                        align: 'center',
                        width: doc.page.width - 100
                    });
                }
                // Footer
                doc.fontSize(14)
                    .fillColor('#999999')
                    .font('Helvetica-Oblique')
                    .text('SkillStream Platform', doc.page.width / 2, doc.page.height - 80, {
                    align: 'center',
                    width: doc.page.width - 100
                });
                doc.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Stream PDF certificate (for direct HTTP response)
     */
    generatePDFStream(certificate) {
        const doc = new pdfkit_1.default({
            size: 'LETTER',
            layout: 'landscape',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        // Background/border
        doc.rect(0, 0, doc.page.width, doc.page.height)
            .strokeColor('#E8E8E8')
            .lineWidth(3)
            .stroke();
        // Inner border
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
            .strokeColor('#667eea')
            .lineWidth(2)
            .stroke();
        // Header
        doc.fontSize(36)
            .fillColor('#667eea')
            .font('Helvetica-Bold')
            .text('Certificate of Completion', doc.page.width / 2, 100, {
            align: 'center',
            width: doc.page.width - 100
        });
        // Decorative line
        doc.moveTo(100, 150)
            .lineTo(doc.page.width - 100, 150)
            .strokeColor('#667eea')
            .lineWidth(2)
            .stroke();
        // Main text
        doc.fontSize(24)
            .fillColor('#333333')
            .font('Helvetica')
            .text('This is to certify that', doc.page.width / 2, 200, {
            align: 'center',
            width: doc.page.width - 100
        });
        // Student name
        doc.fontSize(32)
            .fillColor('#667eea')
            .font('Helvetica-Bold')
            .text(certificate.student.username, doc.page.width / 2, 260, {
            align: 'center',
            width: doc.page.width - 100
        });
        // Course completion text
        doc.fontSize(20)
            .fillColor('#666666')
            .font('Helvetica')
            .text('has successfully completed the course', doc.page.width / 2, 330, {
            align: 'center',
            width: doc.page.width - 100
        });
        // Course title
        doc.fontSize(28)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(certificate.course.title, doc.page.width / 2, 380, {
            align: 'center',
            width: doc.page.width - 100
        });
        // Date
        const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.fontSize(16)
            .fillColor('#666666')
            .font('Helvetica')
            .text(`Issued on ${issueDate}`, doc.page.width / 2, 480, {
            align: 'center',
            width: doc.page.width - 100
        });
        // Certificate number
        if (certificate.certificateNumber) {
            doc.fontSize(12)
                .fillColor('#999999')
                .font('Helvetica')
                .text(`Certificate ID: ${certificate.certificateNumber}`, doc.page.width / 2, 520, {
                align: 'center',
                width: doc.page.width - 100
            });
        }
        else {
            // Use certificate ID as certificate number
            doc.fontSize(12)
                .fillColor('#999999')
                .font('Helvetica')
                .text(`Certificate ID: ${certificate.id.substring(0, 8).toUpperCase()}`, doc.page.width / 2, 520, {
                align: 'center',
                width: doc.page.width - 100
            });
        }
        // Footer
        doc.fontSize(14)
            .fillColor('#999999')
            .font('Helvetica-Oblique')
            .text('SkillStream Platform', doc.page.width / 2, doc.page.height - 80, {
            align: 'center',
            width: doc.page.width - 100
        });
        return doc;
    }
}
exports.CertificateService = CertificateService;
exports.certificateService = new CertificateService();
