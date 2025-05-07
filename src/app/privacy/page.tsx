// src/app/privacy/page.tsx

import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { motion } from 'framer-motion';

export const metadata: Metadata = {
  title: 'Privacy Policy | Koblich Chronicles',
  description: 'Privacy policy for Koblich Chronicles - how we handle your data',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto py-8">
        <div className="prose dark:prose-invert max-w-none animate-fade-in">

        <h1>Privacy Policy</h1>
        
        <div className="bg-muted p-4 rounded-lg mb-6">
          <p className="font-medium">Last Updated: May 7, 2025</p>
          <p>This Privacy Policy describes how we collect, use, and disclose your personal information when you use our services.</p>
        </div>
        
        <h2>1. Information We Collect</h2>
        
        <h3>1.1 Information You Provide</h3>
        <p>We may collect the following types of information when you interact with our services:</p>
        <ul>
          <li><strong>Contact Information:</strong> Name, email address when you make a donation</li>
          <li><strong>Payment Information:</strong> We do not store your payment details. All payment processing is handled securely by our payment processor, PayPal</li>
          <li><strong>Communication:</strong> Messages you send us via contact forms or email</li>
        </ul>
        
        <h3>1.2 Information Collected Automatically</h3>
        <p>When you visit our website, we automatically collect certain information about your device and usage:</p>
        <ul>
          <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
          <li><strong>Usage Data:</strong> Pages viewed, time spent on pages, referring websites, and click patterns</li>
          <li><strong>Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to enhance your experience</li>
        </ul>
        
        <h3>1.3 PayPal Services</h3>
        <p>
          Our website uses PayPal for payment processing. When you make a donation through PayPal, they may collect
          additional information according to their privacy policy. PayPal collects information necessary to process
          payments and prevent fraud, including your payment method details, device information, and transaction data.
        </p>
        <p>
          <strong>What data does PayPal collect?</strong> PayPal may collect the following information:
        </p>
        <ul>
          <li>Name, email address, and billing information</li>
          <li>Payment method details (credit card information, bank account information)</li>
          <li>Device information (type, operating system, browser details)</li>
          <li>IP address and approximate location</li>
          <li>Transaction details and history</li>
        </ul>
        <p>
          <strong>How is PayPal data used?</strong> This data is used for payment processing, fraud prevention, 
          customer support, and improving services. PayPal processes this data in accordance with their privacy policy,
          which you can find at <a href="https://www.paypal.com/us/webapps/mpp/ua/privacy-full" target="_blank" rel="noopener noreferrer">https://www.paypal.com/privacy</a>.
        </p>
        <p>
          <strong>Legal basis for processing:</strong> The legal basis for processing data through PayPal is our legitimate 
          interest in processing donations and preventing fraud, as permitted under GDPR Article 6(1)(f), as well as
          the necessity for the performance of a contract (donation acceptance) under GDPR Article 6(1)(b).
        </p>
        
        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect for the following purposes:</p>
        <ul>
          <li>To provide and maintain our services</li>
          <li>To process donations and send receipts</li>
          <li>To respond to your inquiries and provide customer support</li>
          <li>To prevent fraudulent transactions</li>
          <li>To analyze usage patterns and improve our website</li>
          <li>To comply with legal obligations</li>
        </ul>
        
        <h2>3. Legal Basis for Processing</h2>
        <p>Under the General Data Protection Regulation (GDPR), we process your personal data based on the following legal grounds:</p>
        <ul>
          <li><strong>Contract:</strong> Processing necessary for the performance of a contract with you</li>
          <li><strong>Legitimate Interests:</strong> Processing necessary for our legitimate interests, such as fraud prevention and service improvement</li>
          <li><strong>Consent:</strong> Processing based on your explicit consent</li>
          <li><strong>Legal Obligation:</strong> Processing necessary to comply with legal requirements</li>
        </ul>
        
        <h2>4. Data Sharing and Disclosure</h2>
        <p>We may share your information with the following categories of third parties:</p>
        <ul>
          <li><strong>Payment Processors:</strong> We share transaction data with PayPal to process donations</li>
          <li><strong>Service Providers:</strong> We use third-party vendors who provide services such as hosting, analytics, and customer support</li>
          <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights</li>
        </ul>
        
        <h2>5. Data Retention</h2>
        <p>
          We retain your personal information only for as long as necessary to fulfill the purposes outlined in this 
          Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal 
          obligations, resolve disputes, and enforce our agreements.
        </p>
        
        <h2>6. Your Rights</h2>
        <p>Under the GDPR, you have the following rights regarding your personal data:</p>
        <ul>
          <li>Right to access and receive a copy of your personal data</li>
          <li>Right to rectify inaccurate or incomplete personal data</li>
          <li>Right to erasure ("right to be forgotten")</li>
          <li>Right to restrict processing</li>
          <li>Right to data portability</li>
          <li>Right to object to processing</li>
          <li>Right not to be subject to automated decision-making</li>
        </ul>
        <p>
          To exercise these rights, please contact us using the information provided in the "Contact Us" section below.
        </p>
        
        <h2>7. Cookies and Tracking Technologies</h2>
        <p>
          We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, 
          and personalize content. You can control cookies through your browser settings.
        </p>
        <p>
          We use the following types of cookies:
        </p>
        <ul>
          <li><strong>Essential Cookies:</strong> Necessary for the website to function properly</li>
          <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
          <li><strong>Functional Cookies:</strong> Enable enhanced functionality and personalization</li>
          <li><strong>Security Cookies:</strong> Used for security purposes in the donation process</li>
        </ul>
        
        <h2>8. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal information 
          against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access.
        </p>
        
        <h2>9. International Data Transfers</h2>
        <p>
          Your information may be transferred to and processed in countries other than the country in which you reside, 
          particularly to servers in the United States where PayPal processes payments. These countries may have data 
          protection laws that are different from those in your country. We ensure that adequate safeguards are in place 
          to protect your information when transferred internationally.
        </p>
        
        <h2>10. Children's Privacy</h2>
        <p>
          Our services are not directed to individuals under the age of 16. We do not knowingly collect personal information 
          from children. If you believe we have inadvertently collected information from a child, please contact us immediately.
        </p>
        
        <h2>11. Changes to this Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting 
          the new Privacy Policy on this page and updating the "Last Updated" date.
        </p>
        
        <h2>12. Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:<br />
          Email: mikulkal@atlas.cz
        </p>
        
        <h2>13. Data Controller</h2>
        <p>
          Leoš Mikulka<br />
          Krajinova 1006/88, Třebíč 674 01<br />
          IČ: 23078928
        </p>
      </div>
    </div>
  );
}