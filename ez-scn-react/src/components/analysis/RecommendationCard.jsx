import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

export default function RecommendationCard({ rec }) {
  const [expanded, setExpanded] = useState(false);

  let badgeColor, iconColor, bgHoverColor;
  switch (rec.priority) {
    case 'critical':
      badgeColor = 'bg-red-100 text-red-700 border-red-200';
      iconColor = 'text-red-500';
      bgHoverColor = 'hover:bg-red-50/30';
      break;
    case 'high':
      badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';
      iconColor = 'text-orange-500';
      bgHoverColor = 'hover:bg-orange-50/30';
      break;
    case 'medium':
      badgeColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
      iconColor = 'text-yellow-500';
      bgHoverColor = 'hover:bg-yellow-50/30';
      break;
    default:
      badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
      iconColor = 'text-blue-500';
      bgHoverColor = 'hover:bg-blue-50/30';
      break;
  }

  return (
    <div className={`p-4 rounded-xl border border-border/60 bg-white transition-colors duration-200 ${expanded ? 'shadow-md ring-1 ring-border shadow-black/5' : bgHoverColor}`}>
      <div 
        className="flex items-start justify-between cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex gap-3">
          <div className="mt-1">
            <Lightbulb className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h4 className="text-sm font-semibold text-foreground group-hover:text-[#01411C] transition-colors">{rec.category}</h4>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {rec.priority}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              Current: <span className="font-semibold text-foreground mr-2">PKR {Number(rec.current_amount).toLocaleString()}</span>
              Target: <span className="font-semibold text-foreground">PKR {Number(rec.recommended_amount).toLocaleString()}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {rec.potential_savings > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-medium text-muted-foreground uppercase opacity-80">Potential Savings</p>
              <p className="text-sm font-bold text-green-600">PKR {Number(rec.potential_savings).toLocaleString()}/mo</p>
            </div>
          )}
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 group-hover:bg-[#01411C]/10 group-hover:text-[#01411C] transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in-up">
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-100">
            {rec.message}
          </p>
        </div>
      )}
    </div>
  );
}
