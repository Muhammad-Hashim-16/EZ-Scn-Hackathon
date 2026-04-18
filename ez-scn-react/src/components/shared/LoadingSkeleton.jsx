// ============================================
// PennyWise — Loading Skeleton
// Configurable animated placeholder component
// Props: type = 'card' | 'list' | 'chart' | 'dashboard'
// ============================================

const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full ' +
  'before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r ' +
  'before:from-transparent before:via-white/40 before:to-transparent';

function Bone({ className = '' }) {
  return <div className={`rounded-xl bg-gray-200/80 ${shimmer} ${className}`} />;
}

// ── Dashboard skeleton ──
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-32" />
        </div>
        <Bone className="h-10 w-10 rounded-full" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Bone key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      {/* Toggle */}
      <Bone className="h-11 w-64 rounded-full" />
      {/* Breakdown */}
      <Bone className="h-80 rounded-2xl" />
      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Bone className="h-48 rounded-2xl" />
        <Bone className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Card skeleton ──
function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Bone key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  );
}

// ── List skeleton ──
function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-3/4" />
            <Bone className="h-3 w-1/2" />
          </div>
          <Bone className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Chart skeleton ──
function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <Bone className="h-6 w-48" />
      <div className="flex items-end gap-2 h-48">
        {[40, 65, 50, 80, 55, 70, 45, 75, 60, 85, 50, 70].map((h, i) => (
          <Bone key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex justify-between">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-3 w-12" />
        ))}
      </div>
    </div>
  );
}

// ── Analysis skeleton ──
function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Bone className="h-20 w-20 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Bone className="h-6 w-48" />
          <Bone className="h-4 w-64" />
        </div>
      </div>
      <Bone className="h-32 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Bone className="h-48 rounded-2xl" />
          <Bone className="h-32 rounded-2xl" />
        </div>
        <Bone className="h-[22rem] rounded-2xl" />
      </div>
    </div>
  );
}

// ── Goals skeleton ──
function GoalsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-52" />
        <Bone className="h-10 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <CardSkeleton count={3} />
    </div>
  );
}

// ── Weekly skeleton ──
function WeeklySkeleton() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-52" />
      <Bone className="h-48 rounded-2xl" />
      <Bone className="h-6 w-40" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Bone key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ── Main export with type prop ──
export default function LoadingSkeleton({ type = 'card', count, rows }) {
  switch (type) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'analysis':
      return <AnalysisSkeleton />;
    case 'goals':
      return <GoalsSkeleton />;
    case 'weekly':
      return <WeeklySkeleton />;
    case 'chart':
      return <ChartSkeleton />;
    case 'list':
      return <ListSkeleton rows={rows} />;
    case 'card':
    default:
      return <CardSkeleton count={count} />;
  }
}

export { Bone };
