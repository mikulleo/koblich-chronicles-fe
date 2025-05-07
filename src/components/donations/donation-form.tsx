// src/donations/donation-form.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import PaymentMethodLogos from './payment-method-logos';
import { useAnalytics } from '@/hooks/use-analytics';
import PayPalButton from './paypal-button';
import { Spinner } from '@/components/ui/spinner';

interface DonationFormProps {
  onSuccess?: () => void;
}

export function DonationForm({ onSuccess }: DonationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [showPayPalButtons, setShowPayPalButtons] = useState(false);
  const analytics = useAnalytics();

  // presets by currency
  const presetsByCurrency: Record<string, number[]> = {
    USD: [5, 10, 20, 50],
    EUR: [5, 10, 20, 50],
    CZK: [100, 200, 500, 1000],
  };

  const [formData, setFormData] = useState({
    amount: 10,
    currency: 'USD',
    donorName: '',
    donorEmail: '',
    message: '',
    termsAccepted: false,
  });

  const presets = presetsByCurrency[formData.currency] || presetsByCurrency.USD;
  
  // Handle currency change
  const handleCurrencyChange = (newCurrency: string) => {
    // If the current amount is a preset value in the old currency, 
    // switch to the corresponding position in the new currency's presets
    const currentPresets = presetsByCurrency[formData.currency];
    const newPresets = presetsByCurrency[newCurrency];
    
    let newAmount = formData.amount;
    
    if (!customMode) {
      // Find the index of the current amount in the current presets
      const currentIndex = currentPresets.indexOf(formData.amount);
      if (currentIndex !== -1 && currentIndex < newPresets.length) {
        // Use the same position in the new presets
        newAmount = newPresets[currentIndex];
      } else {
        // Default to the first preset if not found
        newAmount = newPresets[0];
      }
    }
    
    setFormData({
      ...formData, 
      currency: newCurrency,
      amount: newAmount
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.termsAccepted) {
      toast.error('Please accept the terms of service to proceed.');
      return;
    }

    // Track donation initiated event
    analytics.trackDonation(formData.amount, formData.currency);
    analytics.trackEvent('donation_form_submitted', {
      currency: formData.currency,
      value: formData.amount,
      has_name: !!formData.donorName,
      has_email: !!formData.donorEmail,
      has_message: !!formData.message,
    });

    // Show PayPal buttons instead of redirecting
    setShowPayPalButtons(true);
  };

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0) {
      setFormData({ ...formData, amount: v });
    } else if (e.target.value === '') {
      setFormData({ ...formData, amount: 0 });
    }
  };

  const handlePayPalSuccess = async (details: any) => {
    setIsSubmitting(true);
    try {
      // Record the donation in your system
      await apiClient.post('/donations', {
        amount: formData.amount,
        currency: formData.currency,
        donorName: formData.donorName,
        donorEmail: formData.donorEmail,
        message: formData.message,
        paymentId: details.id,
        status: 'completed',
        metadata: details,
      });

      // Track successful donation
      analytics.trackEvent('donation_completed', {
        payment_id: details.id,
        currency: formData.currency,
        value: formData.amount,
      });

      toast.success('Thank you for your donation!');
      
      // Redirect to thank you page
      window.location.href = `/donation/thank-you?orderId=${details.id}`;
      
      onSuccess?.();
    } catch (error) {
      console.error('Error recording donation:', error);
      toast.error('Your donation was processed, but we had an error recording it. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayPalError = (error: any) => {
    console.error('PayPal error:', error);
    toast.error('There was an error processing your donation. Please try again.');
    setShowPayPalButtons(false);
  };

  const handlePayPalCancel = () => {
    toast.info('Donation cancelled');
    setShowPayPalButtons(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Support Koblich Chronicles</h2>
        <p className="text-sm text-muted-foreground">
          Your donation helps keep this resource available to everyone
        </p>
      </div>

      {showPayPalButtons ? (
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="font-medium">Donating {formData.amount} {formData.currency}</p>
            {formData.donorName && <p className="text-sm">From: {formData.donorName}</p>}
          </div>
          
          <PayPalButton
            amount={formData.amount}
            currency={formData.currency}
            onSuccess={handlePayPalSuccess}
            onError={handlePayPalError}
            onCancel={handlePayPalCancel}
          />
          
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => setShowPayPalButtons(false)}
          >
            Back to donation form
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Currency Selection */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={handleCurrencyChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                <SelectItem value="CZK">Czech Koruna (CZK)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Amount presets + custom */}
          <div className="space-y-2">
            <Label htmlFor="amount">Donation Amount</Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {presets.map((val) => (
                <Button
                  key={val}
                  type="button"
                  variant={
                    formData.amount === val && !customMode
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => {
                    setFormData({ ...formData, amount: val });
                    setCustomMode(false);
                  }}
                >
                  {`${val} ${formData.currency}`}
                </Button>
              ))}

              <Button
                type="button"
                variant={customMode ? 'default' : 'outline'}
                onClick={() => setCustomMode(true)}
              >
                Custom
              </Button>
            </div>

            {customMode && (
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount || ''}
                    onChange={handleAmountInput}
                    min="1"
                    step="1"
                    required
                    className="w-full"
                  />
                </div>
                <div className="w-[120px] flex items-center justify-center px-3 bg-muted border rounded-md">
                  {formData.currency}
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              name="name"
              value={formData.donorName}
              onChange={(e) =>
                setFormData({ ...formData, donorName: e.target.value })
              }
              placeholder="Your name"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.donorEmail}
              onChange={(e) =>
                setFormData({ ...formData, donorEmail: e.target.value })
              }
              placeholder="your@email.com"
            />
            <p className="text-xs text-muted-foreground">
              To receive a confirmation of your donation
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              placeholder="Add a message or note (optional)"
              rows={3}
            />
          </div>

          {/* Logos */}
          <div className="py-2">
            <PaymentMethodLogos showLabel={true} size="medium" />
          </div>

          {/* Terms */}
          <div className="flex items-start space-x-2 mt-4">
            <Checkbox
              id="terms"
              checked={formData.termsAccepted}
              onCheckedChange={(checked) =>
                typeof checked === 'boolean' &&
                setFormData({ ...formData, termsAccepted: checked })
              }
              aria-required="true"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground leading-snug"
              >
                By proceeding, I accept the{' '}
                <Link
                  href="/terms"
                  className="text-primary hover:underline"
                  target="_blank"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  className="text-primary hover:underline"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              isSubmitting ||
              !formData.termsAccepted ||
              formData.amount <= 0
            }
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2" /> Processing...
              </>
            ) : (
              <>Donate {formData.amount} {formData.currency}</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secured by PayPal, a trusted payment processor. Your payment information is handled securely.
          </p>
        </form>
      )}
    </div>
  );
}