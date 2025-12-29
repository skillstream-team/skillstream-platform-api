"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const TEAM_EMAIL = 'The Team <team@skillstream.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    // Send email from "The Team @ SkillStream"
    async sendFromTeam(to, subject, html) {
        try {
            await this.transporter.sendMail({
                from: TEAM_EMAIL,
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
    // Send a general email
    async sendEmail(to, subject, html, fromTeam = false, attachmentContent, attachmentFilename) {
        try {
            const mailOptions = {
                from: fromTeam ? TEAM_EMAIL : (process.env.SMTP_FROM || 'no-reply@skillstream.com'),
                to,
                subject,
                html,
            };
            // Add attachment if provided
            if (attachmentContent && attachmentFilename) {
                mailOptions.attachments = [
                    {
                        filename: attachmentFilename,
                        content: attachmentContent,
                    },
                ];
            }
            await this.transporter.sendMail(mailOptions);
        }
        catch (err) {
            console.error('Error sending email:', err);
            throw new Error('Email could not be sent');
        }
    }
    // Welcome email for new users
    async sendWelcomeEmail(to, username, firstName) {
        const name = firstName || username;
        const subject = 'Welcome to SkillStream! 🎉';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to SkillStream!</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${name},</p>
                        <p>Welcome to SkillStream! We're excited to have you join our community of learners and educators.</p>
                        <p>Here's what you can do:</p>
                        <ul>
                            <li>Browse and enroll in courses</li>
                            <li>Connect with expert instructors</li>
                            <li>Track your learning progress</li>
                            <li>Earn certificates upon completion</li>
                        </ul>
                        <p style="text-align: center;">
                            <a href="${FRONTEND_URL}/dashboard" class="button">Get Started</a>
                        </p>
                        <p>If you have any questions, feel free to reach out to us. We're here to help!</p>
                        <p>Best regards,<br><strong>The SkillStream Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>This email was sent from SkillStream. If you didn't create an account, please ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await this.sendFromTeam(to, subject, html);
    }
    // Course enrollment confirmation
    async sendEnrollmentConfirmation(to, username, courseTitle, courseId) {
        const subject = `Welcome to ${courseTitle}! 🎓`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>You're Enrolled! 🎉</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${username},</p>
                        <p>Congratulations! You've successfully enrolled in <strong>${courseTitle}</strong>.</p>
                        <p>You can now start learning at your own pace. Access your course materials, watch videos, complete assignments, and track your progress.</p>
                        <p style="text-align: center;">
                            <a href="${FRONTEND_URL}/courses/${courseId}" class="button">Start Learning</a>
                        </p>
                        <p>Happy learning!</p>
                        <p>Best regards,<br><strong>The SkillStream Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await this.sendFromTeam(to, subject, html);
    }
    // Assignment deadline reminder
    async sendDeadlineReminder(to, username, assignmentTitle, courseTitle, dueDate) {
        const subject = `Reminder: ${assignmentTitle} due soon`;
        const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Deadline Reminder ⏰</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${username},</p>
                        <p>This is a reminder that <strong>${assignmentTitle}</strong> in <strong>${courseTitle}</strong> is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.</p>
                        <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString()}</p>
                        <p style="text-align: center;">
                            <a href="${FRONTEND_URL}/assignments" class="button">View Assignment</a>
                        </p>
                        <p>Don't forget to submit on time!</p>
                        <p>Best regards,<br><strong>The SkillStream Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await this.sendFromTeam(to, subject, html);
    }
    // Course completion certificate
    async sendCertificateEmail(to, username, courseTitle, certificateUrl) {
        const subject = `Congratulations! You've completed ${courseTitle} 🎓`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Course Completed! 🎉</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${username},</p>
                        <p>Congratulations! You've successfully completed <strong>${courseTitle}</strong>!</p>
                        <p>Your certificate of completion is ready. You can download it and share your achievement.</p>
                        <p style="text-align: center;">
                            <a href="${certificateUrl}" class="button">Download Certificate</a>
                        </p>
                        <p>Keep up the great work and continue your learning journey!</p>
                        <p>Best regards,<br><strong>The SkillStream Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await this.sendFromTeam(to, subject, html);
    }
    // New course announcement
    async sendCourseAnnouncement(to, username, courseTitle, courseId, instructorName) {
        const subject = `New Course Available: ${courseTitle}`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #fa709a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>New Course Available! 🚀</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${username},</p>
                        <p>We're excited to announce a new course: <strong>${courseTitle}</strong> by ${instructorName}!</p>
                        <p>This course is now available for enrollment. Don't miss out on this learning opportunity!</p>
                        <p style="text-align: center;">
                            <a href="${FRONTEND_URL}/courses/${courseId}" class="button">View Course</a>
                        </p>
                        <p>Happy learning!</p>
                        <p>Best regards,<br><strong>The SkillStream Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await this.sendFromTeam(to, subject, html);
    }
    // Promotional email
    async sendPromotionalEmail(to, subject, content, ctaText, ctaLink) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SkillStream</h1>
                    </div>
                    <div class="content">
                        ${content}
                        ${ctaText && ctaLink ? `<p style="text-align: center;"><a href="${ctaLink}" class="button">${ctaText}</a></p>` : ''}
                        <p>Best regards,<br><strong>The SkillStream Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>You're receiving this email because you're a member of SkillStream.</p>
                        <p><a href="${FRONTEND_URL}/settings/notifications">Manage email preferences</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await this.sendFromTeam(to, subject, html);
    }
    // System notification email
    async sendSystemNotificationEmail(to, title, message, link) {
        const subject = title;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="content">
                        <h2>${title}</h2>
                        <p>${message}</p>
                        ${link ? `<p style="text-align: center;"><a href="${link}" class="button">View Details</a></p>` : ''}
                        <p>Best regards,<br><strong>The SkillStream Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await this.sendFromTeam(to, subject, html);
    }
    // Forgot password email
    async sendPasswordResetEmail(to, username, resetLink) {
        const subject = 'SkillStream Password Reset';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="content">
                        <p>Hello ${username},</p>
                        <p>You requested a password reset. Click the button below to set a new password:</p>
                        <p style="text-align: center;">
                            <a href="${resetLink}" class="button">Reset Password</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p>${resetLink}</p>
                        <p>This link will expire in 15 minutes.</p>
                        <p>If you did not request this, please ignore this email.</p>
                        <p>Best regards,<br><strong>The SkillStream Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await this.sendFromTeam(to, subject, html);
    }
    // Event reminder email
    async sendEventReminder(to, eventTitle, eventTime, link) {
        const subject = `Reminder: ${eventTitle} is coming up`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="content">
                        <h2>Event Reminder</h2>
                        <p>Hi there,</p>
                        <p>This is a reminder for the upcoming event: <strong>${eventTitle}</strong></p>
                        <p>Time: ${eventTime.toLocaleString()}</p>
                        ${link ? `<p style="text-align: center;"><a href="${link}" class="button">Join Event</a></p>` : ''}
                        <p>Don't miss it!</p>
                        <p>Best regards,<br><strong>The SkillStream Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;
        await this.sendFromTeam(to, subject, html);
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
        await this.sendEmail(to, subject, html, true);
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
