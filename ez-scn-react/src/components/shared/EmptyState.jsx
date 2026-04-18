// ============================================
// PennyWise — Empty State
// Reusable "no content yet" component
//
// Props:
//   icon        — emoji string or Lucide icon component
//   title       — heading text
//   description — body text
//   actionLabel — CTA button text (optional)
//   onAction    — CTA click handler (optional)
//   className   — extra wrapper classes
// ============================================

import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon,
  title = 'Nothing here yet',
  description = '',
  actionLabel,
  onAction,
  className = '',
}) {
  // Determine if icon is an emoji string or a React component
  const isEmojiIcon = typeof icon === 'string';
  const IconComponent = !isEmojiIcon && icon ? icon : null;

  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {/* Icon container */}
      <div className="w-20 h-20 rounded-3xl bg-[#01411C]/8 flex items-center justify-center mb-6
                      ring-1 ring-[#01411C]/10">
        {isEmojiIcon ? (
          <span className="text-4xl leading-none">{icon}</span>
        ) : IconComponent ? (
          <IconComponent className="w-10 h-10 text-[#01411C]" />
        ) : (
          <Inbox className="w-10 h-10 text-[#01411C]" />
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed text-sm">
          {description}
        </p>
      )}

      {/* CTA button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 h-11 px-6 bg-[#01411C] text-white text-sm
                     font-semibold rounded-xl hover:bg-[#026b2e] active:bg-[#012e14]
                     transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
