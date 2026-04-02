import { LegalDocument } from "./LegalDocument";

export function PrivacyContent() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated="02/04/2026">
      <p>Welcome to Teevo.</p>
      <p>
        Teevo is a marketplace designed specifically for golfers. This Privacy Policy explains how we collect, use, and
        protect your personal data when you use our platform.
      </p>
      <p>By using Teevo, you agree to the terms of this Privacy Policy.</p>

      <h2>1. Who We Are</h2>
      <p>Teevo is operated by Teevo Limited (“Teevo”, “we”, “us”, “our”).</p>
      <p>If you have any questions about this policy or your data, you can contact us at:</p>
      <p>
        <span aria-hidden>📧 </span>
        <a href="mailto:hello@teevohq.com">hello@teevohq.com</a>
      </p>

      <h2>2. The Data We Collect</h2>
      <p>We collect the following types of personal data:</p>
      <h3>Account Information</h3>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Username (automatically generated)</li>
        <li>Date of birth</li>
      </ul>
      <h3>Profile Information</h3>
      <ul>
        <li>Profile photo</li>
        <li>Location (e.g. city or postcode)</li>
      </ul>
      <h3>Transaction Data</h3>
      <ul>
        <li>Listings you create (item details, pricing, descriptions, images)</li>
        <li>Purchase and sales history</li>
        <li>Communications between users (including messages)</li>
      </ul>
      <h3>Payment Information</h3>
      <p>Payments are processed securely via Stripe.</p>
      <p>
        We do not store your payment details (such as card numbers or bank details). Stripe may collect and process your
        payment data in accordance with their own privacy policy.
      </p>
      <h3>Delivery Information</h3>
      <ul>
        <li>Name</li>
        <li>Shipping address</li>
        <li>Contact details required for delivery</li>
      </ul>
      <h3>Technical Data (Automatically Collected)</h3>
      <p>When you use Teevo, we may collect:</p>
      <ul>
        <li>IP address</li>
        <li>Device and browser type</li>
        <li>Usage data (pages visited, actions taken)</li>
        <li>Cookies and similar technologies (see Section 9)</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <p>We use your data to:</p>
      <ul>
        <li>Create and manage your account</li>
        <li>Enable buying and selling on the platform</li>
        <li>Process payments and payouts</li>
        <li>Facilitate communication between users</li>
        <li>Arrange shipping and delivery</li>
        <li>Prevent fraud and ensure platform safety</li>
        <li>Verify product authenticity (e.g. serial number checks)</li>
        <li>Improve and optimise the platform</li>
        <li>Send service-related communications</li>
        <li>Send marketing communications (see Section 7)</li>
      </ul>

      <h2>4. Messaging and Content</h2>
      <p>Teevo allows users to communicate via in-platform messaging.</p>
      <p>Messages are stored to enable transactions and support.</p>
      <p>We may review or monitor messages where necessary to:</p>
      <ul>
        <li>Prevent fraud or abuse</li>
        <li>Enforce our terms</li>
        <li>Ensure platform safety</li>
      </ul>
      <p>We do not use private messages for marketing purposes.</p>

      <h2>5. Sharing Your Data</h2>
      <p>We only share your data where necessary to operate Teevo.</p>
      <h3>Service Providers</h3>
      <p>We work with trusted third parties, including:</p>
      <ul>
        <li>Stripe (payments and payouts)</li>
        <li>Shippo (shipping services)</li>
        <li>Delivery partners such as DPD</li>
        <li>Supabase (database and authentication)</li>
        <li>Resend (transactional emails)</li>
        <li>Google Analytics (usage analytics)</li>
        <li>Netlify (website hosting)</li>
      </ul>
      <p>These providers only process your data on our behalf and under strict contractual obligations.</p>
      <h3>Between Users</h3>
      <p>
        When you buy or sell an item, we share necessary information (such as name and delivery address) with the other
        party to complete the transaction.
      </p>

      <h2>6. Legal Basis for Processing</h2>
      <p>Under UK GDPR, we rely on the following legal bases:</p>
      <ul>
        <li>Contractual necessity – to provide the Teevo platform</li>
        <li>Legitimate interests – to improve the service and prevent fraud</li>
        <li>Legal obligations – for compliance (e.g. financial regulations)</li>
        <li>Consent – for marketing communications</li>
      </ul>

      <h2>7. Marketing Communications</h2>
      <p>We may send you emails about:</p>
      <ul>
        <li>Platform updates</li>
        <li>New features</li>
        <li>Relevant promotions</li>
      </ul>
      <p>You can opt out at any time by:</p>
      <ul>
        <li>Clicking “unsubscribe” in emails</li>
        <li>Contacting us directly</li>
      </ul>

      <h2>8. Data Retention</h2>
      <p>We retain your data only as long as necessary.</p>
      <p>Typical retention periods:</p>
      <ul>
        <li>Account data: retained while your account is active</li>
        <li>Transaction data: retained for 6 years (legal and tax requirements)</li>
        <li>Messages: retained for up to 2 years for support and safety</li>
        <li>Technical data: retained for analytics purposes (typically 12–26 months)</li>
      </ul>
      <p>We may retain data longer where required by law or to resolve disputes.</p>

      <h2>9. Cookies</h2>
      <p>We use cookies and similar technologies to:</p>
      <ul>
        <li>Ensure the platform functions properly</li>
        <li>Analyse usage and improve performance</li>
        <li>Enhance user experience</li>
      </ul>
      <p>We plan to implement a cookie consent tool as the platform evolves.</p>

      <h2>10. Your Rights</h2>
      <p>Under UK GDPR, you have the right to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Restrict or object to processing</li>
        <li>Request data portability</li>
      </ul>
      <p>
        You can exercise these rights by contacting us at{" "}
        <a href="mailto:hello@teevohq.com">hello@teevohq.com</a>.
      </p>
      <p>You also have the right to lodge a complaint with the UK Information Commissioner’s Office (ICO).</p>

      <h2>11. Data Security</h2>
      <p>
        We take data security seriously and implement appropriate technical and organisational measures to protect your
        information.
      </p>
      <p>However, no system is completely secure, and we cannot guarantee absolute security.</p>

      <h2>12. Age Restrictions</h2>
      <p>Teevo is intended for users aged 18 and over only.</p>
      <p>We do not knowingly collect data from individuals under 18.</p>

      <h2>13. Geographic Scope</h2>
      <p>Teevo currently operates in the United Kingdom.</p>

      <h2>14. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time.</p>
      <p>We will notify users of significant changes where appropriate.</p>
    </LegalDocument>
  );
}
