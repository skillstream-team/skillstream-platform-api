import { CreatePaymentDto, PaymentResponseDto, UpdatePaymentStatusDto } from '../dtos/payment.dto';
import { prisma } from '../../../utils/prisma';

export class PaymentService {
    private mapPaymentToDto(payment: any): PaymentResponseDto {
        return {
            ...payment,
      courseId: payment.programId,
      course: payment.program,
        } as PaymentResponseDto;
    }

    /**
     * @swagger
     * /payments:
     *   post:
     *     summary: Create a new payment record
     *     tags: [Payments]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreatePaymentDto'
     *     responses:
     *       201:
     *         description: Payment created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PaymentResponseDto'
     */
    async createPayment(data: CreatePaymentDto): Promise<PaymentResponseDto> {
        const payment = await prisma.payment.create({
            data: {
                studentId: data.studentId,
                programId: data.courseId,
                amount: data.amount,
                currency: data.currency || 'USD',
                status: data.status,
                provider: data.provider,
                transactionId: data.transactionId,
            },
            include: {
                student: { select: { id: true, username: true, email: true } },
                program: { select: { id: true, title: true, price: true } },
            },
        });

        return this.mapPaymentToDto(payment);
    }

    /**
     * @swagger
     * /payments/{paymentId}/status:
     *   patch:
     *     summary: Update payment status or transaction details
     *     tags: [Payments]
     *     parameters:
     *       - name: paymentId
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *         description: Payment ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdatePaymentStatusDto'
     *     responses:
     *       200:
     *         description: Payment status updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PaymentResponseDto'
     */
    async updatePaymentStatus(paymentId: string, data: UpdatePaymentStatusDto): Promise<PaymentResponseDto> {
        const payment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: data.status,
                transactionId: data.transactionId,
            },
            include: {
                student: { select: { id: true, username: true, email: true } },
                program: { select: { id: true, title: true, price: true } },
            },
        });

        return this.mapPaymentToDto(payment);
    }

    /**
     * @swagger
     * /payments/{paymentId}:
     *   get:
     *     summary: Get payment details by ID
     *     tags: [Payments]
     *     parameters:
     *       - name: paymentId
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *         description: Payment ID
     *     responses:
     *       200:
     *         description: Payment details retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PaymentResponseDto'
     *       404:
     *         description: Payment not found
     */
    async getPaymentById(paymentId: string): Promise<PaymentResponseDto | null> {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                student: { select: { id: true, username: true, email: true } },
                program: { select: { id: true, title: true, price: true } },
            },
        });

        return payment ? this.mapPaymentToDto(payment) : null;
    }

    /**
     * @swagger
     * /payments/student/{studentId}:
     *   get:
     *     summary: Get all payments made by a student
     *     tags: [Payments]
     *     parameters:
     *       - name: studentId
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *         description: Student ID
     *     responses:
     *       200:
     *         description: List of student payments retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/PaymentResponseDto'
     */
    async getPaymentsByStudent(studentId: string): Promise<PaymentResponseDto[]> {
        const payments = await prisma.payment.findMany({
            where: { studentId },
            include: {
                student: { select: { id: true, username: true, email: true } },
                program: { select: { id: true, title: true, price: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return payments.map(p => this.mapPaymentToDto(p));
    }

    /**
     * @swagger
     * /payments/course/{courseId}:
     *   get:
     *     summary: Get all payments made for a specific course
     *     tags: [Payments]
     *     parameters:
     *       - name: courseId
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *         description: Course ID
     *     responses:
     *       200:
     *         description: List of course payments retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/PaymentResponseDto'
     */
    async getPaymentsByCourse(courseId: string): Promise<PaymentResponseDto[]> {
        const payments = await prisma.payment.findMany({
      where: { programId: courseId },
            include: {
                student: { select: { id: true, username: true, email: true } },
                program: { select: { id: true, title: true, price: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return payments.map(p => this.mapPaymentToDto(p));
    }

    /**
     * @swagger
     * /payments/course/{courseId}/completed:
     *   get:
     *     summary: Get all completed payments for a specific course
     *     tags: [Payments]
     *     parameters:
     *       - name: courseId
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *         description: Course ID
     *     responses:
     *       200:
     *         description: List of completed course payments retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/PaymentResponseDto'
     */
    async getCompletedPaymentsByCollection(courseId: string): Promise<PaymentResponseDto[]> {
        const payments = await prisma.payment.findMany({
      where: { programId: courseId, status: 'COMPLETED' },
            include: {
                student: { select: { id: true, username: true, email: true } },
                program: { select: { id: true, title: true, price: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

    return payments.map(p => this.mapPaymentToDto(p));
    }
}