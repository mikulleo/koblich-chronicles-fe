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
import { BarionTrackProduct } from './barion-pixel';
import PaymentMethodLogos from './payment-method-logos';
import { useAnalytics } from '@/hooks/use-analytics';

// Spinner for submit button
const Spinner = ({ className = '' }) => (
  <div
    className={`animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full ${className}`}
  />
);

interface DonationFormProps {
  onSuccess?: () => void;
}

export function DonationForm({ onSuccess }: DonationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const analytics = useAnalytics(); // Use our analytics hook

  // presets by currency
  const presetsByCurrency: Record<string, number[]> = {
    CZK: [100, 200, 500, 1000],
    USD: [5, 10, 20, 50],
    EUR: [5, 10, 20, 50],
  };

  const [formData, setFormData] = useState({
    amount: 200,
    currency: 'CZK',
    donorName: '',
    donorEmail: '',
    message: '',
    termsAccepted: false,
  });

  const presets = presetsByCurrency[formData.currency] || presetsByCurrency.CZK;
  const productId = 'donation-koblich-chronicles';
  
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

    setIsSubmitting(true);
    try {
      const { amount, currency, donorName, donorEmail, message } = formData;
      const numAmount = Number(amount);

      // Track donation initiated event
      analytics.trackDonation(numAmount, currency);
      analytics.trackEvent('donation_form_submitted', {
        currency: currency,
        value: numAmount,
        has_name: !!donorName,
        has_email: !!donorEmail,
        has_message: !!message,
      });

      const response = await apiClient.post('/donations', {
        amount: numAmount,
        currency,
        donorName,
        donorEmail,
        message,
      });

      const data = response.data;
      if (data.gatewayUrl) {
        // Track successful donation redirect
        analytics.trackEvent('donation_redirect', {
          donation_id: data.donationId,
          payment_id: data.paymentId,
          currency: currency,
          value: numAmount,
        });

        toast.success('Redirecting to payment gateway...');
        window.location.href = data.gatewayUrl;
        onSuccess?.();
      } else {
        // Track donation error
        analytics.trackEvent('donation_error', {
          error: data.error || 'Unknown error',
          currency: currency,
          value: numAmount,
        });

        toast.error(data.error || 'Payment initialization failed.');
      }
    } catch (error) {
      console.error('Donation error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0) {
      setFormData({ ...formData, amount: v });
    } else if (e.target.value === '') {
      setFormData({ ...formData, amount: 0 });
    }
  };

  return (
    <>
      <BarionTrackProduct
        productId={productId}
        title="Donation to Koblich Chronicles"
        price={formData.amount}
        currency={formData.currency}
      />

      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Support Koblich Chronicles</h2>
          <p className="text-sm text-muted-foreground">
            Your donation helps keep this resource available to everyone
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Currency Selection - Moved above amount presets */}
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
                <SelectItem value="CZK">Czech Koruna (CZK)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
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
            Secured by Barion Payment Inc., an EU-licensed financial
            institution. Your payment information is securely processed.
          </p>
        </form>
      </div>
    </>
  );
}