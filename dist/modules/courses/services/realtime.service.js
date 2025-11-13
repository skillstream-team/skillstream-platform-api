"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
const socket_io_1 = require("socket.io");
class RealtimeService {
    constructor(server) {
        this.connectedUsers = new Map(); // streamId -> Set of socketIds
        this.userStreams = new Map(); // socketId -> streamId
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User connected: ${socket.id}`);
            // Join stream room
            socket.on('join_stream', (data) => {
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
            socket.on('leave_stream', (data) => {
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
            socket.on('ask_question', (data) => {
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
            socket.on('answer_question', (data) => {
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
            socket.on('create_poll', (data) => {
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
            socket.on('respond_to_poll', (data) => {
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
            socket.on('stream_status_update', (data) => {
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
    addUserToStream(streamId, socketId) {
        if (!this.connectedUsers.has(streamId)) {
            this.connectedUsers.set(streamId, new Set());
        }
        this.connectedUsers.get(streamId).add(socketId);
    }
    removeUserFromStream(streamId, socketId) {
        const users = this.connectedUsers.get(streamId);
        if (users) {
            users.delete(socketId);
            if (users.size === 0) {
                this.connectedUsers.delete(streamId);
            }
        }
    }
    getStreamViewerCount(streamId) {
        return this.connectedUsers.get(streamId)?.size || 0;
    }
    // Public methods for broadcasting events
    broadcastQuestion(streamId, question) {
        this.io.to(`stream:${streamId}`).emit('new_question', question);
    }
    broadcastPoll(streamId, poll) {
        this.io.to(`stream:${streamId}`).emit('new_poll', poll);
    }
    broadcastStreamStatus(streamId, status) {
        this.io.to(`stream:${streamId}`).emit('stream_status_changed', status);
    }
    getStreamStats(streamId) {
        return {
            viewerCount: this.getStreamViewerCount(streamId),
            isActive: this.connectedUsers.has(streamId)
        };
    }
    getServer() {
        return this.io;
    }
}
exports.RealtimeService = RealtimeService;
