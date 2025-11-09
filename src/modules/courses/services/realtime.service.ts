import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export interface RealtimeMessage {
  type: 'question' | 'answer' | 'poll' | 'poll_response' | 'stream_status';
  data: any;
  timestamp: number;
}

export interface StreamQuestionMessage {
  type: 'question';
  data: {
    id: number;
    streamId: string;
    studentId: number;
    student: {
      id: number;
      username: string;
    };
    question: string;
    timestamp: number;
  };
}

export interface StreamPollMessage {
  type: 'poll';
  data: {
    id: number;
    streamId: string;
    instructorId: number;
    instructor: {
      id: number;
      username: string;
    };
    question: string;
    options: string[];
    expiresAt?: Date;
  };
}

export interface StreamStatusMessage {
  type: 'stream_status';
  data: {
    streamId: string;
    status: 'ready' | 'live' | 'ended';
    isActive: boolean;
    viewerCount?: number;
  };
}

export class RealtimeService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // streamId -> Set of socketIds
  private userStreams: Map<string, string> = new Map(); // socketId -> streamId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join stream room
      socket.on('join_stream', (data: { streamId: string; userId: number }) => {
        const { streamId, userId } = data;
        
        // Leave previous stream if any
        const previousStream = this.userStreams.get(socket.id);
        if (previousStream) {
          socket.leave(`stream:${previousStream}`);
          this.removeUserFromStream(previousStream, socket.id);
        }

        // Join new stream
        socket.join(`stream:${streamId}`);
        this.userStreams.set(socket.id, streamId);
        this.addUserToStream(streamId, socket.id);

        // Notify others about new viewer
        socket.to(`stream:${streamId}`).emit('user_joined', {
          userId,
          viewerCount: this.getStreamViewerCount(streamId)
        });

        console.log(`User ${userId} joined stream ${streamId}`);
      });

      // Leave stream
      socket.on('leave_stream', (data: { streamId: string; userId: number }) => {
        const { streamId, userId } = data;
        
        socket.leave(`stream:${streamId}`);
        this.removeUserFromStream(streamId, socket.id);
        this.userStreams.delete(socket.id);

        // Notify others about viewer leaving
        socket.to(`stream:${streamId}`).emit('user_left', {
          userId,
          viewerCount: this.getStreamViewerCount(streamId)
        });

        console.log(`User ${userId} left stream ${streamId}`);
      });

      // Handle stream questions
      socket.on('ask_question', (data: {
        streamId: string;
        studentId: number;
        question: string;
        timestamp: number;
      }) => {
        const { streamId, studentId, question, timestamp } = data;
        
        // Broadcast question to all stream viewers
        this.io.to(`stream:${streamId}`).emit('new_question', {
          type: 'question',
          data: {
            streamId,
            studentId,
            question,
            timestamp,
            createdAt: new Date()
          }
        });

        console.log(`Question asked in stream ${streamId}: ${question}`);
      });

      // Handle question answers
      socket.on('answer_question', (data: {
        streamId: string;
        questionId: number;
        answeredBy: number;
        answer: string;
      }) => {
        const { streamId, questionId, answeredBy, answer } = data;
        
        // Broadcast answer to all stream viewers
        this.io.to(`stream:${streamId}`).emit('question_answered', {
          type: 'answer',
          data: {
            questionId,
            answeredBy,
            answer,
            answeredAt: new Date()
          }
        });

        console.log(`Question ${questionId} answered in stream ${streamId}`);
      });

      // Handle poll creation
      socket.on('create_poll', (data: {
        streamId: string;
        instructorId: number;
        question: string;
        options: string[];
        expiresAt?: Date;
      }) => {
        const { streamId, instructorId, question, options, expiresAt } = data;
        
        // Broadcast poll to all stream viewers
        this.io.to(`stream:${streamId}`).emit('new_poll', {
          type: 'poll',
          data: {
            streamId,
            instructorId,
            question,
            options,
            expiresAt,
            createdAt: new Date()
          }
        });

        console.log(`Poll created in stream ${streamId}: ${question}`);
      });

      // Handle poll responses
      socket.on('respond_to_poll', (data: {
        streamId: string;
        pollId: number;
        studentId: number;
        option: string;
      }) => {
        const { streamId, pollId, studentId, option } = data;
        
        // Broadcast poll response to all stream viewers
        this.io.to(`stream:${streamId}`).emit('poll_response', {
          type: 'poll_response',
          data: {
            pollId,
            studentId,
            option,
            respondedAt: new Date()
          }
        });

        console.log(`Poll response in stream ${streamId}: ${option}`);
      });

      // Handle stream status updates
      socket.on('stream_status_update', (data: {
        streamId: string;
        status: 'ready' | 'live' | 'ended';
        isActive: boolean;
      }) => {
        const { streamId, status, isActive } = data;
        
        // Broadcast status update to all stream viewers
        this.io.to(`stream:${streamId}`).emit('stream_status_changed', {
          type: 'stream_status',
          data: {
            streamId,
            status,
            isActive,
            viewerCount: this.getStreamViewerCount(streamId),
            updatedAt: new Date()
          }
        });

        console.log(`Stream ${streamId} status changed to ${status}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const streamId = this.userStreams.get(socket.id);
        if (streamId) {
          this.removeUserFromStream(streamId, socket.id);
          this.userStreams.delete(socket.id);
          
          // Notify others about viewer leaving
          socket.to(`stream:${streamId}`).emit('user_left', {
            viewerCount: this.getStreamViewerCount(streamId)
          });
        }

        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  private addUserToStream(streamId: string, socketId: string) {
    if (!this.connectedUsers.has(streamId)) {
      this.connectedUsers.set(streamId, new Set());
    }
    this.connectedUsers.get(streamId)!.add(socketId);
  }

  private removeUserFromStream(streamId: string, socketId: string) {
    const users = this.connectedUsers.get(streamId);
    if (users) {
      users.delete(socketId);
      if (users.size === 0) {
        this.connectedUsers.delete(streamId);
      }
    }
  }

  private getStreamViewerCount(streamId: string): number {
    return this.connectedUsers.get(streamId)?.size || 0;
  }

  // Public methods for broadcasting events
  public broadcastQuestion(streamId: string, question: StreamQuestionMessage) {
    this.io.to(`stream:${streamId}`).emit('new_question', question);
  }

  public broadcastPoll(streamId: string, poll: StreamPollMessage) {
    this.io.to(`stream:${streamId}`).emit('new_poll', poll);
  }

  public broadcastStreamStatus(streamId: string, status: StreamStatusMessage) {
    this.io.to(`stream:${streamId}`).emit('stream_status_changed', status);
  }

  public getStreamStats(streamId: string) {
    return {
      viewerCount: this.getStreamViewerCount(streamId),
      isActive: this.connectedUsers.has(streamId)
    };
  }

  public getServer() {
    return this.io;
  }
}
