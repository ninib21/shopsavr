const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Logger = require('../utils/logger');

class StripeService {
  constructor() {
    this.stripe = stripe;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Subscription plans configuration
    this.plans = {
      pro: {
        priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
        name: 'Pro',
        amount: 299, // $2.99 in cents
        currency: 'usd',
        interval: 'month',
        features: [
          'Unlimited wishlist items',
          'Advanced price alerts',
          'Priority customer support',
          'Export data'
        ]
      },
      pro_max: {
        priceId: process.env.STRIPE_PRO_MAX_PRICE_ID || 'price_pro_max_monthly',
        name: 'Pro Max',
        amount: 699, // $6.99 in cents
        currency: 'usd',
        interval: 'month',
        features: [
          'All Pro features',
          '2x cashback rewards',
          'Advanced analytics',
          'API access',
          'White-label options'
        ]
      }
    };
  }

  // Create or retrieve Stripe customer
  async createOrGetCustomer(user) {
    try {
      // Check if user already has a Stripe customer ID
      if (user.subscription.stripeCustomerId) {
        try {
          const customer = await this.stripe.customers.retrieve(user.subscription.stripeCustomerId);
          if (!customer.deleted) {
            return customer;
          }
        } catch (error) {
          Logger.warn('Existing Stripe customer not found', {
            userId: user._id,
            stripeCustomerId: user.subscription.stripeCustomerId,
            error: error.message
          });
        }
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.profile.name,
        metadata: {
          userId: user._id.toString(),
          tier: user.subscription.tier
        }
      });

      // Update user with Stripe customer ID
      user.subscription.stripeCustomerId = customer.id;
      await user.save();

      Logger.info('Stripe customer created', {
        userId: user._id,
        stripeCustomerId: customer.id
      });

      return customer;
    } catch (error) {
      Logger.error('Failed to create Stripe customer', {
        userId: user._id,
        error: error.message
      });
      throw error;
    }
  }

  // Create subscription
  async createSubscription(user, planType, paymentMethodId = null) {
    try {
      const plan = this.plans[planType];
      if (!plan) {
        throw new Error(`Invalid plan type: ${planType}`);
      }

      // Create or get customer
      const customer = await this.createOrGetCustomer(user);

      // Create subscription
      const subscriptionData = {
        customer: customer.id,
        items: [{
          price: plan.priceId
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user._id.toString(),
          planType
        }
      };

      // Add payment method if provided
      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      Logger.info('Stripe subscription created', {
        userId: user._id,
        subscriptionId: subscription.id,
        planType,
        status: subscription.status
      });

      return subscription;
    } catch (error) {
      Logger.error('Failed to create subscription', {
        userId: user._id,
        planType,
        error: error.message
      });
      throw error;
    }
  }

  // Update subscription
  async updateSubscription(subscriptionId, newPlanType) {
    try {
      const newPlan = this.plans[newPlanType];
      if (!newPlan) {
        throw new Error(`Invalid plan type: ${newPlanType}`);
      }

      // Get current subscription
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      // Update subscription with new price
      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPlan.priceId
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          ...subscription.metadata,
          planType: newPlanType
        }
      });

      Logger.info('Stripe subscription updated', {
        subscriptionId,
        newPlanType,
        status: updatedSubscription.status
      });

      return updatedSubscription;
    } catch (error) {
      Logger.error('Failed to update subscription', {
        subscriptionId,
        newPlanType,
        error: error.message
      });
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      let canceledSubscription;

      if (cancelAtPeriodEnd) {
        // Cancel at period end (user keeps access until billing period ends)
        canceledSubscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
      } else {
        // Cancel immediately
        canceledSubscription = await this.stripe.subscriptions.cancel(subscriptionId);
      }

      Logger.info('Stripe subscription canceled', {
        subscriptionId,
        cancelAtPeriodEnd,
        status: canceledSubscription.status
      });

      return canceledSubscription;
    } catch (error) {
      Logger.error('Failed to cancel subscription', {
        subscriptionId,
        error: error.message
      });
      throw error;
    }
  }

  // Create payment intent for one-time payments
  async createPaymentIntent(amount, currency = 'usd', customerId = null, metadata = {}) {
    try {
      const paymentIntentData = {
        amount,
        currency,
        automatic_payment_methods: {
          enabled: true
        },
        metadata
      };

      if (customerId) {
        paymentIntentData.customer = customerId;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      Logger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        customerId
      });

      return paymentIntent;
    } catch (error) {
      Logger.error('Failed to create payment intent', {
        amount,
        currency,
        customerId,
        error: error.message
      });
      throw error;
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'latest_invoice']
      });

      return subscription;
    } catch (error) {
      Logger.error('Failed to get subscription', {
        subscriptionId,
        error: error.message
      });
      throw error;
    }
  }

  // Get customer's payment methods
  async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return paymentMethods.data;
    } catch (error) {
      Logger.error('Failed to get payment methods', {
        customerId,
        error: error.message
      });
      throw error;
    }
  }

  // Create setup intent for saving payment method
  async createSetupIntent(customerId) {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session'
      });

      Logger.info('Setup intent created', {
        setupIntentId: setupIntent.id,
        customerId
      });

      return setupIntent;
    } catch (error) {
      Logger.error('Failed to create setup intent', {
        customerId,
        error: error.message
      });
      throw error;
    }
  }

  // Handle webhook events
  async handleWebhook(rawBody, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );

      Logger.info('Stripe webhook received', {
        eventType: event.type,
        eventId: event.id
      });

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object);
          break;

        default:
          Logger.info('Unhandled webhook event', { eventType: event.type });
      }

      return { received: true };
    } catch (error) {
      Logger.error('Webhook handling failed', {
        error: error.message,
        signature
      });
      throw error;
    }
  }

  // Webhook event handlers
  async handleSubscriptionCreated(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const planType = subscription.metadata.planType;

      const user = await User.findById(userId);
      if (!user) {
        Logger.error('User not found for subscription', { userId, subscriptionId: subscription.id });
        return;
      }

      // Update user subscription
      user.subscription.tier = planType;
      user.subscription.status = subscription.status;
      user.subscription.subscriptionId = subscription.id;
      user.subscription.expiresAt = new Date(subscription.current_period_end * 1000);
      await user.save();

      Logger.info('User subscription activated', {
        userId,
        subscriptionId: subscription.id,
        tier: planType
      });
    } catch (error) {
      Logger.error('Failed to handle subscription created', {
        subscriptionId: subscription.id,
        error: error.message
      });
    }
  }

  async handleSubscriptionUpdated(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const planType = subscription.metadata.planType;

      const user = await User.findById(userId);
      if (!user) {
        Logger.error('User not found for subscription update', { userId, subscriptionId: subscription.id });
        return;
      }

      // Update user subscription
      user.subscription.tier = planType;
      user.subscription.status = subscription.status;
      user.subscription.expiresAt = new Date(subscription.current_period_end * 1000);
      await user.save();

      Logger.info('User subscription updated', {
        userId,
        subscriptionId: subscription.id,
        tier: planType,
        status: subscription.status
      });
    } catch (error) {
      Logger.error('Failed to handle subscription updated', {
        subscriptionId: subscription.id,
        error: error.message
      });
    }
  }

  async handleSubscriptionDeleted(subscription) {
    try {
      const userId = subscription.metadata.userId;

      const user = await User.findById(userId);
      if (!user) {
        Logger.error('User not found for subscription deletion', { userId, subscriptionId: subscription.id });
        return;
      }

      // Downgrade user to free tier
      user.subscription.tier = 'free';
      user.subscription.status = 'cancelled';
      user.subscription.subscriptionId = null;
      user.subscription.expiresAt = null;
      await user.save();

      Logger.info('User subscription cancelled', {
        userId,
        subscriptionId: subscription.id
      });
    } catch (error) {
      Logger.error('Failed to handle subscription deleted', {
        subscriptionId: subscription.id,
        error: error.message
      });
    }
  }

  async handlePaymentSucceeded(invoice) {
    try {
      const subscriptionId = invoice.subscription;
      if (!subscriptionId) return;

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata.userId;

      const user = await User.findById(userId);
      if (!user) {
        Logger.error('User not found for payment success', { userId, invoiceId: invoice.id });
        return;
      }

      // Ensure subscription is active
      user.subscription.status = 'active';
      user.subscription.expiresAt = new Date(subscription.current_period_end * 1000);
      await user.save();

      Logger.info('Payment succeeded', {
        userId,
        invoiceId: invoice.id,
        amount: invoice.amount_paid
      });
    } catch (error) {
      Logger.error('Failed to handle payment succeeded', {
        invoiceId: invoice.id,
        error: error.message
      });
    }
  }

  async handlePaymentFailed(invoice) {
    try {
      const subscriptionId = invoice.subscription;
      if (!subscriptionId) return;

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata.userId;

      const user = await User.findById(userId);
      if (!user) {
        Logger.error('User not found for payment failure', { userId, invoiceId: invoice.id });
        return;
      }

      // Update subscription status
      user.subscription.status = 'past_due';
      await user.save();

      Logger.warn('Payment failed', {
        userId,
        invoiceId: invoice.id,
        amount: invoice.amount_due
      });

      // TODO: Send notification to user about failed payment
    } catch (error) {
      Logger.error('Failed to handle payment failed', {
        invoiceId: invoice.id,
        error: error.message
      });
    }
  }

  async handleTrialWillEnd(subscription) {
    try {
      const userId = subscription.metadata.userId;

      const user = await User.findById(userId);
      if (!user) {
        Logger.error('User not found for trial ending', { userId, subscriptionId: subscription.id });
        return;
      }

      Logger.info('Trial will end', {
        userId,
        subscriptionId: subscription.id,
        trialEnd: new Date(subscription.trial_end * 1000)
      });

      // TODO: Send notification to user about trial ending
    } catch (error) {
      Logger.error('Failed to handle trial will end', {
        subscriptionId: subscription.id,
        error: error.message
      });
    }
  }

  // Get available plans
  getPlans() {
    return this.plans;
  }

  // Validate webhook signature
  validateWebhookSignature(rawBody, signature) {
    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (error) {
      throw new Error('Invalid webhook signature');
    }
  }
}

// Export singleton instance
module.exports = new StripeService();