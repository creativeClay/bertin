import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Task Manager'}" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

export const sendInviteEmail = async (
  email: string,
  inviteToken: string,
  organizationName: string,
  inviterName: string
): Promise<void> => {
  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/invite/${inviteToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited!</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Task Manager.</p>
          <p>Click the button below to accept the invitation and create your account:</p>
          <p style="text-align: center;">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3b82f6;">${inviteUrl}</p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Task Manager. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `You're invited to join ${organizationName}`,
    html
  });
};

export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('Email service configured successfully');
    return true;
  } catch (error) {
    console.warn('Email service not configured:', (error as Error).message);
    return false;
  }
};

// Task notification email types
export type TaskNotificationType = 'task_created' | 'task_assigned' | 'task_updated' | 'task_deleted' | 'task_due_soon';

interface TaskEmailOptions {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  taskStatus?: string;
  taskDueDate?: string;
  assignerName?: string;
  organizationName?: string;
  taskUrl?: string;
}

const getEmailTemplate = (type: TaskNotificationType, options: TaskEmailOptions): { subject: string; html: string } => {
  const appName = process.env.APP_NAME || 'Task Manager';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  const taskUrl = options.taskUrl || `${frontendUrl}/dashboard`;

  // Icon SVGs (inline for email compatibility)
  const icons = {
    task_created: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`,
    task_assigned: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`,
    task_updated: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    task_deleted: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    task_due_soon: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
  };

  const colors = {
    task_created: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
    task_assigned: { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6' },
    task_updated: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    task_deleted: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    task_due_soon: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' }
  };

  const titles = {
    task_created: 'New Task Created',
    task_assigned: 'Task Assigned to You',
    task_updated: 'Task Updated',
    task_deleted: 'Task Deleted',
    task_due_soon: 'Task Due Soon'
  };

  const messages = {
    task_created: `A new task has been created${options.assignerName ? ` by <strong>${options.assignerName}</strong>` : ''} and assigned to you.`,
    task_assigned: `${options.assignerName ? `<strong>${options.assignerName}</strong> has` : 'You have been'} assigned you to a task.`,
    task_updated: `A task assigned to you has been updated${options.assignerName ? ` by <strong>${options.assignerName}</strong>` : ''}.`,
    task_deleted: `A task that was assigned to you has been deleted${options.assignerName ? ` by <strong>${options.assignerName}</strong>` : ''}.`,
    task_due_soon: `Your task is due soon. Don't forget to complete it!`
  };

  const subjects = {
    task_created: `New Task: ${options.taskTitle}`,
    task_assigned: `Task Assigned: ${options.taskTitle}`,
    task_updated: `Task Updated: ${options.taskTitle}`,
    task_deleted: `Task Deleted: ${options.taskTitle}`,
    task_due_soon: `Due Soon: ${options.taskTitle}`
  };

  const color = colors[type];
  const showButton = type !== 'task_deleted';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${titles[type]}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f3f4f6;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <h1 style="margin: 0; font-size: 24px; color: #111827;">${appName}</h1>
                </td>
              </tr>

              <!-- Icon & Title -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center;">
                  <div style="display: inline-block; padding: 16px; background-color: ${color.bg}; border-radius: 50%; margin-bottom: 20px;">
                    ${icons[type]}
                  </div>
                  <h2 style="margin: 0; font-size: 22px; color: ${color.text};">${titles[type]}</h2>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 0 40px 20px;">
                  <p style="margin: 0; font-size: 16px; color: #374151;">Hi <strong>${options.recipientName}</strong>,</p>
                </td>
              </tr>

              <!-- Message -->
              <tr>
                <td style="padding: 0 40px 30px;">
                  <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6;">${messages[type]}</p>
                </td>
              </tr>

              <!-- Task Card -->
              <tr>
                <td style="padding: 0 40px 30px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <h3 style="margin: 0 0 10px; font-size: 18px; color: #111827;">
                          <span style="margin-right: 8px;">📋</span>${options.taskTitle}
                        </h3>
                        ${options.taskDescription ? `
                        <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; line-height: 1.5;">
                          ${options.taskDescription.substring(0, 150)}${options.taskDescription.length > 150 ? '...' : ''}
                        </p>
                        ` : ''}
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          ${options.taskStatus ? `
                          <tr>
                            <td style="padding: 4px 0;">
                              <span style="font-size: 13px; color: #6b7280;">
                                <span style="margin-right: 6px;">📊</span>Status:
                                <strong style="color: #111827;">${options.taskStatus}</strong>
                              </span>
                            </td>
                          </tr>
                          ` : ''}
                          ${options.taskDueDate ? `
                          <tr>
                            <td style="padding: 4px 0;">
                              <span style="font-size: 13px; color: #6b7280;">
                                <span style="margin-right: 6px;">📅</span>Due:
                                <strong style="color: #111827;">${options.taskDueDate}</strong>
                              </span>
                            </td>
                          </tr>
                          ` : ''}
                          ${options.organizationName ? `
                          <tr>
                            <td style="padding: 4px 0;">
                              <span style="font-size: 13px; color: #6b7280;">
                                <span style="margin-right: 6px;">🏢</span>Organization:
                                <strong style="color: #111827;">${options.organizationName}</strong>
                              </span>
                            </td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              ${showButton ? `
              <!-- CTA Button -->
              <tr>
                <td style="padding: 0 40px 40px; text-align: center;">
                  <a href="${taskUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${color.border}; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                    View Task
                  </a>
                </td>
              </tr>
              ` : ''}

              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
                  <p style="margin: 0 0 10px; font-size: 13px; color: #6b7280; text-align: center;">
                    You're receiving this email because you're a member of ${options.organizationName || appName}.
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                    &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return { subject: subjects[type], html };
};

export const sendTaskNotificationEmail = async (
  type: TaskNotificationType,
  options: TaskEmailOptions
): Promise<void> => {
  try {
    const { subject, html } = getEmailTemplate(type, options);
    await sendEmail({
      to: options.recipientEmail,
      subject,
      html
    });
    console.log(`Task notification email sent: ${type} to ${options.recipientEmail}`);
  } catch (error) {
    console.error('Failed to send task notification email:', error);
    // Don't throw - email failure shouldn't break the main operation
  }
};
