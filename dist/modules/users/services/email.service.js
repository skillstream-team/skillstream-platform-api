"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    // Send a general email
    async sendEmail(to, subject, html) {
        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_FROM || 'no-reply@skillstream.com',
                to,
                subject,
                html,
            });
        }
        catch (err) {
            console.error('Error sending email:', err);
            throw new Error('Email could not be sent');
        }
    }
    // Forgot password email
    async sendPasswordResetEmail(to, username, resetLink) {
        const subject = 'SkillStream Password Reset';
        const html = `
      <p>Hello ${username},</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `;
        await this.sendEmail(to, subject, html);
    }
    // Event reminder email
    async sendEventReminder(to, eventTitle, eventTime, link) {
        const subject = `Reminder: ${eventTitle} is coming up`;
        const html = `
      <p>Hi there,</p>
      <p>This is a reminder for the upcoming event: <strong>${eventTitle}</strong></p>
      <p>Time: ${eventTime.toUTCString()}</p>
      ${link ? `<p>Join here: <a href="${link}">${link}</a></p>` : ''}
      <p>Don't miss it!</p>
    `;
        await this.sendEmail(to, subject, html);
    }
    // Live session poll notification
    async sendPollNotification(to, pollQuestion, options, link) {
        const subject = 'New Poll in Live Session';
        const html = `
      <p>A new poll has been created in your live session:</p>
      <p><strong>${pollQuestion}</strong></p>
      <p>Options: ${options.join(', ')}</p>
      <p>Vote now: <a href="${link}">${link}</a></p>
    `;
        await this.sendEmail(to, subject, html);
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
