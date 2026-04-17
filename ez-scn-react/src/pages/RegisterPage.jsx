// ============================================
// PennyWise — Register Page
// ============================================

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Coins, Loader2, ArrowRight, Check, X } from 'lucide-react';

// ──────────────────────────────────────────
// Password strength calculator
// ──────────────────────────────────────────
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
  return { score: 3, label: 'Strong', color: 'bg-[#01411C]' };
}

// Password requirement checks
function getPasswordChecks(password) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One digit', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const checks = useMemo(() => getPasswordChecks(form.password), [form.password]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear field-level error when user types
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    if (serverError) setServerError('');
  }

  function validate() {
    const newErrors = {};

    if (!form.full_name.trim()) {
      newErrors.full_name = 'Full name is required.';
    } else if (form.full_name.trim().length < 2 || form.full_name.trim().length > 100) {
      newErrors.full_name = 'Full name must be between 2 and 100 characters.';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else {
      const unmet = checks.filter((c) => !c.met);
      if (unmet.length > 0) {
        newErrors.password = `Password must have: ${unmet.map((c) => c.label.toLowerCase()).join(', ')}.`;
      }
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the Terms & Conditions.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    const result = await register({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      // Map server field-level errors
      if (result.errors && result.errors.length > 0) {
        const fieldErrors = {};
        result.errors.forEach((err) => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        setServerError(result.error || 'Registration failed. Please try again.');
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-green-50/30 to-white">
      {/* ── Decorative background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#01411C]/[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#01411C]/[0.03] blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-[440px] animate-fade-in-up">

          {/* ── Logo / Header ── */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#01411C] flex items-center justify-center shadow-lg shadow-[#01411C]/20 group-hover:shadow-[#01411C]/30 transition-shadow">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#01411C] tracking-tight">PennyWise</span>
            </Link>
            <p className="mt-3 text-muted-foreground text-sm">
              Create your free account
            </p>
          </div>

          {/* ── Card ── */}
          <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.04] border border-border/60 p-8">
            <h1 className="text-xl font-semibold text-foreground mb-6">Get started</h1>

            {/* ── Server Error ── */}
            {serverError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Full Name */}
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Hassan Ahmed"
                  className={`w-full h-11 px-3.5 rounded-xl border bg-white text-sm
                             placeholder:text-muted-foreground
                             focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]
                             transition-all duration-200
                             ${errors.full_name ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : 'border-input'}`}
                />
                {errors.full_name && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.full_name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`w-full h-11 px-3.5 rounded-xl border bg-white text-sm
                             placeholder:text-muted-foreground
                             focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]
                             transition-all duration-200
                             ${errors.email ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : 'border-input'}`}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    className={`w-full h-11 px-3.5 pr-11 rounded-xl border bg-white text-sm
                               placeholder:text-muted-foreground
                               focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]
                               transition-all duration-200
                               ${errors.password ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : 'border-input'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>

                {/* ── Password Strength Indicator ── */}
                {form.password && (
                  <div className="mt-3 space-y-2.5">
                    {/* Strength bar */}
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              strength.score >= level ? strength.color : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-medium ${
                        strength.score === 1 ? 'text-red-600' :
                        strength.score === 2 ? 'text-amber-600' : 'text-[#01411C]'
                      }`}>
                        {strength.label}
                      </span>
                    </div>

                    {/* Requirement checklist */}
                    <div className="grid grid-cols-1 gap-1">
                      {checks.map((check, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          {check.met ? (
                            <Check className="w-3.5 h-3.5 text-[#01411C]" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className={check.met ? 'text-[#01411C]' : 'text-muted-foreground'}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-confirm" className="block text-sm font-medium text-foreground mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className={`w-full h-11 px-3.5 pr-11 rounded-xl border bg-white text-sm
                               placeholder:text-muted-foreground
                               focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]
                               transition-all duration-200
                               ${errors.confirmPassword ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : 'border-input'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>

                {/* Match indicator */}
                {form.confirmPassword && !errors.confirmPassword && (
                  <p className={`mt-1.5 text-xs flex items-center gap-1 ${
                    form.password === form.confirmPassword ? 'text-[#01411C]' : 'text-amber-600'
                  }`}>
                    {form.password === form.confirmPassword ? (
                      <><Check className="w-3 h-3" /> Passwords match</>
                    ) : (
                      <><X className="w-3 h-3" /> Passwords don&apos;t match yet</>
                    )}
                  </p>
                )}

                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms & Conditions */}
              <div>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (errors.terms) setErrors({ ...errors, terms: '' });
                    }}
                    className="w-4 h-4 mt-0.5 rounded border-input text-[#01411C] focus:ring-[#01411C]/30 accent-[#01411C]"
                  />
                  <span className="text-sm text-muted-foreground leading-snug">
                    I agree to the{' '}
                    <Link
                      to="/terms"
                      className="text-[#01411C] font-medium hover:underline"
                      target="_blank"
                    >
                      Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link
                      to="/privacy"
                      className="text-[#01411C] font-medium hover:underline"
                      target="_blank"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.terms && (
                  <p className="mt-1.5 ml-6.5 text-xs text-red-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.terms}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#01411C] text-white font-medium text-sm
                           hover:bg-[#026b2e] active:bg-[#012e14]
                           disabled:opacity-60 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-[#01411C]/30 focus:ring-offset-2
                           transition-all duration-200 flex items-center justify-center gap-2
                           shadow-lg shadow-[#01411C]/20 hover:shadow-[#01411C]/30 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Login link ── */}
          <p className="text-center mt-6 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#01411C] font-semibold hover:underline hover:text-[#026b2e] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
