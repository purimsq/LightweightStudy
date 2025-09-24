import nodemailer from 'nodemailer';
import { storage } from '../storage-sqlite';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';

export interface EmailConfig {
  user: string;
  pass: string;
}

export interface OTPData {
  email: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private emailConfig: EmailConfig;

  constructor() {
    this.emailConfig = {
      user: 'lightweightprime@gmail.com',
      pass: 'wvib otkh tzhq uccq'
    };

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.emailConfig.user,
        pass: this.emailConfig.pass
      }
    });
  }

  /**
   * Generate a 6-digit OTP
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP email
   */
  async sendOTPEmail(email: string, otp: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: {
          name: 'StudyCompanion',
          address: this.emailConfig.user
        },
        to: email,
        subject: 'Verify Your StudyCompanion Account',
        html: this.getOTPEmailTemplate(otp),
        replyTo: 'noreply@studycompanion.com' // Disable replies
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return false;
    }
  }

  /**
   * Send welcome email after successful account creation
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: {
          name: 'StudyCompanion',
          address: this.emailConfig.user
        },
        to: email,
        subject: 'Welcome to StudyCompanion! Your Account is Ready',
        html: this.getWelcomeEmailTemplate(name),
        replyTo: 'noreply@studycompanion.com' // Disable replies
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Store OTP in database
   */
  async storeOTP(email: string, otp: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

    // Store in database (we'll use a simple table for this)
    await storage.storeOTP({
      email,
      otp,
      expiresAt,
      attempts: 0
    });
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, inputOTP: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpData = await storage.getOTP(email);
      
      if (!otpData) {
        return { success: false, message: 'No OTP found for this email' };
      }

      // Check if OTP has expired
      if (new Date() > otpData.expiresAt) {
        await storage.deleteOTP(email);
        return { success: false, message: 'OTP has expired. Please request a new one.' };
      }

      // Check if too many attempts
      if (otpData.attempts >= 3) {
        await storage.deleteOTP(email);
        return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
      }

      // Verify OTP
      if (otpData.otp === inputOTP) {
        await storage.deleteOTP(email);
        return { success: true, message: 'OTP verified successfully' };
      } else {
        // Increment attempts
        await storage.incrementOTPAttempts(email);
        return { success: false, message: 'Invalid OTP. Please try again.' };
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, message: 'OTP verification failed. Please try again.' };
    }
  }

  /**
   * Check if email exists in database
   */
  async isEmailTaken(email: string): Promise<boolean> {
    try {
      const user = await storage.getUserByEmail(email);
      return !!user;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }

  /**
   * Send data export email to user
   */
  async sendDataExportEmail(email: string, userData: any, name: string): Promise<boolean> {
    try {
      console.log(`📧 Sending data export email to: ${email}`);
      
      // Generate DOCX attachment
      const docxBuffer = await this.generateDataExportDocx(userData, name);
      
      const mailOptions = {
        from: {
          name: 'StudyCompanion',
          address: this.emailConfig.user
        },
        to: email,
        subject: 'Your StudyCompanion Data Export 📊',
        html: this.getDataExportEmailTemplate(userData, name),
        replyTo: 'noreply@studycompanion.com', // Disable replies
        attachments: [
          {
            filename: `StudyCompanion_DataExport_${new Date().toISOString().split('T')[0]}.docx`,
            content: docxBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Data export email sent successfully to: ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending data export email:', error);
      return false;
    }
  }

  /**
   * OTP Email Template
   */
  private getOTPEmailTemplate(otp: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #8B5CF6; margin-bottom: 10px; }
            .otp-code { background: #f8f9fa; border: 2px dashed #8B5CF6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-number { font-size: 32px; font-weight: bold; color: #8B5CF6; letter-spacing: 5px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">📚 StudyCompanion</div>
                <h2>Verify Your Email Address</h2>
            </div>
            
            <p>Thank you for signing up for StudyCompanion! To complete your account setup, please verify your email address using the code below:</p>
            
            <div class="otp-code">
                <div class="otp-number">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666;">This code will expire in 10 minutes</p>
            </div>
            
            <p>Enter this code in the verification page to activate your account.</p>
            
            <div class="warning">
                <strong>Security Notice:</strong> Never share this code with anyone. StudyCompanion will never ask for your verification code via phone or email.
            </div>
            
            <p>If you didn't create an account with StudyCompanion, please ignore this email.</p>
            
            <div class="footer">
                <p>Best regards,<br>The StudyCompanion Team</p>
                <p><em>This is an automated message. Please do not reply to this email.</em></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate DOCX document for data export
   */
  private async generateDataExportDocx(userData: any, name: string): Promise<Buffer> {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const children: any[] = [
      new Paragraph({
        text: "📚 StudyCompanion Data Export",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `Generated for ${name} on ${formatDate(userData.exportDate)}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),
      
      // Data Summary Section
      new Paragraph({
        text: "📊 Data Summary",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 150 },
      }),
      new Paragraph({
        text: `Study Units: ${userData.units?.length || 0}`,
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: `Documents: ${userData.documents?.length || 0}`,
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: `Progress Records: ${userData.progress?.length || 0}`,
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: `Friends: ${userData.friends?.length || 0}`,
        spacing: { after: 100 },
      }),

      // Profile Information
      new Paragraph({
        text: "👤 Profile Information",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 150 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Name")] }),
              new TableCell({ children: [new Paragraph(userData.profile.name)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Email")] }),
              new TableCell({ children: [new Paragraph(userData.profile.email)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Username")] }),
              new TableCell({ children: [new Paragraph(userData.profile.username || 'Not set')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Study Streak")] }),
              new TableCell({ children: [new Paragraph(`${userData.profile.studyStreak} days`)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Learning Pace")] }),
              new TableCell({ children: [new Paragraph(`${userData.profile.learningPace} minutes`)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Member Since")] }),
              new TableCell({ children: [new Paragraph(formatDate(userData.profile.createdAt))] }),
            ],
          }),
        ],
      }),
    ];

    // Add Documents Section
    if (userData.documents && userData.documents.length > 0) {
      children.push(
        new Paragraph({
          text: `📄 Documents (${userData.documents.length})`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        })
      );

      const documentRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Filename")] }),
            new TableCell({ children: [new Paragraph("Type")] }),
            new TableCell({ children: [new Paragraph("Size")] }),
            new TableCell({ children: [new Paragraph("Uploaded")] }),
            new TableCell({ children: [new Paragraph("Status")] }),
          ],
        }),
      ];

      userData.documents.forEach((doc: any) => {
        documentRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(doc.filename)] }),
              new TableCell({ children: [new Paragraph(doc.fileType)] }),
              new TableCell({ children: [new Paragraph(formatFileSize(doc.fileSize))] }),
              new TableCell({ children: [new Paragraph(formatDate(doc.uploadedAt))] }),
              new TableCell({ children: [new Paragraph(doc.isCompleted ? '✅ Completed' : '⏳ In Progress')] }),
            ],
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: documentRows,
        })
      );
    }

    // Add Units Section
    if (userData.units && userData.units.length > 0) {
      children.push(
        new Paragraph({
          text: `📚 Study Units (${userData.units.length})`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        })
      );

      const unitRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Name")] }),
            new TableCell({ children: [new Paragraph("Description")] }),
            new TableCell({ children: [new Paragraph("Progress")] }),
            new TableCell({ children: [new Paragraph("Created")] }),
          ],
        }),
      ];

      userData.units.forEach((unit: any) => {
        unitRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(unit.name)] }),
              new TableCell({ children: [new Paragraph(unit.description || 'No description')] }),
              new TableCell({ children: [new Paragraph(`${unit.completedTopics}/${unit.totalTopics} topics`)] }),
              new TableCell({ children: [new Paragraph(formatDate(unit.createdAt))] }),
            ],
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: unitRows,
        })
      );
    }

    // Add Friends Section
    if (userData.friends && userData.friends.length > 0) {
      children.push(
        new Paragraph({
          text: `👥 Friends (${userData.friends.length})`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        })
      );

      const friendRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Friend ID")] }),
            new TableCell({ children: [new Paragraph("Status")] }),
            new TableCell({ children: [new Paragraph("Added")] }),
          ],
        }),
      ];

      userData.friends.forEach((friend: any) => {
        friendRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(friend.friendId.toString())] }),
              new TableCell({ children: [new Paragraph(friend.status)] }),
              new TableCell({ children: [new Paragraph(formatDate(friend.createdAt))] }),
            ],
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: friendRows,
        })
      );
    }

    // Add Security Notice
    children.push(
      new Paragraph({
        text: "⚠️ Security Notice",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 150 },
      }),
      new Paragraph({
        text: "This document contains sensitive personal data. Please keep it secure and do not share it with unauthorized parties. Store this information in a safe location and consider deleting this email after saving the attachment.",
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: "Best regards,",
        spacing: { before: 200 },
      }),
      new Paragraph({
        text: "The StudyCompanion Team",
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: "This is an automated message. Please do not reply to this email.",
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: "© 2024 StudyCompanion. All rights reserved.",
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Data Export Email Template
   */
  private getDataExportEmailTemplate(userData: any, name: string): string {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Data Export</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 15px; background-color: #f8fafc; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
            .logo { font-size: 24px; font-weight: bold; color: #8B5CF6; margin-bottom: 8px; }
            .export-date { color: #6b7280; font-size: 13px; }
            .section { margin: 20px 0; }
            .section-title { font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
            .profile-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .profile-table th, .profile-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .profile-table th { background: #f8fafc; font-weight: 600; color: #374151; font-size: 13px; }
            .profile-table td { color: #6b7280; font-size: 13px; }
            .documents-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
            .documents-table th, .documents-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .documents-table th { background: #f1f5f9; font-weight: 600; color: #374151; }
            .documents-table td { color: #4b5563; }
            .document-name { font-weight: 600; color: #1e40af; }
            .units-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
            .units-table th, .units-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .units-table th { background: #f1f5f9; font-weight: 600; color: #374151; }
            .units-table td { color: #4b5563; }
            .unit-name { font-weight: 600; color: #8b5cf6; }
            .progress-cell { min-width: 80px; }
            .progress-bar { background: #e5e7eb; border-radius: 4px; height: 6px; overflow: hidden; }
            .progress-fill { background: linear-gradient(90deg, #10B981, #059669); height: 100%; border-radius: 4px; }
            .friends-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
            .friends-table th, .friends-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .friends-table th { background: #f0fdf4; font-weight: 600; color: #374151; }
            .friends-table td { color: #4b5563; }
            .status-badge { padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 500; }
            .status-accepted { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .warning-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 20px 0; }
            .download-box { background: #dbeafe; border: 1px solid #3b82f6; padding: 12px; border-radius: 6px; margin: 20px 0; text-align: center; }
            .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
            .no-data { color: #9ca3af; font-style: italic; text-align: center; padding: 20px; }
            @media (max-width: 600px) {
                .container { padding: 15px; }
                .profile-table, .documents-table, .units-table, .friends-table { font-size: 11px; }
                .profile-table th, .profile-table td, .documents-table th, .documents-table td, .units-table th, .units-table td, .friends-table th, .friends-table td { padding: 4px 6px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">📚 StudyCompanion</div>
                <h1 style="margin: 8px 0; color: #374151; font-size: 20px;">Your Data Export</h1>
                <div class="export-date">Generated on ${formatDate(userData.exportDate)}</div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <p style="font-size: 14px; color: #4b5563; margin: 0 0 8px 0;">Hi <strong>${name}</strong>,</p>
                <p style="color: #6b7280; font-size: 13px; margin: 0;">Here's a complete overview of your StudyCompanion account data. A detailed DOCX document is attached.</p>
            </div>
            
            <div class="section">
                <h2 class="section-title">📊 Data Summary</h2>
                <div style="background: #f8fafc; border-radius: 6px; padding: 12px; margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px;">
                        <span style="color: #374151;">Study Units:</span>
                        <span style="color: #6b7280; font-weight: 600;">${userData.units?.length || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px;">
                        <span style="color: #374151;">Documents:</span>
                        <span style="color: #6b7280; font-weight: 600;">${userData.documents?.length || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px;">
                        <span style="color: #374151;">Progress Records:</span>
                        <span style="color: #6b7280; font-weight: 600;">${userData.progress?.length || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px;">
                        <span style="color: #374151;">Friends:</span>
                        <span style="color: #6b7280; font-weight: 600;">${userData.friends?.length || 0}</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">👤 Profile Information</h2>
                <table class="profile-table">
                    <tr><th>Name</th><td>${userData.profile.name}</td></tr>
                    <tr><th>Email</th><td>${userData.profile.email}</td></tr>
                    <tr><th>Username</th><td>${userData.profile.username || 'Not set'}</td></tr>
                    <tr><th>Study Streak</th><td>${userData.profile.studyStreak} days</td></tr>
                    <tr><th>Learning Pace</th><td>${userData.profile.learningPace} minutes</td></tr>
                    <tr><th>Member Since</th><td>${formatDate(userData.profile.createdAt)}</td></tr>
                </table>
            </div>
            
            ${userData.documents && userData.documents.length > 0 ? `
            <div class="section">
                <h2 class="section-title">📄 Documents (${userData.documents.length})</h2>
                <table class="documents-table">
                    <thead>
                        <tr>
                            <th>Filename</th>
                            <th>Type</th>
                            <th>Size</th>
                            <th>Uploaded</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userData.documents.map((doc: any) => `
                        <tr>
                            <td class="document-name">${doc.filename}</td>
                            <td>${doc.fileType}</td>
                            <td>${formatFileSize(doc.fileSize)}</td>
                            <td>${formatDate(doc.uploadedAt)}</td>
                            <td>${doc.isCompleted ? '✅ Completed' : '⏳ In Progress'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            ${userData.units && userData.units.length > 0 ? `
            <div class="section">
                <h2 class="section-title">📚 Study Units (${userData.units.length})</h2>
                <table class="units-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Progress</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userData.units.map((unit: any) => `
                        <tr>
                            <td class="unit-name">${unit.name}</td>
                            <td>${unit.description || 'No description'}</td>
                            <td class="progress-cell">
                                <div style="font-size: 11px; margin-bottom: 2px;">${unit.completedTopics}/${unit.totalTopics} topics</div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${unit.totalTopics > 0 ? (unit.completedTopics / unit.totalTopics * 100) : 0}%"></div>
                                </div>
                            </td>
                            <td>${formatDate(unit.createdAt)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            ${userData.friends && userData.friends.length > 0 ? `
            <div class="section">
                <h2 class="section-title">👥 Friends (${userData.friends.length})</h2>
                <table class="friends-table">
                    <thead>
                        <tr>
                            <th>Friend ID</th>
                            <th>Status</th>
                            <th>Added</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userData.friends.map((friend: any) => `
                        <tr>
                            <td>${friend.friendId}</td>
                            <td><span class="status-badge ${friend.status === 'accepted' ? 'status-accepted' : 'status-pending'}">${friend.status}</span></td>
                            <td>${formatDate(friend.createdAt)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            <div class="download-box">
                <h3 style="margin: 8px 0; color: #1e40af; font-size: 16px;">📎 Download Complete Report</h3>
                <p style="margin: 0; color: #1e40af; font-size: 13px;">A detailed DOCX document is attached containing all your data in a professional format.</p>
            </div>
            
            <div class="warning-box">
                <h3 style="margin-top: 0; color: #92400e; font-size: 14px;">⚠️ Security Notice</h3>
                <p style="color: #92400e; margin-bottom: 0; font-size: 12px;">
                    This email contains sensitive personal data. Please keep it secure and do not share it with unauthorized parties. 
                    Store this information in a safe location and consider deleting this email after saving the attachment.
                </p>
            </div>
            
            <div class="footer">
                <p>Best regards,<br><strong>The StudyCompanion Team</strong></p>
                <p style="margin-top: 10px;"><em>This is an automated message. Please do not reply to this email.</em></p>
                <p style="margin-top: 8px; font-size: 11px;">© 2024 StudyCompanion. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Welcome Email Template
   */
  private getWelcomeEmailTemplate(name: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to StudyCompanion!</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #8B5CF6; margin-bottom: 10px; }
            .welcome-badge { background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .feature-list { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .feature-item { margin: 10px 0; padding-left: 20px; }
            .cta-button { background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">📚 StudyCompanion</div>
                <h2>Welcome to StudyCompanion!</h2>
            </div>
            
            <p>Hi ${name},</p>
            
            <p>🎉 Congratulations! Your StudyCompanion account has been successfully created and verified.</p>
            
            <div class="welcome-badge">
                <h3 style="margin: 0;">Your Learning Journey Starts Now!</h3>
            </div>
            
            <p>You now have access to all of StudyCompanion's powerful features:</p>
            
            <div class="feature-list">
                <div class="feature-item">📖 Upload and organize your study documents</div>
                <div class="feature-item">🤖 AI-powered study assistance and summaries</div>
                <div class="feature-item">📝 Smart note-taking with markdown support</div>
                <div class="feature-item">📊 Track your progress and study streaks</div>
                <div class="feature-item">🎵 Background music for focused studying</div>
                <div class="feature-item">📅 Personalized study plans and reminders</div>
                <div class="feature-item">🧠 Generate quizzes from your materials</div>
                <div class="feature-item">💬 Connect with study partners</div>
            </div>
            
            <p>Ready to start your journey? Click the button below to access your dashboard:</p>
            
            <div style="text-align: center;">
                <a href="http://localhost:3003/dashboard" class="cta-button">Go to Dashboard</a>
            </div>
            
            <p><strong>Pro Tip:</strong> Start by creating your first study unit and uploading some documents. The AI assistant will help you organize everything!</p>
            
            <div class="footer">
                <p>Happy Studying!<br>The StudyCompanion Team</p>
                <p><em>This is an automated message. Please do not reply to this email.</em></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

export const emailService = new EmailService();
