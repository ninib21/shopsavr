const PriceAlert = require('../models/PriceAlert');
const User = require('../models/User');
const Logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.emailQueue = [];
    this.pushQueue = [];
    this.isProcessing = false;
  }

  // Send price alert notification
  async sendPriceAlert(alert) {
    try {
      // Populate user data if not already populated
      if (!alert.userId.email) {
        await alert.populate('userId', 'email profile.name settings');
      }

      const user = alert.userId;
      
      if (!user) {
        Logger.error('User not found for alert', { alertId: alert._id });
        return;
      }

      // Check user notification preferences
      const shouldSendEmail = user.settings.emailAlerts && alert.notification.email.attempts === 0;
      const shouldSendPush = user.settings.notifications && alert.notification.push.attempts === 0;

      const promises = [];

      if (shouldSendEmail) {
        promises.push(this.sendEmailNotification(alert, user));
      }

      if (shouldSendPush) {
        promises.push(this.sendPushNotification(alert, user));
      }

      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }

      Logger.info('Price alert notifications sent', {
        alertId: alert._id,
        userId: user._id,
        email: shouldSendEmail,
        push: shouldSendPush
      });
    } catch (error) {
      Logger.error('Failed to send price alert', {
        alertId: alert._id,
        error: error.message
      });
    }
  }

  // Send email notification
  async sendEmailNotification(alert, user) {
    try {
      // In a real implementation, you would integrate with an email service
      // like SendGrid, AWS SES, or similar
      
      const emailData = {
        to: user.email,
        subject: this.generateEmailSubject(alert),
        html: this.generateEmailHTML(alert, user),
        text: this.generateEmailText(alert, user)
      };

      // Mock email sending - replace with actual email service
      const success = await this.mockSendEmail(emailData);

      if (success) {
        await alert.markEmailSent();
        Logger.info('Email notification sent', {
          alertId: alert._id,
          email: user.email,
          subject: emailData.subject
        });
      } else {
        await alert.incrementAttempts('email');
        Logger.warn('Email notification failed', {
          alertId: alert._id,
          email: user.email
        });
      }
    } catch (error) {
      await alert.incrementAttempts('email');
      Logger.error('Email notification error', {
        alertId: alert._id,
        error: error.message
      });
    }
  }

  // Send push notification
  async sendPushNotification(alert, user) {
    try {
      // In a real implementation, you would integrate with push notification services
      // like Firebase Cloud Messaging (FCM) for Android, Apple Push Notification Service (APNS) for iOS
      
      const pushData = {
        userId: user._id,
        title: this.generatePushTitle(alert),
        body: this.generatePushBody(alert),
        data: {
          alertId: alert._id.toString(),
          alertType: alert.alertType,
          itemId: alert.wishlistItemId.toString(),
          price: alert.trigger.currentPrice.toString()
        },
        badge: await this.getUnreadAlertsCount(user._id)
      };

      // Mock push notification sending - replace with actual push service
      const success = await this.mockSendPush(pushData);

      if (success) {
        await alert.markPushSent();
        Logger.info('Push notification sent', {
          alertId: alert._id,
          userId: user._id,
          title: pushData.title
        });
      } else {
        await alert.incrementAttempts('push');
        Logger.warn('Push notification failed', {
          alertId: alert._id,
          userId: user._id
        });
      }
    } catch (error) {
      await alert.incrementAttempts('push');
      Logger.error('Push notification error', {
        alertId: alert._id,
        error: error.message
      });
    }
  }

  // Generate email subject
  generateEmailSubject(alert) {
    const productName = alert.product.name;
    
    switch (alert.alertType) {
      case 'price_drop':
        const dropPercentage = alert.trigger.dropPercentage?.toFixed(0) || '0';
        return `🔥 ${productName} - ${dropPercentage}% Price Drop!`;
      
      case 'target_price':
        return `🎯 ${productName} - Target Price Reached!`;
      
      case 'back_in_stock':
        return `✅ ${productName} - Back in Stock!`;
      
      default:
        return `📢 Price Alert: ${productName}`;
    }
  }

  // Generate email HTML content
  generateEmailHTML(alert, user) {
    const productName = alert.product.name;
    const currentPrice = `$${alert.trigger.currentPrice.toFixed(2)}`;
    const sourceName = alert.source.name;
    const sourceUrl = alert.source.url;
    
    let savingsInfo = '';
    if (alert.alertType === 'price_drop' && alert.trigger.previousPrice) {
      const savings = alert.trigger.previousPrice - alert.trigger.currentPrice;
      const savingsPercent = ((savings / alert.trigger.previousPrice) * 100).toFixed(0);
      savingsInfo = `
        <p style="color: #28a745; font-size: 18px; font-weight: bold;">
          💰 You save $${savings.toFixed(2)} (${savingsPercent}% off)
        </p>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ShopSavr Price Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🛍️ ShopSavr</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Price Alert</p>
        </div>
        
        <div style="padding: 30px 0;">
          <h2 style="color: #333; margin-bottom: 20px;">${alert.alertMessage}</h2>
          
          ${alert.product.image ? `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${alert.product.image}" alt="${productName}" style="max-width: 200px; border-radius: 8px;">
            </div>
          ` : ''}
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Product Details</h3>
            <p><strong>Product:</strong> ${productName}</p>
            ${alert.product.brand ? `<p><strong>Brand:</strong> ${alert.product.brand}</p>` : ''}
            <p><strong>Current Price:</strong> <span style="font-size: 20px; color: #007bff; font-weight: bold;">${currentPrice}</span></p>
            <p><strong>Available at:</strong> ${sourceName}</p>
          </div>
          
          ${savingsInfo}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${sourceUrl}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              View Product
            </a>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://shopsavr.xyz/wishlist" style="color: #6c757d; text-decoration: none;">
              Manage Your Wishlist
            </a>
          </div>
        </div>
        
        <div style="border-top: 1px solid #dee2e6; padding-top: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>You're receiving this because you have price alerts enabled for your ShopSavr wishlist.</p>
          <p>
            <a href="https://shopsavr.xyz/settings" style="color: #6c757d;">Manage Notifications</a> | 
            <a href="https://shopsavr.xyz/unsubscribe" style="color: #6c757d;">Unsubscribe</a>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate email text content
  generateEmailText(alert, user) {
    const productName = alert.product.name;
    const currentPrice = `$${alert.trigger.currentPrice.toFixed(2)}`;
    const sourceName = alert.source.name;
    const sourceUrl = alert.source.url;
    
    let savingsInfo = '';
    if (alert.alertType === 'price_drop' && alert.trigger.previousPrice) {
      const savings = alert.trigger.previousPrice - alert.trigger.currentPrice;
      const savingsPercent = ((savings / alert.trigger.previousPrice) * 100).toFixed(0);
      savingsInfo = `\nYou save $${savings.toFixed(2)} (${savingsPercent}% off)!\n`;
    }

    return `
ShopSavr Price Alert

${alert.alertMessage}

Product: ${productName}
${alert.product.brand ? `Brand: ${alert.product.brand}\n` : ''}Current Price: ${currentPrice}
Available at: ${sourceName}
${savingsInfo}
View Product: ${sourceUrl}

Manage your wishlist: https://shopsavr.xyz/wishlist
Manage notifications: https://shopsavr.xyz/settings

You're receiving this because you have price alerts enabled for your ShopSavr wishlist.
    `.trim();
  }

  // Generate push notification title
  generatePushTitle(alert) {
    switch (alert.alertType) {
      case 'price_drop':
        return '🔥 Price Drop Alert!';
      case 'target_price':
        return '🎯 Target Price Reached!';
      case 'back_in_stock':
        return '✅ Back in Stock!';
      default:
        return '📢 Price Alert';
    }
  }

  // Generate push notification body
  generatePushBody(alert) {
    const productName = alert.product.name;
    const currentPrice = `$${alert.trigger.currentPrice.toFixed(2)}`;
    
    switch (alert.alertType) {
      case 'price_drop':
        const dropPercentage = alert.trigger.dropPercentage?.toFixed(0) || '0';
        return `${productName} dropped ${dropPercentage}% to ${currentPrice}`;
      
      case 'target_price':
        return `${productName} is now ${currentPrice}`;
      
      case 'back_in_stock':
        return `${productName} is available for ${currentPrice}`;
      
      default:
        return `${productName} - ${currentPrice}`;
    }
  }

  // Get unread alerts count for badge
  async getUnreadAlertsCount(userId) {
    try {
      return await PriceAlert.countDocuments({
        userId,
        'notification.inApp.read': false,
        status: { $in: ['pending', 'sent'] }
      });
    } catch (error) {
      Logger.error('Failed to get unread alerts count', { userId, error: error.message });
      return 0;
    }
  }

  // Mock email sending (replace with actual email service)
  async mockSendEmail(emailData) {
    // Simulate email sending with 90% success rate
    await this.delay(100 + Math.random() * 200);
    return Math.random() > 0.1;
  }

  // Mock push notification sending (replace with actual push service)
  async mockSendPush(pushData) {
    // Simulate push sending with 95% success rate
    await this.delay(50 + Math.random() * 100);
    return Math.random() > 0.05;
  }

  // Send bulk notifications (for promotional campaigns, etc.)
  async sendBulkNotification(userIds, notificationData) {
    try {
      const { title, message, type = 'promotional' } = notificationData;
      
      const results = {
        total: userIds.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      // Process in batches to avoid overwhelming the system
      const batchSize = 100;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (userId) => {
          try {
            const user = await User.findById(userId).select('email profile.name settings');
            
            if (!user || !user.settings.notifications) {
              return { success: false, reason: 'user_disabled_notifications' };
            }

            // Send push notification
            const pushSuccess = await this.mockSendPush({
              userId,
              title,
              body: message,
              data: { type }
            });

            if (pushSuccess) {
              results.successful++;
              return { success: true };
            } else {
              results.failed++;
              return { success: false, reason: 'push_failed' };
            }
          } catch (error) {
            results.failed++;
            results.errors.push({ userId, error: error.message });
            return { success: false, reason: 'error', error: error.message };
          }
        });

        await Promise.allSettled(batchPromises);
        
        // Small delay between batches
        await this.delay(1000);
      }

      Logger.info('Bulk notification completed', results);
      return results;
    } catch (error) {
      Logger.error('Bulk notification failed', { error: error.message });
      throw error;
    }
  }

  // Process pending alerts (run periodically)
  async processPendingAlerts() {
    try {
      const pendingAlerts = await PriceAlert.getPendingAlerts({ limit: 100 });
      
      if (pendingAlerts.length === 0) {
        return { processed: 0, message: 'No pending alerts' };
      }

      let processed = 0;
      
      for (const alert of pendingAlerts) {
        try {
          await this.sendPriceAlert(alert);
          processed++;
        } catch (error) {
          Logger.error('Failed to process pending alert', {
            alertId: alert._id,
            error: error.message
          });
        }
      }

      Logger.info('Processed pending alerts', {
        total: pendingAlerts.length,
        processed
      });

      return {
        total: pendingAlerts.length,
        processed,
        message: `Processed ${processed}/${pendingAlerts.length} pending alerts`
      };
    } catch (error) {
      Logger.error('Failed to process pending alerts', { error: error.message });
      throw error;
    }
  }

  // Utility method
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new NotificationService();