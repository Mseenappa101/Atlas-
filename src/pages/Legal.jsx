import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { site } from '../lib/site';
import { Page, Eyebrow, H1, Figure } from '../components/marketing/kit';
import { Stamp, Docket } from '../components/marketing/judiciary';
import Reveal from '../components/motion/Reveal';

const UPDATED = 'October 20, 2026';
// Flip to true once Michael (and ideally a lawyer) has reviewed these pages; it removes the draft banner.
const REVIEWED = false;

function Contact() {
  return site.contactEmail ? (
    <a href={`mailto:${site.contactEmail}`} className="text-brand hover:underline">{site.contactEmail}</a>
  ) : (
    'the contact address on this page'
  );
}

// Shared judiciary masthead + document wrapper. `title` sets the document title and the Cinzel H1;
// `docket` is the case-caption label under the eyebrow; `plate`/`plateAlt` render the judicial plate.
function LegalDoc({ title, docket, plate, plateAlt, children }) {
  useEffect(() => {
    document.title = `${title} — Firmward`;
  }, [title]);
  return (
    <Page narrow>
      {!REVIEWED && (
        <p className="mb-6 rounded-app border-2 border-dashed border-st-soon-text bg-st-soon-bg px-3 py-2 text-t14 font-semibold text-st-soon-text">DRAFT FOR REVIEW. Not final.</p>
      )}
      <header>
        <div className="mb-4 float-none md:float-right md:ml-8 md:mb-0">
          <Stamp label="On Record" sub="Firmward" />
        </div>
        <Eyebrow>{docket}</Eyebrow>
        <Docket>{title}</Docket>
        <H1>{title}</H1>
        <p className="mt-3 font-serif text-t14 italic text-fg-2">Last updated {UPDATED}</p>
      </header>
      <Figure slug={plate} alt={plateAlt} />
      <div className="text-t16 leading-relaxed [&_a:not(.text-brand)]:text-brand [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </Page>
  );
}

// A themed legal section: a brass register rule above a carved Cinzel heading, faded up once.
function LegalSection({ title, children }) {
  return (
    <Reveal as="section" className="mt-12 md:mt-14">
      <div className="mb-3 h-px w-full max-w-[20rem] bg-brass/40" aria-hidden="true" />
      <h2 className="font-display text-t20 font-semibold uppercase tracking-[0.01em] md:text-[26px]">{title}</h2>
      <div className="mt-4">{children}</div>
    </Reveal>
  );
}

