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
          <p className="font-medium">Last Updated: May 1, 2025</p>
          <p>This Privacy Policy describes how we collect, use, and disclose your personal information when you use our services.</p>
        </div>
        
        <h2>1. Information We Collect</h2>
        
        <h3>1.1 Information You Provide</h3>
        <p>We may collect the following types of information when you interact with our services:</p>
        <ul>
          <li><strong>Contact Information:</strong> Name, email address when you make a donation</li>
          <li><strong>Payment Information:</strong> We do not store your payment details. All payment processing is handled securely by our payment processor, Barion</li>
          <li><strong>Communication:</strong> Messages you send us via contact forms or email</li>
        </ul>
        
        <h3>1.2 Information Collected Automatically</h3>
        <p>When you visit our website, we automatically collect certain information about your device and usage:</p>
        <ul>
          <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
          <li><strong>Usage Data:</strong> Pages viewed, time spent on pages, referring websites, and click patterns</li>
          <li><strong>Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to enhance your experience</li>
        </ul>
        
        <h3>1.3 Barion Pixel</h3>
        <p>
          Our website uses Barion Pixel, a tracking tool provided by Barion Payment Inc., to help prevent fraud 
          and improve payment security. The Barion Pixel collects information about your browsing behavior, 
          device information, and transaction data to identify potentially fraudulent transactions.
        </p>
        <p>
          <strong>What data does Barion Pixel collect?</strong> The Barion Pixel may collect the following information:
        </p>
        <ul>
          <li>Browser information (type, version, language settings)</li>
          <li>Device information (type, operating system, screen resolution)</li>
          <li>IP address and approximate location</li>
          <li>Page interaction events (clicks, scrolls, form inputs)</li>
          <li>Session information (duration, pages visited)</li>
          <li>Referral information (where you came from)</li>
        </ul>
        <p>
          <strong>How is Barion Pixel data used?</strong> This data is used solely for fraud prevention, payment security, 
          and improving the payment experience. Barion processes this data in accordance with their privacy policy,
          which you can find at <a href="https://www.barion.com/en/privacy-policy/" target="_blank" rel="noopener noreferrer">https://www.barion.com/en/privacy-policy/</a>.
        </p>
        <p>
          <strong>Legal basis for processing:</strong> The legal basis for processing data through Barion Pixel is our legitimate 
          interest in securing online transactions and preventing fraud, as permitted under GDPR Article 6(1)(f).
        </p>
        
        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect for the following purposes:</p>
        <ul>
          <li>To provide and maintain our services</li>
          <li>To process donations and send receipts</li>
          <li>To respond to your inquiries and provide customer support</li>
          <li>To prevent fraudulent transactions (through Barion Pixel)</li>
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
          <li><strong>Payment Processors:</strong> We share transaction data with Barion to process donations</li>
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
          <li><strong>Security Cookies:</strong> Used to detect and prevent fraud in financial transactions</li>
        </ul>
        
        <h2>8. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal information 
          against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access.
        </p>
        
        <h2>9. International Data Transfers</h2>
        <p>
          Your information may be transferred to and processed in countries other than the country in which you reside. 
          These countries may have data protection laws that are different from those in your country. 
          We ensure that adequate safeguards are in place to protect your information when transferred internationally.
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