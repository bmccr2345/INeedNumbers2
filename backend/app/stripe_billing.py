"""
Stripe Billing Integration Module
Handles Stripe Customer Portal sessions and webhook verification.
"""
import stripe
import os
import logging
from typing import Dict, Optional
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Stripe Configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
else:
    logger.warning("STRIPE_SECRET_KEY not configured")


class StripeBillingClient:
    """Client for Stripe billing operations"""
    
    def __init__(self):
        if not STRIPE_SECRET_KEY:
            raise ValueError("STRIPE_SECRET_KEY environment variable is required")
        
        stripe.api_key = STRIPE_SECRET_KEY
    
    async def create_billing_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> str:
        """
        Create a Stripe Customer Portal session.
        
        Args:
            customer_id: Stripe customer ID
            return_url: URL to redirect after portal session
            
        Returns:
            Portal session URL
            
        Raises:
            HTTPException: If session creation fails
        """
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )
            
            logger.info(f"Created billing portal session for customer {customer_id}")
            return session.url
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe API error creating portal session: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create billing portal session: {str(e)}"
            )
    
    async def create_checkout_session(
        self,
        price_id: str,
        customer_email: str,
        success_url: str,
        cancel_url: str,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Create a Stripe Checkout session for subscription signup.
        
        Args:
            price_id: Stripe Price ID for the plan
            customer_email: Customer's email address
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if user cancels
            metadata: Additional metadata to attach to the subscription
            
        Returns:
            Checkout session URL
            
        Raises:
            HTTPException: If session creation fails
        """
        try:
            session = stripe.checkout.Session.create(
                mode="subscription",
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": 1,
                }],
                customer_email=customer_email,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata or {},
                subscription_data={
                    "metadata": metadata or {}
                }
            )
            
            logger.info(f"Created checkout session for {customer_email}")
            return session.url
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe API error creating checkout session: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create checkout session: {str(e)}"
            )
    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str
    ) -> Dict:
        """
        Verify Stripe webhook signature and parse event.
        
        Args:
            payload: Raw request body bytes
            signature: Stripe signature from headers
            
        Returns:
            Parsed webhook event
            
        Raises:
            HTTPException: If signature verification fails
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                STRIPE_WEBHOOK_SECRET
            )
            
            logger.info(f"Verified webhook event: {event['type']}")
            return event
        
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload"
            )
        
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature"
            )
    
    async def get_subscription(self, subscription_id: str) -> Dict:
        """
        Retrieve subscription details from Stripe.
        
        Args:
            subscription_id: Stripe subscription ID
            
        Returns:
            Subscription data
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "customer": subscription.customer,
                "metadata": subscription.metadata
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving subscription: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve subscription"
            )


# Singleton instance
stripe_billing_client = StripeBillingClient() if STRIPE_SECRET_KEY else None
