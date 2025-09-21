import { dataCollectionService } from "./dataCollectionService";
import { emailService } from "./emailService";
import { storage } from "../storage";
class SchedulerService {
    constructor() {
        this.intervals = [];
        this.isRunning = false;
    }
    start() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        this.scheduleDaily(() => {
            dataCollectionService.syncAllSources().catch(error => {
                this.notifyAdminsOfError("Daily Data Collection Failed", error.message);
            });
        }, { hour: 6, minute: 0 });
        this.scheduleHourly(() => {
            this.checkUrgentApprovals().catch(error => {
            });
        });
        this.scheduleWeekly(() => {
            this.generateWeeklyNewsletter().catch(error => {
            });
        }, { day: 1, hour: 9, minute: 0 });
    }
    stop() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.isRunning = false;
    }
    scheduleDaily(callback, time) {
        const runCallback = () => {
            const now = new Date();
            const targetTime = new Date();
            targetTime.setUTCHours(time.hour, time.minute, 0, 0);
            if (now > targetTime) {
                targetTime.setUTCDate(targetTime.getUTCDate() + 1);
            }
            const msUntilTarget = targetTime.getTime() - now.getTime();
            setTimeout(() => {
                callback();
                const interval = setInterval(callback, 24 * 60 * 60 * 1000);
                this.intervals.push(interval);
            }, msUntilTarget);
        };
        runCallback();
    }
    scheduleHourly(callback) {
        callback();
        const interval = setInterval(callback, 60 * 60 * 1000);
        this.intervals.push(interval);
    }
    scheduleWeekly(callback, time) {
        const runCallback = () => {
            const now = new Date();
            const targetTime = new Date();
            const currentDay = now.getUTCDay();
            const daysUntilTarget = (time.day - currentDay + 7) % 7;
            targetTime.setUTCDate(now.getUTCDate() + daysUntilTarget);
            targetTime.setUTCHours(time.hour, time.minute, 0, 0);
            if (now > targetTime && daysUntilTarget === 0) {
                targetTime.setUTCDate(targetTime.getUTCDate() + 7);
            }
            const msUntilTarget = targetTime.getTime() - now.getTime();
            setTimeout(() => {
                callback();
                const interval = setInterval(callback, 7 * 24 * 60 * 60 * 1000);
                this.intervals.push(interval);
            }, msUntilTarget);
        };
        runCallback();
    }
    async checkUrgentApprovals() {
        try {
            const urgentApprovals = await storage.getApprovals({ status: 'pending' });
            const now = new Date();
            const urgentThreshold = 24 * 60 * 60 * 1000;
            const overdueApprovals = urgentApprovals.filter(approval => {
                const createdAt = approval.createdAt ? new Date(approval.createdAt) : new Date();
                return (now.getTime() - createdAt.getTime()) > urgentThreshold;
            });
            if (overdueApprovals.length > 0) {
                await this.notifyAdminsOfUrgentApprovals(overdueApprovals);
            }
        }
        catch (error) {
        }
    }
    async generateWeeklyNewsletter() {
        try {
            const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentUpdates = await storage.getRegulatoryUpdates({
                limit: 50,
                offset: 0
            });
            const weeklyUpdates = recentUpdates.filter(update => update.createdAt ? new Date(update.createdAt) > lastWeek : false);
            if (weeklyUpdates.length === 0) {
                return;
            }
            const newsletterContent = this.generateNewsletterContent(weeklyUpdates);
            const newsletter = await storage.createNewsletter({
                title: `Weekly MedTech Regulatory Updates - ${new Date().toLocaleDateString()}`,
                content: newsletterContent.text,
                htmlContent: newsletterContent.html,
                status: 'pending',
                scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
            });
            await this.notifyAdminsOfNewsletter(newsletter);
        }
        catch (error) {
        }
    }
    generateNewsletterContent(updates) {
        const highPriorityUpdates = updates.filter(u => u.priority === 'urgent' || u.priority === 'high');
        const mediumPriorityUpdates = updates.filter(u => u.priority === 'medium');
        const lowPriorityUpdates = updates.filter(u => u.priority === 'low');
        const textContent = `
AEGIS Weekly Regulatory Intelligence Report
Generated: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
This week we tracked ${updates.length} regulatory updates across FDA, EMA, and other key sources.

${highPriorityUpdates.length > 0 ? `
HIGH PRIORITY UPDATES (${highPriorityUpdates.length})
${highPriorityUpdates.map(update => `
• ${update.title}
  ${update.description}
  Source: ${update.region} | Published: ${new Date(update.publishedAt).toLocaleDateString()}
`).join('')}
` : ''}

${mediumPriorityUpdates.length > 0 ? `
MEDIUM PRIORITY UPDATES (${mediumPriorityUpdates.length})
${mediumPriorityUpdates.slice(0, 5).map(update => `
• ${update.title}
  ${update.description}
  Source: ${update.region} | Published: ${new Date(update.publishedAt).toLocaleDateString()}
`).join('')}
${mediumPriorityUpdates.length > 5 ? `\n... and ${mediumPriorityUpdates.length - 5} more medium priority updates` : ''}
` : ''}

${lowPriorityUpdates.length > 0 ? `
OTHER UPDATES (${lowPriorityUpdates.length})
${lowPriorityUpdates.slice(0, 3).map(update => `• ${update.title}`).join('\n')}
${lowPriorityUpdates.length > 3 ? `\n... and ${lowPriorityUpdates.length - 3} more updates` : ''}
` : ''}

---
For detailed information and analysis, visit your Helix dashboard.
    `.trim();
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          📊 Weekly Regulatory Intelligence Report
        </h2>
        <p style="color: #6b7280; font-size: 14px;">Generated: ${new Date().toLocaleDateString()}</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Executive Summary</h3>
          <p>This week we tracked <strong>${updates.length} regulatory updates</strong> across FDA, EMA, and other key sources.</p>
        </div>

        ${highPriorityUpdates.length > 0 ? `
        <div style="margin: 30px 0;">
          <h3 style="color: #dc2626; display: flex; align-items: center;">
            🚨 High Priority Updates (${highPriorityUpdates.length})
          </h3>
          ${highPriorityUpdates.map(update => `
            <div style="border: 1px solid #fecaca; background: #fef2f2; padding: 15px; margin: 10px 0; border-radius: 6px;">
              <h4 style="margin-top: 0; color: #991b1b;">${update.title}</h4>
              <p style="color: #7f1d1d; margin: 8px 0;">${update.description}</p>
              <div style="font-size: 12px; color: #991b1b;">
                <span style="background: #dc2626; color: white; padding: 2px 6px; border-radius: 12px; margin-right: 8px;">${update.region}</span>
                Published: ${new Date(update.publishedAt).toLocaleDateString()}
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${mediumPriorityUpdates.length > 0 ? `
        <div style="margin: 30px 0;">
          <h3 style="color: #d97706;">📋 Medium Priority Updates (${mediumPriorityUpdates.length})</h3>
          ${mediumPriorityUpdates.slice(0, 5).map(update => `
            <div style="border: 1px solid #fed7aa; background: #fefbf7; padding: 12px; margin: 8px 0; border-radius: 4px;">
              <h5 style="margin: 0 0 8px 0; color: #92400e;">${update.title}</h5>
              <p style="margin: 0; color: #a16207; font-size: 14px;">${update.description}</p>
              <div style="font-size: 11px; color: #92400e; margin-top: 8px;">
                ${update.region} • ${new Date(update.publishedAt).toLocaleDateString()}
              </div>
            </div>
          `).join('')}
          ${mediumPriorityUpdates.length > 5 ? `<p style="color: #6b7280; font-style: italic;">... and ${mediumPriorityUpdates.length - 5} more medium priority updates</p>` : ''}
        </div>
        ` : ''}

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; color: #374151;">For detailed information and analysis, visit your Helix dashboard.</p>
          <a href="${process.env.PLATFORM_URL || '#'}" style="display: inline-block; margin-top: 15px; background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
            View Dashboard
          </a>
        </div>
      </div>
    `;
        return { text: textContent, html: htmlContent };
    }
    async notifyAdminsOfError(title, message) {
        try {
            const adminUsers = await storage.getUsersByRole('admin');
            if (adminUsers.length === 0)
                return;
            await emailService.sendNotification(adminUsers.map(user => user.email).filter(Boolean), title, message, 'urgent');
        }
        catch (error) {
        }
    }
    async notifyAdminsOfUrgentApprovals(approvals) {
        try {
            const adminUsers = await storage.getUsersByRole('admin');
            if (adminUsers.length === 0)
                return;
            const message = `${approvals.length} approval(s) have been pending for more than 24 hours and require immediate attention.`;
            await emailService.sendNotification(adminUsers.map(user => user.email).filter(Boolean), 'Urgent Approvals Pending', message, 'urgent');
        }
        catch (error) {
        }
    }
    async notifyAdminsOfNewsletter(newsletter) {
        try {
            const adminUsers = await storage.getUsersByRole('admin');
            if (adminUsers.length === 0)
                return;
            const message = `Weekly newsletter "${newsletter.title}" has been generated and is ready for review and approval.`;
            await emailService.sendNotification(adminUsers.map(user => user.email).filter(Boolean), 'Weekly Newsletter Ready for Review', message, 'medium');
        }
        catch (error) {
        }
    }
}
export const schedulerService = new SchedulerService();
//# sourceMappingURL=schedulerService.js.map