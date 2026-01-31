import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateQuestionDto {
  collectionId: string;
  studentId: string;
  question: string;
}

export interface CreateAnswerDto {
  qaId: string;
  instructorId: string;
  answer: string;
}

export interface QAResponseDto {
  id: string;
  collectionId: string;
  collection: {
    id: string;
    title: string;
  };
  studentId: string;
  student: {
    id: string;
    username: string;
    email: string;
  };
  question: string;
  isAnswered: boolean;
  answers: Array<{
    id: string;
    instructorId: string;
    instructor: {
      id: string;
      username: string;
      email: string;
    };
    answer: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class InstructorQAService {
  /**
   * Ask a question
   */
  async askQuestion(data: CreateQuestionDto): Promise<QAResponseDto> {
    // Verify student is enrolled
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        programId: data.collectionId,
        studentId: data.studentId,
      },
    });

    if (!enrollment) {
      throw new Error('You must be enrolled in the collection to ask questions');
    }

    const qa = await prisma.instructorQA.create({
      data: {
        programId: data.collectionId,
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
  async answerQuestion(data: CreateAnswerDto): Promise<QAResponseDto> {
    const qa = await prisma.instructorQA.findUnique({
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

    const answer = await prisma.instructorQAAnswer.create({
      data: {
        qaId: data.qaId,
        instructorId: data.instructorId,
        answer: data.answer,
      },
    });

    // Update QA as answered
    await prisma.instructorQA.update({
      where: { id: data.qaId },
      data: {
        isAnswered: true,
      },
    });

    // Invalidate cache
    await deleteCache(`collection:${qa.programId}`);

    return this.getQuestionById(data.qaId);
  }

  /**
   * Get question by ID
   */
  async getQuestionById(qaId: string): Promise<QAResponseDto> {
    const qa = await prisma.instructorQA.findUnique({
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
  async getCourseQuestions(
    collectionId: string,
    page: number = 1,
    limit: number = 20,
    answeredOnly?: boolean
  ): Promise<{
    data: QAResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where: any = { programId: collectionId };
    if (answeredOnly !== undefined) {
      where.isAnswered = answeredOnly;
    }

    const [questions, total] = await Promise.all([
      prisma.instructorQA.findMany({
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
      prisma.instructorQA.count({ where }),
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
  async getStudentQuestions(
    studentId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: QAResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const [questions, total] = await Promise.all([
      prisma.instructorQA.findMany({
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
      prisma.instructorQA.count({ where: { studentId } }),
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

  private mapToDto(qa: any): QAResponseDto {
    return {
      id: qa.id,
      collectionId: qa.programId, // Backward compatibility
      collection: {
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
      answers: qa.answers.map((a: any) => ({
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
