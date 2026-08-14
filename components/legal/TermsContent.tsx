import { LegalDocument } from "./LegalDocument";

export function TermsContent() {
  return (
    <LegalDocument title="TEEVO TERMS & CONDITIONS" lastUpdated="02/04/2026">
      <h2>1. INTRODUCTION</h2>
      <p>Welcome to Teevo (“Teevo”, “we”, “us”, “our”).</p>
      <p>
        Teevo operates an online peer-to-peer marketplace that enables users to buy and sell golf-related items. Teevo
        acts solely as an intermediary platform facilitating transactions between users.
      </p>
      <p>By accessing or using Teevo, you agree to be bound by these Terms & Conditions (“Terms”).</p>

      <h2>2. NATURE OF THE PLATFORM</h2>
      <ul>
        <li>Teevo is a peer-to-peer marketplace</li>
        <li>Contracts are formed directly between buyer and seller</li>
        <li>Teevo is not a party to transactions</li>
        <li>Teevo does not own, inspect, or take possession of items listed</li>
      </ul>
      <p>Teevo’s role is strictly limited to:</p>
      <ul>
        <li>Providing the platform</li>
        <li>Facilitating payments via Stripe</li>
        <li>Enabling shipping via third-party providers such as Shippo and DPD</li>
      </ul>

      <h2>3. ELIGIBILITY</h2>
      <ul>
        <li>Users must be 18 years or older</li>
        <li>Users must be located in the United Kingdom</li>
        <li>Both individuals and businesses may use Teevo</li>
      </ul>
      <p>By using Teevo, you confirm you meet these requirements.</p>

      <h2>4. USER ACCOUNTS</h2>
      <h3>You agree to:</h3>
      <ul>
        <li>Provide accurate information</li>
        <li>Keep your account secure</li>
        <li>Not impersonate others</li>
      </ul>
      <h3>Teevo may:</h3>
      <ul>
        <li>Suspend or terminate accounts at its sole discretion</li>
        <li>Remove listings or restrict access without notice</li>
      </ul>

      <h2>5. LISTINGS & SELLER OBLIGATIONS</h2>
      <h3>Sellers must:</h3>
      <ul>
        <li>Accurately describe items</li>
        <li>Provide truthful images</li>
        <li>Disclose defects or wear</li>
        <li>Ensure items are authentic (including serial number verification where applicable)</li>
      </ul>
      <h3>Prohibited listings include:</h3>
      <ul>
        <li>Counterfeit goods</li>
        <li>Stolen items</li>
        <li>Illegal or restricted goods</li>
      </ul>
      <h3>Teevo reserves the right to:</h3>
      <ul>
        <li>Remove any listing without explanation</li>
        <li>Enforce compliance at its sole discretion</li>
      </ul>

      <h2>6. FEES & PAYMENTS</h2>
      <ul>
        <li>Teevo charges a flat 8% fee, payable by the buyer</li>
        <li>Payments are processed via Stripe</li>
        <li>Funds are held in escrow until completion of the transaction</li>
      </ul>
      <h3>Seller payout occurs:</h3>
      <ul>
        <li>Upon buyer confirmation of delivery, OR</li>
        <li>Automatically after 48 hours if no issue is raised</li>
      </ul>

      <h2>7. SHIPPING</h2>
      <p>Shipping is facilitated through third-party providers such as:</p>
      <ul>
        <li>Shippo</li>
        <li>DPD</li>
      </ul>
      <h3>Key principles:</h3>
      <ul>
        <li>Sellers are responsible for dispatching items</li>
        <li>Buyers are responsible for providing correct delivery details</li>
      </ul>
      <h3>Risk & Liability:</h3>
      <p>Once shipped, responsibility lies with:</p>
      <ul>
        <li>The courier for delivery</li>
        <li>The seller for correct packaging</li>
      </ul>
      <h3>Teevo is not responsible for:</h3>
      <ul>
        <li>Lost items</li>
        <li>Damaged items</li>
        <li>Delivery delays</li>
      </ul>

      <h2>8. BUYER PROTECTION & DISPUTES</h2>
      <p>Teevo provides a dispute resolution process, but does not guarantee outcomes.</p>
      <h3>8.1 Raising a Dispute</h3>
      <p>Buyers must report issues within 48 hours of delivery</p>
      <h3>8.2 Valid Disputes May Include:</h3>
      <ul>
        <li>Item not received</li>
        <li>Item significantly not as described</li>
      </ul>
      <h3>8.3 Evidence Requirements</h3>
      <p>Buyers must provide sufficient evidence, including:</p>
      <ul>
        <li>Photos</li>
        <li>Tracking information</li>
        <li>Supporting documentation</li>
      </ul>
      <h3>8.4 Resolution</h3>
      <p className="font-semibold text-mowing-green mt-2 mb-0">Teevo may:</p>
      <ul>
        <li>Review evidence and make a determination</li>
        <li>Request further information</li>
        <li>Refer issues to the courier for investigation</li>
      </ul>
      <h3>8.5 Important</h3>
      <ul>
        <li>The burden of proof lies with the buyer</li>
        <li>Teevo is not obligated to issue refunds</li>
        <li>Courier investigations may be required before any resolution</li>
      </ul>

      <h2>9. ORDER CANCELLATIONS</h2>
      <ul>
        <li>Sellers must dispatch orders by the dispatch date shown on the sale</li>
        <li>
          If a seller does not dispatch by that deadline, Teevo may automatically cancel the order and
          refund the buyer in full
        </li>
        <li>
          A seller may ask the buyer for additional dispatch time. Extra time only applies if the buyer
          approves it before the existing deadline
        </li>
        <li>
          Generating a shipping label or QR code does not make the sale final until the item has been
          dispatched
        </li>
      </ul>

      <h2>10. USER CONDUCT</h2>
      <h3>Users must not:</h3>
      <ul>
        <li>Attempt to transact outside Teevo</li>
        <li>Share personal contact details to bypass fees</li>
        <li>Engage in fraud, abuse, or harassment</li>
      </ul>
      <h3>Teevo may:</h3>
      <ul>
        <li>Monitor communications</li>
        <li>Suspend accounts for violations</li>
      </ul>

      <h2>11. THIRD-PARTY SERVICES</h2>
      <p>Teevo relies on third-party providers including:</p>
      <ul>
        <li>Stripe (payments)</li>
        <li>Shippo (shipping)</li>
        <li>DPD (delivery)</li>
        <li>Supabase (infrastructure)</li>
        <li>Google Analytics (analytics)</li>
        <li>Netlify (hosting)</li>
        <li>Resend (communications)</li>
      </ul>
      <h3>Teevo is not liable for:</h3>
      <ul>
        <li>Failures, delays, or errors caused by these providers</li>
      </ul>

      <h2>12. INTELLECTUAL PROPERTY</h2>
      <ul>
        <li>Users retain ownership of their content</li>
        <li>
          By listing on Teevo, you grant Teevo a worldwide, non-exclusive licence to:
          <ul>
            <li>Use images and content for marketing</li>
            <li>Promote listings and the platform</li>
          </ul>
        </li>
      </ul>

      <h2>13. LIABILITY (CRITICAL)</h2>
      <h3>To the fullest extent permitted by law:</h3>
      <h3>Teevo disclaims all liability for:</h3>
      <ul>
        <li>Transactions between users</li>
        <li>Losses arising from purchases or sales</li>
        <li>Misrepresentation by users</li>
        <li>Teevo provides the platform “as is”</li>
      </ul>
      <h3>Teevo’s total liability (if any) is limited to:</h3>
      <ul>
        <li>The fees paid to Teevo for that transaction</li>
      </ul>

      <h2>14. INDEMNITY</h2>
      <p>You agree to indemnify Teevo against:</p>
      <ul>
        <li>Claims arising from your use of the platform</li>
        <li>Breaches of these Terms</li>
        <li>Disputes with other users</li>
      </ul>

      <h2>15. CHANGES TO THE SERVICE</h2>
      <h3>Teevo may:</h3>
      <ul>
        <li>Modify or discontinue features</li>
        <li>Introduce new services (including AI tools, authentication services, premium features)</li>
      </ul>
      <p>At any time, without liability.</p>

      <h2>16. GOVERNING LAW</h2>
      <p>These Terms are governed by the laws of England and Wales.</p>
      <p>Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

      <h2>17. CONTACT</h2>
      <p>For support, contact:</p>
      <p>
        <a href="mailto:hello@teevohq.com">hello@teevohq.com</a>
      </p>
    </LegalDocument>
  );
}