export function Privacy() {
  return (
    <LegalDoc
      title="Privacy Policy"
      docket="Privacy"
      plate="about"
      plateAlt="Carved judicial plate — the record keeper's desk"
    >
      <Reveal as="div">
        <p>
          Firmward (&ldquo;we&rdquo;) runs firmward.org, a directory of law firms that hire law students and a workspace for applying to them. This policy explains what we collect, why, and the choices you have.
        </p>
      </Reveal>

      <LegalSection title="What we collect">
        <ul>
          <li><strong>Your profile:</strong> name, email address, law school, class year, and the markets and firm types you choose.</li>
          <li><strong>Your application materials:</strong> resumes you upload or build, cover letters, transcripts, writing samples and other files you add.</li>
          <li><strong>Your application activity:</strong> firms you save, stages, notes, deadlines, checklists, and the emails you send to firms through Firmward (recipient, subject, message and attachment names).</li>
          <li><strong>Billing:</strong> if you subscribe to Pro, our payment processor, Stripe, handles your card. We receive your subscription status, not your card number.</li>
          <li><strong>Forms you fill in:</strong> your email, and if you give them, your name, class year, the role you’re looking for, and your answers on the Placement application. We also record which page and campaign link (UTM tags) brought you, so we know which channels work.</li>
          <li><strong>Basic technical data:</strong> server logs with request times and errors, and a one-way hash of your IP address used only to stop spam and abuse.</li>
          <li><strong>Analytics:</strong> we use Plausible, which counts visits and clicks without cookies and without tracking you across sites.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use it">
        <ul>
          <li>To run your account, save your progress and show your list on any device you sign in on.</li>
          <li>To prepare and send the applications you ask us to send.</li>
          <li>To write AI drafts you request (Pro or your free sample letter). Your resume and the firm&rsquo;s details are sent to our AI provider, Anthropic, only to produce that draft.</li>
          <li>To email you about Firmward, including the recruiting calendar, workshop reminders and our newsletter. You can unsubscribe at any time from any email or your account page.</li>
          <li>To run coaching you sign up for: the Sprint, Membership and the Placement, including reviewing the materials you share with us.</li>
        </ul>
        <p>We do not sell your personal information, and we do not share it with law firms except what you choose to send them.</p>
      </LegalSection>

      <LegalSection title="Connecting Gmail or Outlook">
        <p>
          You can connect a Gmail or Microsoft account so applications go out from your own address. We ask only for permission to <strong>send email on your behalf</strong> and to know your email address. We cannot read, search, delete or change the email in your inbox.
        </p>
        <ul>
          <li>We send an email only when you press Send in Firmward, to the recipients you entered, with the attachments you chose.</li>
          <li>We store an encrypted access token so you don&rsquo;t have to reconnect for each application. We keep a record of each email you send through Firmward so you can see it in your application history.</li>
          <li>You can disconnect at any time from your account page. That deletes the token, and for Google also withdraws the permission. You can also remove access from your Google or Microsoft account settings.</li>
        </ul>
        <p>
          Firmward&rsquo;s use and transfer of information received from Google APIs adheres to the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We do not use Google user data for advertising, we do not sell it, and no person at Firmward reads it except with your permission, for security, or to comply with the law.
        </p>
      </LegalSection>

      <LegalSection title="Who processes data for us">
        <p>
          Supabase (database, sign-in and file storage), Vercel and Railway (hosting), Resend (email delivery and our email list), Stripe (payments), Skool (the Sprint and Membership community), our scheduling tool (strategy calls), Zoom (workshops), Plausible (analytics), Anthropic (AI drafts), and Google or Microsoft if you connect your email. Each handles data only to provide its service to us.
        </p>
      </LegalSection>

      <LegalSection title="Keeping and deleting your data">
        <p>
          We keep your data while your account is open. To delete your account and everything in it, email us at <Contact />. We&rsquo;ll delete it within 30 days, except records we must keep for tax or legal reasons.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Data is sent over HTTPS. Each student can see only their own records, and email access tokens are encrypted at rest. No system is perfectly secure, so please use a strong, unique password.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          If we change this policy in a way that matters, we&rsquo;ll update the date above and tell you by email. Questions: <Contact />.
        </p>
        <p className="text-t14 text-fg-2">
          See also our <Link to="/terms" className="text-brand hover:underline">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}

export function Terms() {
  return (
    <LegalDoc
      title="Terms of Service"
      docket="Terms"
      plate="placement"
      plateAlt="Carved judicial plate — the bar of hiring"
    >
      <Reveal as="div">
        <p>By creating a Firmward account or using firmward.org, you agree to these terms.</p>
      </Reveal>

      <LegalSection title="What Firmward is">
        <p>
          Firmward is a directory of law firms and legal employers that hire law students and new grads, with tools to track and send applications, and paid coaching (the Sprint, Membership and the Placement). Firm information is gathered from public sources and may be incomplete or out of date. Always confirm deadlines and requirements with the employer. Firmward is not affiliated with any law school or law firm.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You need to give accurate information and keep your password private. You&rsquo;re responsible for activity on your account. Firmward is for law students, new grads and their families, using it for the student&rsquo;s own job search.
        </p>
      </LegalSection>

      <LegalSection title="Sending applications">
        <ul>
          <li>You are the sender of every application you send through Firmward, whether from your connected email or from Firmward&rsquo;s address on your behalf.</li>
          <li>Only send applications that are truthful and that you have the right to send. Don&rsquo;t use Firmward to send bulk, unsolicited, misleading or harassing email.</li>
          <li>We limit how many emails an account can send per day and may suspend sending if it&rsquo;s misused.</li>
          <li>Delivery isn&rsquo;t guaranteed, and firms decide on their own whether and how to respond.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          Your resume, letters and files stay yours. You let us store and process them to provide the service, including sending them where you direct. AI drafts are suggestions; review them before you send anything.
        </p>
      </LegalSection>

      <LegalSection title="Coaching and paid plans">
        <p>
          Firmward provides career coaching and application support only. It is not legal advice, and no attorney-client relationship is formed. We don&rsquo;t guarantee any job outcome: interviews, offers and hiring decisions are made by employers.
        </p>
        <ul>
          <li><strong>20-Firm Sprint:</strong> a one-time payment for a 5-day cohort. It isn&rsquo;t refundable once Day 1 of your cohort has started. Before then, contact us and we&rsquo;ll refund or move you to a later cohort.</li>
          <li><strong>Membership:</strong> billed monthly or yearly through Skool until you cancel. You can cancel anytime; access continues to the end of the period you paid for.</li>
          <li><strong>90-Day Placement:</strong> a 90-day term billed monthly, which then continues month to month until you cancel or accept an offer. The activity guarantee (at least 75 firms contacted in 90 days, or work continues at no charge until they are) is the only guarantee; there is no guarantee of a job.</li>
          <li><strong>Pro:</strong> $4.99 a month for the AI tools on firmward.org, billed by Stripe until you cancel from Plan and billing.</li>
        </ul>
        <p>
          You send every application and email yourself, from your own account or as yourself through Firmward. You&rsquo;re responsible for checking that what you send is accurate. Fees already paid aren&rsquo;t refunded except as stated above or where the law requires.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Don&rsquo;t scrape or copy the directory in bulk, try to get into other people&rsquo;s accounts, interfere with the service, or use it for anything unlawful. We may suspend accounts that do.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers and liability">
        <p>
          Firmward is provided &ldquo;as is&rdquo;, without warranties of any kind. To the extent the law allows, Firmward isn&rsquo;t liable for indirect or consequential losses, or for missed deadlines or hiring outcomes. Our total liability is limited to what you paid us in the 12 months before the claim.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update these terms and will change the date above when we do. Continuing to use Firmward after a change means you accept it. Questions: <Contact />.
        </p>
        <p className="text-t14 text-fg-2">
          See also our <Link to="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}

export function Disclaimer() {
  return (
    <LegalDoc
      title="Disclaimer"
      docket="Disclaimer"
      plate="about"
      plateAlt="Carved judicial plate — the standing notice"
    >
      <Reveal as="div">
        <p><strong>Not legal advice.</strong> Firmward provides career coaching and application support, not legal advice. Nothing on this site or in our coaching creates an attorney-client relationship.</p>
        <p><strong>No guaranteed outcomes.</strong> We help you find employers and prepare and send strong applications. Employers decide who to interview and hire. We don&rsquo;t guarantee interviews, offers, salaries or any other result. The Placement&rsquo;s activity guarantee is about the number of firms contacted, not about jobs.</p>
        <p><strong>You send everything.</strong> Students send all applications and outreach themselves, from their own email or as themselves through Firmward. Review everything before you send it.</p>
        <p><strong>Firm information.</strong> Hiring roles, windows, contacts and postings come from public sources such as firms&rsquo; careers pages, checked on a schedule. They can be incomplete or out of date. Confirm details with the employer before relying on them.</p>
        <p><strong>No affiliation.</strong> Firmward isn&rsquo;t affiliated with, endorsed by or sponsored by any law school, law firm or employer listed. Names are used only to identify employers. Michael&rsquo;s schools and employer are mentioned as facts about his background, not as endorsements.</p>
        <p>Questions: <Contact />.</p>
      </Reveal>
    </LegalDoc>
  );
}
