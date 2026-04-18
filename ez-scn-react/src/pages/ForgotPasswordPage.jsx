// ============================================
// PennyWise — Forgot Password Page
// ============================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success even if email doesn't exist (security best practice)
      setSubmitted(true);
    } catch {
      // Show success anyway to not reveal if email exists
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-green-50/30 to-white">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#01411C]/[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#01411C]/[0.03] blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-[420px] animate-fade-in-up">

          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#01411C] flex items-center justify-center shadow-lg shadow-[#01411C]/20">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#01411C] tracking-tight">PennyWise</span>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.04] border border-border/60 p-8">
            
            {submitted ? (
              /* ── Success state ── */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-xl font-semibold text-foreground mb-2">Check your inbox</h1>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  If an account exists for <strong>{email}</strong>, we've sent password reset instructions.
                  Please check your email and spam folder.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#01411C] text-white text-sm font-medium
                             hover:bg-[#026b2e] transition-colors shadow-sm shadow-[#01411C]/20"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">Reset Password</h1>
                    <p className="text-xs text-muted-foreground">Enter your email to reset your password</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="forgot-email" className="block text-sm font-medium text-foreground mb-1.5">
                      Email address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@example.com"
                      className="w-full h-11 px-3.5 rounded-xl border border-input bg-white text-sm
                                 placeholder:text-muted-foreground
                                 focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]
                                 transition-all duration-200"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-[#01411C] text-white font-medium text-sm
                               hover:bg-[#026b2e] disabled:opacity-60 disabled:cursor-not-allowed
                               transition-all duration-200 flex items-center justify-center gap-2
                               shadow-lg shadow-[#01411C]/20 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link to="/login" className="text-[#01411C] font-semibold hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
