import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PaymentMethodLogos from '@/components/donations/payment-method-logos';

export const metadata: Metadata = {
  title: 'Terms of Service | Koblich Chronicles',
  description: 'Terms and conditions for using Koblich Chronicles services',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto py-8">
        <div className="prose dark:prose-invert max-w-none animate-fade-in">

        <h1>Terms of Service</h1>
        
        <div className="bg-muted p-4 rounded-lg mb-6">
          <p className="font-medium">Last Updated: May 1, 2025</p>
          <p>Please read these terms and conditions carefully before using our service.</p>
        </div>
        
        <h2>1. Company Information</h2>
        <p>
          <strong>Business Name:</strong> Leoš Mikulka<br />
          <strong>Registration Number (IČO):</strong> 23078928<br />
          <strong>Registered Address:</strong> Krajinova 1006/88, 674 01 Třebíč<br />
          <strong>Email:</strong> mikulkal@atlas.cz
        </p>
        
        <h2>2. Services Description</h2>
        <p>
          Koblich Chronicles provides an interactive stock trading tracker and model book service with charts, 
          statistics, and educational content for traders. Our platform is for educational purposes only and
          does not provide investment advice or recommendations.
        </p>
        
        <h2>3. Payment Terms</h2>
        <h3>3.1 Donation Payments with Barion</h3>
        <p>
          We accept donations through the Barion Payment Gateway. Barion is a licensed financial institution 
          that provides secure payment processing. When making a donation, you will be redirected to the Barion 
          payment interface to complete your transaction.
        </p>
        
        <h3>3.2 Payment Methods</h3>
        <p>
          Through Barion, we accept the following payment methods:
        </p>
        <ul>
          <li>Credit/Debit Cards (Visa, Mastercard)</li>
          <li>Barion Balance</li>
          <li>Google Pay (where available)</li>
          <li>Apple Pay (where available)</li>
        </ul>
        
        <div className="my-6">
          <PaymentMethodLogos size="medium" />
        </div>
        
        <h3>3.3 Processing Time</h3>
        <p>
          Donations are typically processed immediately. You will receive confirmation of your donation 
          via email once the payment is complete. Donation acknowledgments are typically issued within 24 hours.
        </p>
        
        <h3>3.4 Fulfillment Information</h3>
        <p>
          Donations are processed before the service is provided. After your payment is confirmed, you will 
          immediately gain access to any associated benefits (such as premium content access). There is no 
          delivery required as all services are provided digitally through our platform.
        </p>
        
        <h2>4. Service Usage</h2>
        <p>
          Koblich Chronicles provides an educational platform for learning about stock trading patterns and performance tracking.
          All content is provided for informational and educational purposes only. Users agree not to:
        </p>
        <ul>
          <li>Reproduce, duplicate, or resell any portion of the service without permission</li>
          <li>Use the service for any illegal purpose</li>
          <li>Attempt to gain unauthorized access to any portion of the service</li>
          <li>Harass, abuse, or harm another person through use of the service</li>
        </ul>
        
        <h2>5. Intellectual Property</h2>
        <p>
          All content, features, and functionality of Koblich Chronicles, including but not limited to text, 
          graphics, logos, icons, images, audio clips, and software, are the exclusive property of Leoš Mikulka
          and are protected by international copyright, trademark, and other intellectual property laws.
        </p>
        
        <h2>6. Limitation of Liability</h2>
        <p>
          Koblich Chronicles is provided on an "as is" and "as available" basis. We make no warranties, 
          expressed or implied, regarding the operation or availability of the service. In no event shall 
          we be liable for any indirect, incidental, special, consequential or punitive damages.
        </p>
        
        <h2>7. User Data and Privacy</h2>
        <p>
          We collect and process user data in accordance with our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          By using our service, you consent to such processing and you warrant that all data provided by you is accurate.
        </p>
        
        <h3>7.1 Barion Pixel Usage</h3>
        <p>
          Our website uses Barion Pixel, a tool provided by Barion Payment Inc., to prevent fraudulent transactions and
          enhance payment security. The Barion Pixel collects information about your browsing behavior, device information,
          and interactions with our site. For more information about how Barion processes this data, please refer to
          <a href="https://www.barion.com/en/privacy-policy/" target="_blank" rel="noopener noreferrer"> Barion's Privacy Policy</a>.
        </p>
        
        <h2>8. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the Czech Republic, 
          without regard to its conflict of law provisions.
        </p>
        
        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. We will provide notice of any significant changes 
          by updating the "Last Updated" date at the top of this page. Your continued use of the Service after such 
          modifications constitutes your acceptance of the revised terms.
        </p>
        
        <h2>10. Contact Information</h2>
        <p>
          If you have any questions about these Terms, please contact us at:<br />
          Email: mikulkal@atlas.cz
        </p>
      </div>
    </div>
  );
}