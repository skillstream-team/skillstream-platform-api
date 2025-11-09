import { CreatePollDto } from '../dtos/poll.dto';
import { prisma } from '../../../utils/prisma';

export { prisma };

class PollService {
    async createPoll(data: CreatePollDto, creatorId: number) {
        return prisma.poll.create({
            data: {
                title: data.title,
                description: data.description,
                courseId: data.courseId,
                moduleId: data.moduleId,
                liveStreamId: data.liveStreamId,
                createdBy: creatorId,
                options: {
                    create: data.options.map((text, index) => ({ text, order: index + 1 }))
                }
            },
            include: { options: true }
        });
    }

    async respondToPoll(pollId: number, optionId: number, userId: number) {
        return prisma.pollResponse.create({
            data: { pollId, optionId, userId }
        });
    }

    async getPollResults(pollId: number) {
        return prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                options: {
                    include: { votes: true }
                }
            }
        });
    }

    // Optional: live stream poll emission
    async emitPollToLiveSession(io: any, pollId: number) {
        const poll = await this.getPollResults(pollId);
        // @ts-ignore
        io.to(`live-${poll.liveStreamId}`).emit('poll', poll);
    }
}