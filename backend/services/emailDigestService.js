/**
 * Email Digest Service
 * Issue #964: Advanced Multi-Channel Notification System
 * 
 * Generates and sends scheduled email digests using MJML templating.
 */

// Placeholder for email service (would normally import nodemailer/sendgrid)
const emailTransport = {
    sendMail: async (options) => {
        console.log('[EmailService] Mock send:', options.to, options.subject);
        return { messageId: 'mock-id' };
    }
};

class EmailDigestService {

    /**
     * Send daily/weekly digest
     */
    async sendDigest(user, notifications, frequency) {
        if (!notifications || notifications.length === 0) return;

        try {
            const html = this.generateDigestTemplate(user, notifications, frequency);

            await emailTransport.sendMail({
                to: user.email,
                subject: `Your ${frequency} update on College Media`,
                html: html
            });

            console.log(`[DigestService] Sent ${frequency} digest to ${user.email} with ${notifications.length} items`);
            return true;
        } catch (error) {
            console.error('[DigestService] Send error:', error);
            return false;
        }
    }

    /**
     * Generate MJML digest template
     * (In production, use mjml package to compile this)
     */
    generateDigestTemplate(user, notifications, frequency) {
        // Group notifications by type/category
        const grouped = this.groupNotifications(notifications);

        // Simulate compilation for simplicity
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; line-height: 1.5; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .notification-group { margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
          .group-title { font-weight: bold; color: #555; text-transform: uppercase; font-size: 12px; margin-bottom: 10px; }
          .item { display: flex; align-items: start; margin-bottom: 15px; }
          .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; background: #eee; object-fit: cover; }
          .content { flex: 1; }
          .title { font-weight: bold; font-size: 14px; }
          .body { color: #666; font-size: 14px; }
          .time { color: #999; font-size: 12px; margin-top: 4px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .btn { display: inline-block; background: #3b82f6; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Your ${frequency} Recap</h2>
            <p>Here's what you missed while you were away</p>
          </div>
          
          ${this.renderGroup(grouped.social, 'Social Activity')}
          ${this.renderGroup(grouped.content, 'Content Updates')}
          ${this.renderGroup(grouped.system, 'Other Notifications')}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL}/notifications" class="btn">View All Notifications</a>
          </div>
          
          <div class="footer">
            <p>You received this email because you have notifications enabled.</p>
            <p><a href="${process.env.CLIENT_URL}/settings/notifications">Manage Preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    groupNotifications(notifications) {
        const groups = {
            social: [],
            content: [],
            system: []
        };

        notifications.forEach(n => {
            if (['like', 'comment', 'follow', 'mention', 'reply'].includes(n.type)) {
                groups.social.push(n);
            } else if (['post', 'content', 'video'].includes(n.type)) {
                groups.content.push(n);
            } else {
                groups.system.push(n);
            }
        });

        return groups;
    }

    renderGroup(items, title) {
        if (!items || items.length === 0) return '';

        // Limit to top 5 per section
        const displayItems = items.slice(0, 5);

        return `
      <div class="notification-group">
        <div class="group-title">${title}</div>
        ${displayItems.map(item => `
          <div class="item">
            <img src="${item.sender?.avatar || 'https://via.placeholder.com/40'}" class="avatar" alt="" />
            <div class="content">
              <div class="title">${item.title}</div>
              <div class="body">${item.body}</div>
              <div class="time">${new Date(item.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        `).join('')}
        ${items.length > 5 ? `<div style="font-size: 12px; color: #666; margin-left: 55px;">And ${items.length - 5} more...</div>` : ''}
      </div>
    `;
    }
}

module.exports = new EmailDigestService();
