// ============================================
// PennyWise — Privacy Policy Page
// ============================================

import { Link } from 'react-router-dom';
import { Coins, ArrowLeft, ShieldCheck, EyeOff, Lock, Globe, Trash2, Mail } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-green-50/20 to-white">
      {/* ── Header ── */}
      <header className="border-b border-border/60 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#01411C] flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#01411C]">PennyWise</span>
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#01411C] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <div className="animate-fade-in-up">
          {/* Title */}
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Last updated: April 2026 &middot; PennyWise Savings Planner
            </p>
          </div>

          {/* Intro */}
          <div className="p-4 rounded-xl bg-[#01411C]/[0.04] border border-[#01411C]/10 text-sm text-foreground leading-relaxed mb-10">
            <p>
              At PennyWise, your privacy is our priority. This policy explains what data we collect,
              how we use it, and how we protect it. We are committed to transparency and data minimization.
            </p>
          </div>

          <div className="space-y-10">
            {/* ── Data Minimization ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#01411C]/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#01411C]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Data Minimization</h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>
                  We follow the principle of <strong>data minimization</strong> — we only collect
                  information that is strictly necessary for PennyWise to function:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Account data:</strong> Name, email, and city (for localized inflation estimates)</li>
                  <li><strong>Financial planning data:</strong> Income, expenses, and savings goals you voluntarily enter</li>
                  <li><strong>Work profile:</strong> Commute and fuel data (for transport cost estimation)</li>
                </ul>
                <p>
                  We do not collect any data beyond what you explicitly provide. There is no background
                  tracking, no location tracking, and no contact list access.
                </p>
              </div>
            </section>

            {/* ── What We Don't Collect ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <EyeOff className="w-4 h-4 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">What We Never Collect</h2>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900 leading-relaxed">
                <p className="font-medium mb-2">PennyWise will never ask for or store:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>CNIC (National Identity Card) numbers</li>
                  <li>Bank account numbers or IBAN details</li>
                  <li>Credit or debit card numbers</li>
                  <li>ATM PINs or banking passwords</li>
                  <li>Any government-issued identification documents</li>
                </ul>
                <p className="mt-2 font-medium">
                  If anyone claiming to be PennyWise asks for this information, it is a scam.
                  Please report it immediately to{' '}
                  <a href="mailto:support@pennywise.pk" className="underline">support@pennywise.pk</a>.
                </p>
              </div>
            </section>

            {/* ── Data Encryption ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#01411C]/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-[#01411C]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Data Encryption &amp; Security</h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>We implement multiple layers of security to protect your data:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {[
                    { title: 'In Transit', desc: 'All data is encrypted via HTTPS/TLS during transmission' },
                    { title: 'At Rest', desc: 'Database is hosted on Supabase with encryption at rest enabled' },
                    { title: 'Passwords', desc: 'Hashed using bcrypt with 12+ salt rounds — never stored in plaintext' },
                    { title: 'Sessions', desc: 'Short-lived JWTs (15 min) with httpOnly secure cookies for refresh tokens' },
                  ].map((item) => (
                    <div key={item.title} className="p-3 rounded-xl bg-gray-50 border border-border/60">
                      <p className="text-xs font-semibold text-foreground mb-0.5">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Third Party Services ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#01411C]/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-[#01411C]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Third-Party Services</h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>PennyWise uses the following third-party services:</p>
                <div className="space-y-3 mt-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-border/60">
                    <p className="text-sm font-medium text-foreground">Google Maps API</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used to calculate commute distances for fuel cost estimation. We send only your
                      home and office addresses (that you provide). Google&apos;s privacy policy applies to
                      data processed by their services.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-border/60">
                    <p className="text-sm font-medium text-foreground">Firebase Cloud Messaging</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used to send push notifications (inflation alerts, weekly tracker reminders)
                      if you opt in. You can disable notifications at any time from your settings.
                      Firebase&apos;s privacy policy applies.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-border/60">
                    <p className="text-sm font-medium text-foreground">Supabase (PostgreSQL)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Our database provider. All data is stored in Supabase-hosted PostgreSQL instances
                      with row-level security and encryption at rest.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Account Deletion ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Account Deletion</h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>You can delete your account at any time through two methods:</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>
                    <strong>Self-service:</strong> Navigate to <strong>Settings → Delete Account</strong> in the app.
                    You will be asked to confirm by entering your password.
                  </li>
                  <li>
                    <strong>Email request:</strong> Send a deletion request from your registered email to{' '}
                    <a href="mailto:support@pennywise.pk" className="text-[#01411C] font-medium hover:underline">
                      support@pennywise.pk
                    </a>.
                    We will process it within 48 hours.
                  </li>
                </ol>
                <p>
                  Upon deletion, <strong>all</strong> your data will be permanently removed from our
                  servers within 30 days, including: profile information, financial records, savings goals,
                  monthly snapshots, and notification history.
                </p>
              </div>
            </section>

            {/* ── Contact ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#01411C]/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-[#01411C]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Contact Us</h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  For any privacy-related questions or concerns, reach us at:{' '}
                  <a href="mailto:support@pennywise.pk" className="text-[#01411C] font-medium hover:underline">
                    support@pennywise.pk
                  </a>
                </p>
              </div>
            </section>
          </div>

          {/* ── Footer ── */}
          <div className="mt-12 pt-8 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} PennyWise. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
