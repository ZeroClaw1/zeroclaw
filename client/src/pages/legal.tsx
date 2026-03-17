import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { openclawLogoSm } from "@/lib/logo";

const EFFECTIVE_DATE = "March 16, 2026";
const COMPANY = "ZeroClaw";
const CONTACT_EMAIL = "legal@zeroclaw.io";

/* ------------------------------------------------------------------ */
/*  Shared layout                                                      */
/* ------------------------------------------------------------------ */
function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="legal-page">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={openclawLogoSm} alt="ZeroClaw" className="h-5 w-auto" />
            <span className="text-sm font-bold">ZeroClaw</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="back-to-home">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="legal-title">{title}</h1>
        <p className="text-sm text-muted-foreground mb-12">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-invert prose-sm max-w-none
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-foreground
          [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-foreground
          [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-4
          [&_ul]:text-muted-foreground [&_ul]:space-y-1.5 [&_ul]:mb-4 [&_ul]:pl-5
          [&_li]:text-muted-foreground
          [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80
          [&_strong]:text-foreground [&_strong]:font-semibold
        ">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>&copy; 2026 {COMPANY}. All rights reserved.</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Terms of Service                                                   */
/* ------------------------------------------------------------------ */
export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        Welcome to {COMPANY}. These Terms of Service ("Terms") govern your access to and use of the {COMPANY} platform,
        website, APIs, and related services (collectively, the "Service"). By creating an account or using the Service,
        you agree to be bound by these Terms.
      </p>

      <h2>1. Definitions</h2>
      <ul>
        <li><strong>"Platform"</strong> means the {COMPANY} dashboard, workflow editor, APIs, CLI tools, and all associated services.</li>
        <li><strong>"User"</strong> means any individual or entity that creates an account on the Platform.</li>
        <li><strong>"Agent Skills"</strong> means reusable workflow components published on the {COMPANY} Marketplace.</li>
        <li><strong>"OpenClaw Instance"</strong> means a self-hosted OpenClaw runtime environment connected to the Platform by a User.</li>
        <li><strong>"Content"</strong> means any data, configurations, workflows, code, or materials uploaded or created through the Service.</li>
      </ul>

      <h2>2. Account Registration</h2>
      <p>
        To use the Service, you must create an account with accurate and complete information. You are responsible for
        maintaining the confidentiality of your account credentials and for all activities that occur under your account.
        You must be at least 13 years of age to use the Service.
      </p>

      <h2>3. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose or in violation of applicable laws</li>
        <li>Attempt to gain unauthorized access to other users' accounts or data</li>
        <li>Interfere with or disrupt the integrity or performance of the Service</li>
        <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
        <li>Use the Service to distribute malware, phishing content, or spam</li>
        <li>Publish Agent Skills that contain malicious code or violate third-party rights</li>
        <li>Circumvent any rate limits, usage quotas, or technical restrictions</li>
      </ul>

      <h2>4. Bring Your Own OpenClaw (BYOO)</h2>
      <p>
        The Platform allows you to connect your own OpenClaw runtime instance. When using BYOO:
      </p>
      <ul>
        <li>You are solely responsible for the security, maintenance, and operation of your OpenClaw instance</li>
        <li>{COMPANY} acts as a control plane and does not store or process data on your instance</li>
        <li>You are responsible for ensuring your instance complies with all applicable laws and regulations</li>
        <li>{COMPANY} is not liable for any data loss, breaches, or downtime on your self-hosted infrastructure</li>
      </ul>

      <h2>5. Subscriptions and Billing</h2>
      <p>
        Certain features of the Service require a paid subscription. By subscribing, you agree to pay all fees associated
        with your chosen plan. Subscriptions are billed monthly and renew automatically unless cancelled before the next
        billing cycle. All fees are non-refundable except as required by law or as expressly stated in these Terms.
      </p>
      <h3>5.1 Free Tier</h3>
      <p>
        The free tier provides limited access to the Platform. {COMPANY} reserves the right to modify the scope of free
        features at any time with reasonable notice.
      </p>
      <h3>5.2 Price Changes</h3>
      <p>
        {COMPANY} may change subscription prices with at least 30 days' written notice. Continued use of the Service
        after a price change constitutes acceptance of the new pricing.
      </p>

      <h2>6. Marketplace</h2>
      <p>
        The {COMPANY} Marketplace enables Users to publish and install Agent Skills. By publishing an Agent Skill:
      </p>
      <ul>
        <li>You grant {COMPANY} a non-exclusive, worldwide license to distribute your Agent Skill through the Marketplace</li>
        <li>You represent that you have all rights necessary to publish the Agent Skill</li>
        <li>You are responsible for maintaining and supporting your published Agent Skills</li>
        <li>Revenue sharing for paid Agent Skills is governed by the Marketplace Publisher Agreement</li>
      </ul>
      <p>
        {COMPANY} reserves the right to remove any Agent Skill that violates these Terms or the Marketplace guidelines.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        You retain all rights to Content you create or upload to the Service. {COMPANY} retains all rights to the Platform,
        including its design, code, branding, and documentation. By using the Service, you grant {COMPANY} a limited license
        to host, display, and transmit your Content solely to provide the Service.
      </p>

      <h2>8. Data and Security</h2>
      <p>
        {COMPANY} implements industry-standard security measures to protect your data. However, no system is completely
        secure, and {COMPANY} cannot guarantee absolute security. You are responsible for maintaining backups of your
        Content. Our handling of personal data is described in our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>9. Service Availability</h2>
      <p>
        {COMPANY} strives to maintain high availability but does not guarantee uninterrupted access to the Service.
        Scheduled maintenance windows will be communicated in advance. {COMPANY} is not liable for any downtime or
        service interruptions.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY} AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT
        BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
        REVENUE, DATA, OR BUSINESS OPPORTUNITIES ARISING FROM YOUR USE OF THE SERVICE.
      </p>
      <p>
        {COMPANY}'s total aggregate liability for any claims arising from these Terms or the Service shall not exceed
        the amount you paid to {COMPANY} in the twelve (12) months preceding the claim.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless {COMPANY} from any claims, damages, or expenses (including reasonable
        attorney's fees) arising from your use of the Service, your Content, your violation of these Terms, or your
        violation of any third-party rights.
      </p>

      <h2>12. Termination</h2>
      <p>
        Either party may terminate this agreement at any time. You may cancel your account through the Platform settings.
        {COMPANY} may suspend or terminate your access if you violate these Terms. Upon termination, your right to use
        the Service ceases immediately, and {COMPANY} may delete your Content after a 30-day grace period.
      </p>

      <h2>13. Changes to Terms</h2>
      <p>
        {COMPANY} may update these Terms from time to time. Material changes will be communicated via email or through
        the Platform at least 30 days before taking effect. Continued use of the Service after changes take effect
        constitutes acceptance of the updated Terms.
      </p>

      <h2>14. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the Province of Alberta, Canada, without regard to its conflict of laws
        principles. Any disputes arising from these Terms shall be resolved in the courts of Alberta, Canada.
      </p>

      <h2>15. Contact</h2>
      <p>
        If you have questions about these Terms, contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Privacy Policy                                                     */
/* ------------------------------------------------------------------ */
export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        {COMPANY} ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we
        collect, use, disclose, and safeguard your information when you use the {COMPANY} platform and related services
        (the "Service").
      </p>

      <h2>1. Information We Collect</h2>
      <h3>1.1 Information You Provide</h3>
      <ul>
        <li><strong>Account Information:</strong> Name, email address, and password when you create an account</li>
        <li><strong>Billing Information:</strong> Payment method details processed through our third-party payment processor</li>
        <li><strong>Profile Information:</strong> Optional details such as organization name, role, and avatar</li>
        <li><strong>Content:</strong> Workflow configurations, agent settings, pipeline definitions, and other data you create through the Service</li>
        <li><strong>Communications:</strong> Messages you send to our support team or feedback you provide</li>
      </ul>

      <h3>1.2 Information Collected Automatically</h3>
      <ul>
        <li><strong>Usage Data:</strong> Pages visited, features used, interactions with the workflow editor, and session duration</li>
        <li><strong>Device Information:</strong> Browser type, operating system, screen resolution, and device identifiers</li>
        <li><strong>Log Data:</strong> IP address, access times, referring URLs, and API request logs</li>
        <li><strong>Cookies and Similar Technologies:</strong> Session cookies for authentication and preferences. We do not use third-party tracking cookies</li>
      </ul>

      <h3>1.3 Information from Third Parties</h3>
      <ul>
        <li><strong>GitHub Integration:</strong> When you connect your GitHub account, we access repository names, commit metadata, and workflow run statuses as authorized by your OAuth scope</li>
        <li><strong>OpenClaw Instance Data:</strong> Connection metadata (endpoint URL, health status) from your self-hosted OpenClaw runtime. We do not access or store data processed by your instance</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve the Service</li>
        <li>Process transactions and manage your subscription</li>
        <li>Send transactional notifications (account confirmations, billing receipts, security alerts)</li>
        <li>Monitor and analyze usage patterns to improve user experience</li>
        <li>Detect, prevent, and address security incidents and abuse</li>
        <li>Comply with legal obligations</li>
        <li>Provide customer support</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your personal information to third parties. We do <strong>not</strong> use your
        Content to train machine learning models.
      </p>

      <h2>3. Bring Your Own OpenClaw (BYOO) Data</h2>
      <p>
        When you connect your own OpenClaw instance, {COMPANY} functions as a control plane. This means:
      </p>
      <ul>
        <li>Your agent execution data stays on your infrastructure</li>
        <li>We only receive connection metadata needed to display status in the dashboard</li>
        <li>We do not access, read, or store the payloads processed by your agents</li>
        <li>You are the data controller for all data on your self-hosted instance</li>
      </ul>

      <h2>4. Data Sharing and Disclosure</h2>
      <p>We may share your information with:</p>
      <ul>
        <li><strong>Service Providers:</strong> Third-party vendors who assist in operating the Service (hosting, payment processing, analytics). These providers are contractually bound to protect your data</li>
        <li><strong>Marketplace Users:</strong> If you publish Agent Skills, your publisher name and profile information are visible to other users</li>
        <li><strong>Legal Requirements:</strong> When required by law, subpoena, or governmental request</li>
        <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with prior notice</li>
        <li><strong>With Your Consent:</strong> For any purpose you explicitly authorize</li>
      </ul>

      <h2>5. Data Retention</h2>
      <ul>
        <li><strong>Account Data:</strong> Retained for the duration of your account plus 30 days after deletion</li>
        <li><strong>Usage and Log Data:</strong> Retained for up to 12 months, then aggregated or deleted</li>
        <li><strong>Billing Records:</strong> Retained as required by applicable tax and financial regulations</li>
        <li><strong>Marketplace Content:</strong> Published Agent Skills remain available until you unpublish them or your account is terminated</li>
      </ul>

      <h2>6. Data Security</h2>
      <p>
        We implement industry-standard security measures including encryption in transit (TLS 1.3), encryption at rest
        (AES-256), access controls, regular security audits, and vulnerability monitoring. Despite these measures, no
        method of electronic transmission or storage is 100% secure.
      </p>

      <h2>7. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
        <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
        <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements</li>
        <li><strong>Portability:</strong> Request your data in a structured, machine-readable format</li>
        <li><strong>Objection:</strong> Object to certain processing activities</li>
        <li><strong>Withdrawal of Consent:</strong> Withdraw consent where processing is based on consent</li>
      </ul>
      <p>
        To exercise these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will respond
        within 30 days.
      </p>

      <h2>8. Canadian Privacy Compliance</h2>
      <p>
        {COMPANY} is based in Alberta, Canada, and complies with the Personal Information Protection and Electronic
        Documents Act (PIPEDA) and Alberta's Personal Information Protection Act (PIPA). Your data may be stored and
        processed in Canada and other jurisdictions where our service providers operate, subject to appropriate safeguards.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>
        The Service is not directed to children under 13. We do not knowingly collect personal information from children
        under 13. If you believe a child has provided us with personal information, please contact us and we will
        promptly delete it.
      </p>

      <h2>10. Cookies</h2>
      <p>
        We use only essential cookies required for authentication and session management. We do not use advertising or
        third-party tracking cookies. You can control cookies through your browser settings, but disabling essential
        cookies may prevent you from using certain features of the Service.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be communicated via email or through
        the Platform at least 30 days before taking effect. The "Effective date" at the top of this page indicates when
        the policy was last revised.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        If you have questions or concerns about this Privacy Policy or our data practices, contact us at:
      </p>
      <p>
        <strong>{COMPANY}</strong><br />
        Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br />
        Alberta, Canada
      </p>
    </LegalLayout>
  );
}
