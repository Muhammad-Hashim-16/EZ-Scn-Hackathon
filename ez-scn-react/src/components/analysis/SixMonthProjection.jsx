import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatPKR } from '@/utils/formatters';

export default function SixMonthProjection({ projection, inflationRate }) {
  if (!projection || projection.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-border/60 bg-white">
        <h3 className="text-sm font-semibold text-foreground mb-4">6-Month Purchasing Power Projection</h3>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projection} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" tickFormatter={(val) => `Mo ${val}`} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `PKR ${Math.round(val/1000)}k`} />
              <Tooltip 
                formatter={(value) => [formatPKR(value), '']}
                labelFormatter={(label) => `Month ${label}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
              <Line type="monotone" dataKey="nominal_savings" name="Nominal Value" stroke="#9ca3af" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="real_value" name="Real Value (Adjusted)" stroke="#01411C" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Month</th>
                <th className="px-4 py-3">Nominal Value</th>
                <th className="px-4 py-3">Real Value</th>
                <th className="px-4 py-3 text-right rounded-tr-lg">Loss to Inflation</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((item, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-foreground">Month {item.month}</td>
                  <td className="px-4 py-3">{formatPKR(item.nominal_savings)}</td>
                  <td className="px-4 py-3 font-medium text-[#01411C]">{formatPKR(item.real_value)}</td>
                  <td className="px-4 py-3 text-right text-red-600">- {formatPKR(item.purchasing_power_loss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <span className="w-2 mx-1 h-2 rounded-full bg-amber-400 inline-block"></span>
        Based on current {inflationRate}% expected annual inflation rate. Estimates only.
      </p>
    </div>
  );
}
