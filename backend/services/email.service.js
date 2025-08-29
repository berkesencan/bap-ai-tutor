class EmailService {
  static async sendEmail(options) {
    console.log('📧 Email service stub - would send email:', options.subject);
    return { success: true, message: 'Email service not configured' };
  }
}

module.exports = EmailService; 