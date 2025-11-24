const StripeService = require('../services/stripeService');
const User = require('../models/User');
const Logger = require('../utils/logger');

class SubscriptionController {
  // Get available subscription plans
  static async getPlans(req, res) {
    try {
      const plans = StripeService.getPlans();
      
      res.json({
        plans: Object.entries(plans).map(([key, plan]) => ({
          id: key,
          name: plan.name,
          price: plan.amount / 100, // Convert cents to dollars
          currency: plan.currency,
          interval: plan.interval,
          features: plan.features
        })),
        currency: 'USD'
      });
    } catch (error) {
      Logger.error('Get plans failed', { error: error.message });
      
      res.status(500).json({
        error: {
          code: 'GET_PLANS_FAILED',
          message: 'Failed to retrieve subscription plans'
        }
      });
    }
  }

  // Create subscription (upgrade user)
  static async createSubscription(req, res) {
    try {
      const { planType, paymentMethodId } = req.body;
      const userId = req.user.userId;

      // Validate plan type
      const availablePlans = StripeService.getPlans();
      if (!availablePlans[planType]) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PLAN',
            message: 'Invalid subscription plan'
          }
        });
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Check if user already has an active subscription
      if (user.subscription.subscriptionId && user.subscription.status === 'active') {
        return res.status(409).json({
          error: {
            code: 'SUBSCRIPTION_EXISTS',
            message: 'User already has an active subscription',
            currentPlan: user.subscription.tier,
            upgradeEndpoint: '/api/subscription/change-plan'
          }
        });
      }

      // Create Stripe subscription
      const subscription = await StripeService.createSubscription(user, planType, paymentMethodId);

      // Update user subscription info
      user.subscription.tier = planType;
      user.subscription.status = subscription.status;
      user.subscription.subscriptionId = subscription.id;
      
      if (subscription.current_period_end) {
        user.subscription.expiresAt = new Date(subscription.current_period_end * 1000);
      }

      await user.save();

      Logger.info('Subscription created', {
        userId,
        subscriptionId: subscription.id,
        planType,
        status: subscription.status
      });

      res.status(201).json({
        message: 'Subscription created successfully',
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan: planType,
          currentPeriodEnd: subscription.current_period_end,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
        },
        user: {
          tier: user.subscription.tier,
          hasProFeatures: user.hasProFeatures(),
          hasProMaxFeatures: user.hasProMaxFeatures()
        }
      });
    } catch (error) {
      Logger.error('Create subscription failed', {
        userId: req.user.userId,
        planType: req.body.planType,
        error: error.message
      });

      if (error.message.includes('Invalid plan type')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PLAN',
            message: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'SUBSCRIPTION_CREATION_FAILED',
          message: 'Failed to create subscription'
        }
      });
    }
  }

  // Get current subscription details
  static async getCurrentSubscription(req, res) {
    try {
      const userId = req.user.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      let subscriptionDetails = null;
      
      if (user.subscription.subscriptionId) {
        try {
          const stripeSubscription = await StripeService.getSubscription(user.subscription.subscriptionId);
          
          subscriptionDetails = {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            currentPeriodStart: stripeSubscription.current_period_start,
            currentPeriodEnd: stripeSubscription.current_period_end,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            canceledAt: stripeSubscription.canceled_at,
            trialEnd: stripeSubscription.trial_end,
            defaultPaymentMethod: stripeSubscription.default_payment_method ? {
              id: stripeSubscription.default_payment_method.id,
              type: stripeSubscription.default_payment_method.type,
              card: stripeSubscription.default_payment_method.card ? {
                brand: stripeSubscription.default_payment_method.card.brand,
                last4: stripeSubscription.default_payment_method.card.last4,
                expMonth: stripeSubscription.default_payment_method.card.exp_month,
                expYear: stripeSubscription.default_payment_method.card.exp_year
              } : null
            } : null
          };
        } catch (error) {
          Logger.warn('Failed to get Stripe subscription details', {
            userId,
            subscriptionId: user.subscription.subscriptionId,
            error: error.message
          });
        }
      }

      res.json({
        subscription: {
          tier: user.subscription.tier,
          status: user.subscription.status,
          expiresAt: user.subscription.expiresAt,
          stripeDetails: subscriptionDetails
        },
        features: {
          hasProFeatures: user.hasProFeatures(),
          hasProMaxFeatures: user.hasProMaxFeatures()
        },
        limits: {
          wishlistItems: user.hasProFeatures() ? 1000 : 50,
          priceCheckFrequency: user.hasProMaxFeatures() ? 'hourly' : user.hasProFeatures() ? 'daily' : 'daily'
        }
      });
    } catch (error) {
      Logger.error('Get current subscription failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'GET_SUBSCRIPTION_FAILED',
          message: 'Failed to retrieve subscription details'
        }
      });
    }
  }

  // Change subscription plan
  static async changePlan(req, res) {
    try {
      const { newPlanType } = req.body;
      const userId = req.user.userId;

      // Validate new plan type
      const availablePlans = StripeService.getPlans();
      if (!availablePlans[newPlanType]) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PLAN',
            message: 'Invalid subscription plan'
          }
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Check if user has an active subscription
      if (!user.subscription.subscriptionId || user.subscription.status !== 'active') {
        return res.status(400).json({
          error: {
            code: 'NO_ACTIVE_SUBSCRIPTION',
            message: 'No active subscription found',
            createEndpoint: '/api/subscription/create'
          }
        });
      }

      // Check if it's the same plan
      if (user.subscription.tier === newPlanType) {
        return res.status(400).json({
          error: {
            code: 'SAME_PLAN',
            message: 'User is already on this plan'
          }
        });
      }

      // Update Stripe subscription
      const updatedSubscription = await StripeService.updateSubscription(
        user.subscription.subscriptionId,
        newPlanType
      );

      // Update user subscription info
      user.subscription.tier = newPlanType;
      user.subscription.status = updatedSubscription.status;
      user.subscription.expiresAt = new Date(updatedSubscription.current_period_end * 1000);
      await user.save();

      Logger.info('Subscription plan changed', {
        userId,
        subscriptionId: user.subscription.subscriptionId,
        oldPlan: user.subscription.tier,
        newPlan: newPlanType
      });

      res.json({
        message: 'Subscription plan changed successfully',
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          plan: newPlanType,
          currentPeriodEnd: updatedSubscription.current_period_end
        },
        user: {
          tier: user.subscription.tier,
          hasProFeatures: user.hasProFeatures(),
          hasProMaxFeatures: user.hasProMaxFeatures()
        }
      });
    } catch (error) {
      Logger.error('Change plan failed', {
        userId: req.user.userId,
        newPlanType: req.body.newPlanType,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'PLAN_CHANGE_FAILED',
          message: 'Failed to change subscription plan'
        }
      });
    }
  }

  // Cancel subscription
  static async cancelSubscription(req, res) {
    try {
      const { cancelAtPeriodEnd = true } = req.body;
      const userId = req.user.userId;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Check if user has an active subscription
      if (!user.subscription.subscriptionId) {
        return res.status(400).json({
          error: {
            code: 'NO_SUBSCRIPTION',
            message: 'No subscription found to cancel'
          }
        });
      }

      // Cancel Stripe subscription
      const canceledSubscription = await StripeService.cancelSubscription(
        user.subscription.subscriptionId,
        cancelAtPeriodEnd
      );

      // Update user subscription status
      if (cancelAtPeriodEnd) {
        user.subscription.status = 'active'; // Keep active until period end
      } else {
        user.subscription.tier = 'free';
        user.subscription.status = 'cancelled';
        user.subscription.subscriptionId = null;
        user.subscription.expiresAt = null;
      }

      await user.save();

      Logger.info('Subscription cancelled', {
        userId,
        subscriptionId: user.subscription.subscriptionId,
        cancelAtPeriodEnd,
        status: canceledSubscription.status
      });

      res.json({
        message: cancelAtPeriodEnd 
          ? 'Subscription will be cancelled at the end of the billing period'
          : 'Subscription cancelled immediately',
        subscription: {
          id: canceledSubscription.id,
          status: canceledSubscription.status,
          cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
          currentPeriodEnd: canceledSubscription.current_period_end
        },
        user: {
          tier: user.subscription.tier,
          hasProFeatures: user.hasProFeatures(),
          hasProMaxFeatures: user.hasProMaxFeatures()
        }
      });
    } catch (error) {
      Logger.error('Cancel subscription failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'CANCELLATION_FAILED',
          message: 'Failed to cancel subscription'
        }
      });
    }
  }

  // Reactivate cancelled subscription
  static async reactivateSubscription(req, res) {
    try {
      const userId = req.user.userId;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Check if user has a subscription that can be reactivated
      if (!user.subscription.subscriptionId) {
        return res.status(400).json({
          error: {
            code: 'NO_SUBSCRIPTION',
            message: 'No subscription found to reactivate'
          }
        });
      }

      // Get current subscription from Stripe
      const subscription = await StripeService.getSubscription(user.subscription.subscriptionId);

      if (!subscription.cancel_at_period_end) {
        return res.status(400).json({
          error: {
            code: 'SUBSCRIPTION_NOT_CANCELLED',
            message: 'Subscription is not scheduled for cancellation'
          }
        });
      }

      // Reactivate subscription by removing the cancellation
      const reactivatedSubscription = await StripeService.stripe.subscriptions.update(
        user.subscription.subscriptionId,
        {
          cancel_at_period_end: false
        }
      );

      // Update user subscription status
      user.subscription.status = 'active';
      await user.save();

      Logger.info('Subscription reactivated', {
        userId,
        subscriptionId: user.subscription.subscriptionId
      });

      res.json({
        message: 'Subscription reactivated successfully',
        subscription: {
          id: reactivatedSubscription.id,
          status: reactivatedSubscription.status,
          cancelAtPeriodEnd: reactivatedSubscription.cancel_at_period_end,
          currentPeriodEnd: reactivatedSubscription.current_period_end
        }
      });
    } catch (error) {
      Logger.error('Reactivate subscription failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'REACTIVATION_FAILED',
          message: 'Failed to reactivate subscription'
        }
      });
    }
  }

  // Get payment methods
  static async getPaymentMethods(req, res) {
    try {
      const userId = req.user.userId;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      if (!user.subscription.stripeCustomerId) {
        return res.json({
          paymentMethods: [],
          message: 'No payment methods found'
        });
      }

      const paymentMethods = await StripeService.getPaymentMethods(user.subscription.stripeCustomerId);

      const formattedPaymentMethods = paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year
        } : null,
        createdAt: new Date(pm.created * 1000)
      }));

      res.json({
        paymentMethods: formattedPaymentMethods
      });
    } catch (error) {
      Logger.error('Get payment methods failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'GET_PAYMENT_METHODS_FAILED',
          message: 'Failed to retrieve payment methods'
        }
      });
    }
  }

  // Create setup intent for adding payment method
  static async createSetupIntent(req, res) {
    try {
      const userId = req.user.userId;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Create or get Stripe customer
      const customer = await StripeService.createOrGetCustomer(user);

      // Create setup intent
      const setupIntent = await StripeService.createSetupIntent(customer.id);

      res.json({
        clientSecret: setupIntent.client_secret,
        customerId: customer.id
      });
    } catch (error) {
      Logger.error('Create setup intent failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'SETUP_INTENT_FAILED',
          message: 'Failed to create setup intent'
        }
      });
    }
  }

  // Handle Stripe webhooks
  static async handleWebhook(req, res) {
    try {
      const signature = req.headers['stripe-signature'];
      const rawBody = req.body;

      const result = await StripeService.handleWebhook(rawBody, signature);

      res.json(result);
    } catch (error) {
      Logger.error('Webhook handling failed', {
        error: error.message,
        signature: req.headers['stripe-signature']
      });

      res.status(400).json({
        error: {
          code: 'WEBHOOK_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = SubscriptionController;