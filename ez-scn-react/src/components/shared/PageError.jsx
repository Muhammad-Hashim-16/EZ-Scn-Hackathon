// ============================================
// PennyWise — Page Error
// For API call failures — distinguishes between
// network errors, auth errors, and server errors
//
// Props:
//   error    — error message string or Error object
//   onRetry  — retry handler function
//   status   — HTTP status code (optional)
//   className
// ============================================

import { useNavigate } from 'react-router-dom';
import { WifiOff, ShieldAlert, ServerCrash, RefreshCcw, LogIn } from 'lucide-react';
import { useEffect } from 'react';

export default function PageError({
  error,
  onRetry,
  status,
  className = '',
}) {
  const navigate = useNavigate();

  const errorMessage =
    typeof error === 'string' ? error : error?.message || 'Something went wrong.';

  // Determine error type
  const isNetwork =
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('fetch') ||
    errorMessage.toLowerCase().includes('failed to fetch') ||
    errorMessage.toLowerCase().includes('connection');

  const isAuth = status === 401 || status === 403;
  const isServer = status >= 500 || (!isNetwork && !isAuth);

  // Auto-redirect on auth error after brief delay
  useEffect(() => {
    if (isAuth) {
      const timer = setTimeout(() => navigate('/login', { replace: true }), 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuth, navigate]);

  // Pick icon, title, description based on type
  let icon, title, description, bgColor, borderColor, iconColor;

  if (isAuth) {
    icon = ShieldAlert;
    title = 'Session Expired';
    description = 'Your session has expired. Redirecting you to login...';
    bgColor = 'bg-amber-50';
    borderColor = 'border-amber-200';
    iconColor = 'text-amber-500';
  } else if (isNetwork) {
    icon = WifiOff;
    title = 'Connection Error';
    description =
      'Unable to reach PennyWise servers. Check your internet connection and try again.';
    bgColor = 'bg-orange-50';
    borderColor = 'border-orange-200';
    iconColor = 'text-orange-500';
  } else {
    icon = ServerCrash;
    title = 'Something Went Wrong';
    description =
      errorMessage !== 'Something went wrong.'
        ? errorMessage
        : 'Our servers are having a moment. Your data is safe — please try again.';
    bgColor = 'bg-red-50';
    borderColor = 'border-red-200';
    iconColor = 'text-red-500';
  }

  const Icon = icon;

  return (
    <div className={`p-6 rounded-2xl ${bgColor} border ${borderColor} text-center ${className}`}>
      {/* Icon */}
      <div className="mx-auto w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center mb-4
                      shadow-sm">
        <Icon className={`w-7 h-7 ${iconColor}`} />
      </div>

      {/* Title & description */}
      <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        {isAuth ? (
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="flex items-center gap-2 h-10 px-5 bg-amber-600 text-white text-sm
                       font-semibold rounded-xl hover:bg-amber-700 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Go to Login
          </button>
        ) : (
          onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 h-10 px-5 bg-[#01411C] text-white text-sm
                         font-semibold rounded-xl hover:bg-[#026b2e] active:bg-[#012e14]
                         transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20"
            >
              <RefreshCcw className="w-4 h-4" />
              Retry
            </button>
          )
        )}
      </div>
    </div>
  );
}
