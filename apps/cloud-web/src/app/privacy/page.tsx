import type { Metadata } from "next";
import { PublicShell } from "../public-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — AuthAI",
  description:
    "Privacy Policy for AuthAI, operated by Interface Labs Ltd. What data we collect, how we use it, and why we never see the AI provider tokens you trust us with.",
};

export default function PrivacyPage() {
  return (
    <PublicShell breadcrumb="Privacy Policy">
      <span className="public-eyebrow">Privacy Policy</span>
      <h1>Privacy Policy</h1>
      <p className="public-updated">Last updated: 8 June 2026</p>

      <p className="public-lead">
        This Privacy Policy explains how Interface Labs Ltd
        (&ldquo;Interface Labs&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
        collects, uses, and protects personal data when you use AuthAI.
        We&apos;re a company registered in England and Wales, with our
        registered office at 124 City Road, London, England, EC1V 2NX.
        For the purposes of UK GDPR, Interface Labs is the data
        controller for personal data we collect about builders signing
        in to AuthAI Cloud and end users authenticating through it.
      </p>

      <Section n={1} title="What we collect">
        <p>We collect the following categories of personal data:</p>
        <ul>
          <li>
            <strong>Builder account data</strong> — your GitHub user ID,
            login, and primary email (when public on your GitHub
            profile). Used to identify which apps belong to you.
          </li>
          <li>
            <strong>App metadata</strong> — the name and origin URL of
            each app you register, a one-way fingerprint of its secret
            (we never store the secret itself), and usage limits.
          </li>
          <li>
            <strong>End-user identity tags</strong> — when one of your
            users signs in through your app with their ChatGPT, Grok,
            or Copilot account, we store a scrambled tag that
            represents them. We can&apos;t reverse it back to a real
            account, but the same person stays a stable opaque ID
            across visits.
          </li>
          <li>
            <strong>Encrypted AI tokens</strong> — the access tokens
            your users get from ChatGPT, Grok, or Copilot are
            encrypted before they reach our servers. We hold encrypted
            blobs only. The keys that would unlock them live in your
            users&apos; browsers, never on our infrastructure.
          </li>
          <li>
            <strong>Audit events</strong> — app creation, key
            rotation, revocation, and similar operational events,
            with timestamps and the actor who performed them.
          </li>
          <li>
            <strong>Request logs</strong> — for at most 14 days: when
            a request happened, which app it belonged to, which AI
            provider, response code, and the client&apos;s IP address.
            Used to debug abuse and rate-limit issues; not used for
            analytics or marketing.
          </li>
        </ul>
        <p
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderLeft: "3px solid var(--accent)",
            background: "var(--surface-muted)",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          Want the technical details — encryption primitives, key
          locations, threat model? See the{" "}
          <a href="/docs/security">Security model</a> page.
        </p>
      </Section>

      <Section n={2} title="What we do NOT collect">
        <p>
          We deliberately have no way to see:
        </p>
        <ul>
          <li>
            <strong>The content of any AI conversation.</strong>{" "}
            Prompts and replies stream directly from the AI provider
            to your backend; the relay forwards the bytes without
            looking inside them.
          </li>
          <li>
            <strong>Your users&apos; AI provider passwords or tokens.</strong>{" "}
            Even if our database were leaked tomorrow, the encrypted
            blobs in it can&apos;t be unlocked without keys that only
            live in your users&apos; own browsers.
          </li>
          <li>
            <strong>Payment information.</strong> AuthAI Cloud is
            free; we don&apos;t process payments and have no payment
            data to lose.
          </li>
        </ul>
      </Section>

      <Section n={3} title="How we use it">
        <p>We use the data above to:</p>
        <ul>
          <li>
            Operate the service — route your requests to the right
            tenant, enforce rate limits, and let you manage your apps
          </li>
          <li>
            Investigate abuse or security incidents (the 14-day request
            log retention exists for this purpose only)
          </li>
          <li>
            Send you transactional emails (e.g. security incident
            notifications). We do not send marketing emails.
          </li>
        </ul>
      </Section>

      <Section n={4} title="Where it lives">
        <p>
          AuthAI Cloud is hosted on Hetzner in Falkenstein, Germany.
          Personal data sits in a managed database on the same private
          network. The encrypted AI-provider tokens live in that
          database too, but can&apos;t be unlocked without keys that we
          never see.
        </p>
      </Section>

      <Section n={5} title="Sharing">
        <p>
          We do not sell personal data and we do not share it with
          advertisers. We share data only with:
        </p>
        <ul>
          <li>
            <strong>OAuth providers</strong> (OpenAI, xAI, GitHub) — when
            an end user signs in, the relay forwards the OAuth handshake
            to the provider on their behalf. The provider receives the
            data it needs to issue tokens.
          </li>
          <li>
            <strong>Infrastructure providers</strong> — Hetzner (hosting)
            processes data on our behalf under a data processing
            agreement.
          </li>
          <li>
            <strong>Law enforcement</strong> — only when legally compelled
            by a valid order under UK law. We will challenge overbroad
            requests where appropriate.
          </li>
        </ul>
      </Section>

      <Section n={6} title="Your rights under UK GDPR">
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>
            Delete your data — revoke an app from your dashboard and
            the app, plus every end-user record tied to it, is
            deleted. We destroy the encryption key for those records
            first, so even a recovered backup would be unreadable.
          </li>
          <li>Object to processing or restrict it</li>
          <li>Lodge a complaint with the UK Information Commissioner&apos;s Office (ICO)</li>
        </ul>
        <p>
          Contact us at{" "}
          <a href="mailto:support@authai.io">support@authai.io</a> to
          exercise any of these rights.
        </p>
      </Section>

      <Section n={7} title="Self-hosted AuthAI">
        <p>
          If you run AuthAI on your own infrastructure (the MIT-licensed
          self-hosted distribution), Interface Labs is not the data
          controller — you are. This Privacy Policy applies only to
          AuthAI Cloud at authai.io.
        </p>
      </Section>

      <Section n={8} title="Changes">
        <p>
          We&apos;ll post material changes to this policy here and notify
          builders by email at least 14 days before they take effect.
          Past versions are kept in the git history of the AuthAI
          repository for transparency.
        </p>
      </Section>
    </PublicShell>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2>
        <span className="public-h2-num">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
