import { CreatePollDto } from '../dtos/poll.dto';
import { prisma } from '../../../utils/prisma';

export { prisma };

export class PollService {
    async createPoll(data: CreatePollDto, creatorId: string) {
        // Use title as question if question is not provided separately
        // The Poll model requires both title and question fields
        return prisma.poll.create({
            data: {
                title: data.title,
                question: data.title, // Using title as question, or you could add question to DTO
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

    async respondToPoll(pollId: string, optionId: string, userId: string) {
        // Find the poll option to get its text
        const pollOption = await prisma.pollOption.findUnique({
            where: { id: optionId },
            include: { poll: true }
        });

        if (!pollOption || pollOption.pollId !== pollId) {
            throw new Error('Invalid poll option');
        }

        // Increment votes on the PollOption
        await prisma.pollOption.update({
            where: { id: optionId },
            data: { votes: { increment: 1 } }
        });

        // Create PollResponse record
        // Note: PollResponse uses 'option' (string) not 'optionId'
        // The schema has both StreamPoll and Poll relations sharing the same pollId
        // We'll let Prisma handle the relation based on which poll exists
        return prisma.pollResponse.create({
            data: { 
                pollId, 
                studentId: userId,
                option: pollOption.text
            }
        });
    }

    async getPollResults(pollId: string) {
        return prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                options: true // votes is an Int field on PollOption, not a relation
            }
        });
    }

    // Optional: live stream poll emission
    async emitPollToLiveSession(io: any, pollId: string) {
        const poll = await this.getPollResults(pollId);
        // @ts-ignore
        io.to(`live-${poll.liveStreamId}`).emit('poll', poll);
    }
}