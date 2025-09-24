import nodemailer from 'nodemailer';
import { storage } from '../storage-sqlite';

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
