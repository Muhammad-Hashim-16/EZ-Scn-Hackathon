// ============================================
// PennyWise — Terms & Conditions Page
// ============================================

import { Link } from 'react-router-dom';
import { Coins, ArrowLeft, ShieldCheck, AlertTriangle, Database, Trash2, Cookie, UserCheck, Mail } from 'lucide-react';

export default function TermsPage() {
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
              Terms &amp; Conditions
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Last updated: April 2026 &middot; PennyWise Savings Planner
            </p>
          </div>

          <div className="space-y-10">
            {/* ── Financial Disclaimer ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Important Disclaimer</h2>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 leading-relaxed space-y-2">
                <p className="font-semibold">
                  PennyWise is NOT a licensed financial advisory service.
                </p>
                <p>
                  All information, projections, and recommendations provided by PennyWise are for
                  informational and planning purposes only. They should not be construed as professional
                  financial, investment, or tax advice.
                </p>
                <p>
                  Inflation projections are estimates based on publicly available data and are
                  <strong> not guarantees</strong> of future economic conditions. Actual inflation rates
                  may vary significantly from our estimates.
                </p>
                <p>
                  Always consult a qualified financial professional before making significant
                  financial decisions.
                </p>
              </div>
            </section>

            {/* ── What Data We Collect ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#01411C]/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-[#01411C]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">What Data We Collect</h2>
              </div>
              <div className="prose-sm text-muted-foreground leading-relaxed space-y-2">
                <p>When you use PennyWise, we collect only the information you voluntarily provide:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-sm">
                  <li><strong>Account information:</strong> Full name, email address, city</li>
                  <li><strong>Financial data you enter:</strong> Income sources, expense categories, savings goals, and monthly budgets</li>
                  <li><strong>Work profile:</strong> Commute details, work hours (for fuel cost estimation)</li>
                  <li><strong>Preferences:</strong> Notification settings, cookie choices, theme preferences</li>
                </ul>
                <p>
                  We do <strong>not</strong> collect: CNIC numbers, bank account details, credit card
                  numbers, or any government-issued identification.
                </p>
              </div>
            </section>

            {/* ── How We Store Data ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#01411C]/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#01411C]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">How We Store Your Data</h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>Your data is stored securely using industry-standard practices:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>All data is stored in encrypted PostgreSQL databases hosted on Supabase</li>
                  <li>Passwords are hashed using bcrypt with a minimum of 12 salt rounds — we never store plaintext passwords</li>
                  <li>All communications between your browser and our servers are encrypted via HTTPS/TLS</li>
                  <li>Authentication uses JWTs with short-lived access tokens (15 minutes) and secure httpOnly refresh cookies</li>
                </ul>
                <p className="font-medium text-foreground">
                  Your financial data is never sold, shared, or disclosed to third parties for
                  advertising or marketing purposes.
                </p>
              </div>
            </section>

            {/* ── Right to Delete ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Right to Delete Your Account</h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>
                  You may request permanent deletion of your account and all associated data at any
                  time from your account settings or by contacting us at{' '}
                  <a href="mailto:support@pennywise.pk" className="text-[#01411C] font-medium hover:underline">
                    support@pennywise.pk
                  </a>.
                </p>
                <p>
                  Upon account deletion, all personal data, financial records, savings goals, and
                  snapshots will be permanently removed from our systems within 30 days.
                </p>
              </div>
            </section>

            {/* ── Cookie Usage ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#01411C]/10 flex items-center justify-center">
                  <Cookie className="w-4 h-4 text-[#01411C]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Cookie Usage</h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>We use two types of cookies:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Essential cookies:</strong> Required for authentication, session management, and security. These cannot be disabled.</li>
                  <li><strong>Analytics cookies (optional):</strong> Help us understand how users interact with PennyWise to improve the experience. You can opt out of these at any time.</li>
                </ul>
              </div>
            </section>

            {/* ── Age Requirement ── */}
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#01411C]/10 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-[#01411C]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Age Requirement</h2>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  PennyWise is intended for users aged <strong>18 years and older</strong>. By creating
                  an account, you confirm that you are at least 18 years of age. We do not knowingly
                  collect data from individuals under 18.
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
                  If you have any questions about these terms, please contact us at:{' '}
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
