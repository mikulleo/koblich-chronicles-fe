'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { HeartIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api/client' // <-- imported here

interface DonationFormProps {
  onSuccess?: () => void
}

export function DonationForm({ onSuccess }: DonationFormProps) {
  const [amount, setAmount] = useState<string>('20')
  const [currency, setCurrency] = useState<string>('CZK')
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const donationAmounts = [
    { value: '5', label: '5' },
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
    { value: 'custom', label: 'Custom' },
  ]

  const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    setAmount(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const numAmount = parseFloat(amount)
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid amount')
      }

      // ✨ Now using apiClient instead of fetch
      const response = await apiClient.post('/donations', {
        amount: numAmount,
        currency,
        donorName: name,
        donorEmail: email,
        message,
      })

      const data = response.data

      if (data.gatewayUrl) {
        toast.success('Redirecting to payment gateway...')
        window.location.href = data.gatewayUrl
        if (onSuccess) onSuccess()
      } else {
        throw new Error('No payment URL received')
      }
    } catch (err) {
      console.error('Donation error:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      toast.error('Donation failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <HeartIcon className="mr-2 h-5 w-5 text-red-500" />
          Support Koblich Chronicles
        </CardTitle>
        <CardDescription>
          Your donation helps maintain this resource and develop new features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Donation Amount</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {donationAmounts.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={amount === option.value ? 'default' : 'outline'}
                    onClick={() => setAmount(option.value)}
                    className="h-9"
                  >
                    {option.value === 'custom' ? 'Custom' : `${option.value} ${currency}`}
                  </Button>
                ))}
              </div>
              {amount === 'custom' && (
                <div className="mt-2 flex items-center">
                  <Input
                    id="customAmount"
                    placeholder="Enter amount"
                    value={amount === 'custom' ? '' : amount}
                    onChange={handleCustomAmount}
                    className="flex-1"
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-[80px] ml-2">
                      <SelectValue placeholder="CZK" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CZK">CZK</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CZK">Czech Koruna (CZK)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Your Name (Optional)</Label>
              <Input
                id="name"
                placeholder="Anonymous"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Your Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll only use this to thank you or contact you about your donation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Leave a message or feedback..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          disabled={loading || !amount || (amount === 'custom' && !parseFloat(amount))} 
          onClick={handleSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>Donate {amount !== 'custom' ? `${amount} ${currency}` : ''}</>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
