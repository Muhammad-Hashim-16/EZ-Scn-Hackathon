import { useState, useEffect } from 'react';
import { CheckCircle2, TrendingUp, XCircle, AlertTriangle } from 'lucide-react';

export default function HealthBadge({ status, score }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const incrementTime = 20;
    const steps = duration / incrementTime;
    const increment = score / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(start));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [score]);

  let icon, colorClass, bgColorClass, badgeWrapperClass;
  
  if (status === 'safe') {
    icon = <CheckCircle2 className="w-8 h-8 text-green-600" />;
    colorClass = 'text-green-600';
    bgColorClass = 'bg-green-100';
    badgeWrapperClass = 'border-green-200 bg-green-50/50';
  } else if (status === 'edge') {
    icon = <AlertTriangle className="w-8 h-8 text-yellow-600" />;
    colorClass = 'text-yellow-600';
    bgColorClass = 'bg-yellow-100';
    badgeWrapperClass = 'border-yellow-200 bg-yellow-50/50';
  } else {
    icon = <XCircle className="w-8 h-8 text-red-600" />;
    colorClass = 'text-red-600';
    bgColorClass = 'bg-red-100';
    badgeWrapperClass = 'border-red-200 bg-red-50/50';
  }

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${badgeWrapperClass}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${bgColorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Health Score</p>
        <div className="flex items-baseline gap-1">
          <p className={`text-4xl font-bold ${colorClass}`}>
            {displayScore}
          </p>
          <span className="text-xl font-semibold text-muted-foreground">/ 100</span>
        </div>
      </div>
    </div>
  );
}
