// ============================================
// Onboarding Step 3 — Expenses (Accordion Cards)
// ============================================

import { useState, useEffect } from 'react';
import { ChevronDown, Plus, X, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AREA_OPTIONS = ['DHA', 'Gulberg', 'Johar Town', 'F-7', 'G-9', 'Saddar', 'North Nazimabad', 'Pechs', 'Other'];
const GROCERY_AREAS = ['Local Market', 'Carrefour', 'Imtiaz', 'Metro', 'Online', 'Mixed'];
const VEHICLE_TYPES = ['car', 'motorcycle', 'public', 'wfh'];
const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'electric'];

// Map parent category names to icons (emoji for simplicity while keeping bundle small)
const CATEGORY_ICONS = {
  'Housing': '🏠', 'Utility Bills': '💡', 'Grocery & Household Supplies': '🛒',
  'Fuel & Transport': '⛽', "Children's Expenses": '👶', 'Health': '🏥',
  'Insurance': '🛡️', 'Household Help': '👩‍🍳', 'Subscriptions & Entertainment': '📺',
  'Debt Repayments': '💳', 'Committee (Rotating Savings)': '🤝',
  'Clothing & Personal Care': '👔', 'Social & Religious': '🕌', 'Custom Expenses': '✏️',
};

export default function StepExpenses({ data, updateData, accessToken }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_URL}/api/expenses/categories`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success) {
          setCategories(json.categories);
        }
      } catch {
        // If API not available, render empty
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, [accessToken]);

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function setExpenseAmount(categoryId, value) {
    const updated = { ...data.expenses };
    if (!updated[categoryId]) updated[categoryId] = {};
    updated[categoryId].monthly_amount = value;
    updateData({ expenses: updated });
  }

  function getExpenseAmount(categoryId) {
    return data.expenses[categoryId]?.monthly_amount || '';
  }

  // Custom expenses handlers
  function addCustom() {
    updateData({ customExpenses: [...data.customExpenses, { label: '', amount: '' }] });
  }

  function removeCustom(i) {
    updateData({ customExpenses: data.customExpenses.filter((_, idx) => idx !== i) });
  }

  function updateCustom(i, field, value) {
    const updated = [...data.customExpenses];
    updated[i] = { ...updated[i], [field]: value };
    updateData({ customExpenses: updated });
  }

  // Calculate totals per parent
  function parentTotal(category) {
    return category.children.reduce((sum, child) => {
      const val = parseFloat(getExpenseAmount(child.id)) || 0;
      return sum + val;
    }, 0);
  }

  // Grand total
  const grandTotal = categories.reduce((sum, cat) => sum + parentTotal(cat), 0)
    + data.customExpenses.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#01411C]" />
        <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span>
      </div>
    );
  }

  // Determine which categories to show
  const visibleCategories = categories.filter((cat) => {
    if (cat.category_name === "Children's Expenses" && !data.hasChildren) return false;
    if (cat.category_name === 'Custom Expenses') return false; // rendered separately
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Children toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-border/60">
        <div>
          <p className="text-sm font-medium text-foreground">I have children</p>
          <p className="text-xs text-muted-foreground">Shows children's expense categories</p>
        </div>
        <button
          onClick={() => updateData({ hasChildren: !data.hasChildren })}
          className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-200 cursor-pointer ${
            data.hasChildren ? 'bg-[#01411C]' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={data.hasChildren}
        >
          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            data.hasChildren ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* ── Category Accordions ── */}
      {visibleCategories.map((category) => {
        const isOpen = expanded[category.id];
        const total = parentTotal(category);
        const isHousing = category.category_name === 'Housing';
        const isGrocery = category.category_name.startsWith('Grocery');
        const isFuel = category.category_name.startsWith('Fuel');
        const icon = CATEGORY_ICONS[category.category_name] || '📦';

        return (
          <div key={category.id} className="rounded-xl border border-border/60 bg-white overflow-hidden">
            {/* Accordion Header */}
            <button
              onClick={() => toggleExpand(category.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{category.category_name}</p>
                  <p className="text-xs text-muted-foreground">{category.children.length} sub-categories</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {total > 0 && (
                  <span className="text-xs font-semibold text-[#01411C] bg-[#01411C]/10 px-2.5 py-1 rounded-lg">
                    PKR {total.toLocaleString()}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Accordion Body */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-border/40">
                {/* Special: Housing area dropdown */}
                {isHousing && (
                  <div className="pt-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Area of Living</label>
                    <select
                      value={data.areaOfLiving}
                      onChange={(e) => updateData({ areaOfLiving: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-white text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C] cursor-pointer"
                    >
                      <option value="">Select area</option>
                      {AREA_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                )}

                {/* Special: Grocery area dropdown */}
                {isGrocery && (
                  <div className="pt-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Grocery Shopping Area</label>
                    <select
                      value={data.groceryArea}
                      onChange={(e) => updateData({ groceryArea: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-white text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C] cursor-pointer"
                    >
                      <option value="">Select area</option>
                      {GROCERY_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                )}

                {/* Special: Fuel & Transport selectors */}
                {isFuel && (
                  <div className="pt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Home Address</label>
                      <input
                        type="text"
                        value={data.homeAddress}
                        onChange={(e) => updateData({ homeAddress: e.target.value })}
                        placeholder="Enter home address"
                        className="w-full h-9 px-3 rounded-lg border border-input bg-white text-sm
                                   focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Office Address</label>
                      <input
                        type="text"
                        value={data.officeAddress}
                        onChange={(e) => updateData({ officeAddress: e.target.value })}
                        placeholder="Enter work/office address"
                        className="w-full h-9 px-3 rounded-lg border border-input bg-white text-sm
                                   focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Vehicle</label>
                        <select
                          value={data.vehicleType}
                          onChange={(e) => updateData({ vehicleType: e.target.value })}
                          className="w-full h-9 px-2 rounded-lg border border-input bg-white text-xs
                                     focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 cursor-pointer"
                        >
                          {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Fuel</label>
                        <select
                          value={data.fuelType}
                          onChange={(e) => updateData({ fuelType: e.target.value })}
                          className="w-full h-9 px-2 rounded-lg border border-input bg-white text-xs
                                     focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 cursor-pointer"
                        >
                          {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">km/L avg</label>
                        <input
                          type="number"
                          min="0"
                          value={data.vehicleFuelAvg}
                          onChange={(e) => updateData({ vehicleFuelAvg: e.target.value })}
                          placeholder="12"
                          className="w-full h-9 px-2 rounded-lg border border-input bg-white text-xs
                                     focus:outline-none focus:ring-2 focus:ring-[#01411C]/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-category amount inputs */}
                {category.children.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3 pt-1">
                    <label className="flex-1 text-sm text-foreground truncate" title={sub.category_name}>
                      {sub.category_name}
                    </label>
                    <div className="relative w-40">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">PKR</span>
                      <input
                        type="number"
                        min="0"
                        value={getExpenseAmount(sub.id)}
                        onChange={(e) => setExpenseAmount(sub.id, e.target.value)}
                        placeholder="0"
                        className="w-full h-9 pl-9 pr-2.5 rounded-lg border border-input bg-white text-sm text-right
                                   focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Custom Expenses ── */}
      <div className="rounded-xl border border-border/60 bg-white overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg">✏️</span>
            <p className="text-sm font-semibold text-foreground">Custom Expenses</p>
          </div>

          {data.customExpenses.map((ce, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={ce.label}
                onChange={(e) => updateCustom(i, 'label', e.target.value)}
                placeholder="Expense name"
                className="flex-1 h-9 px-3 rounded-lg border border-input bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
              />
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">PKR</span>
                <input
                  type="number"
                  min="0"
                  value={ce.amount}
                  onChange={(e) => updateCustom(i, 'amount', e.target.value)}
                  placeholder="0"
                  className="w-full h-9 pl-9 pr-2.5 rounded-lg border border-input bg-white text-sm text-right
                             focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                />
              </div>
              <button
                onClick={() => removeCustom(i)}
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center
                           text-muted-foreground hover:text-red-600 hover:border-red-300
                           transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <button
            onClick={addCustom}
            className="h-8 px-3 rounded-lg text-xs font-medium text-[#01411C]
                       hover:bg-[#01411C]/5 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Expense
          </button>
        </div>
      </div>

      {/* ── Grand Total ── */}
      {grandTotal > 0 && (
        <div className="p-4 rounded-xl bg-[#01411C]/[0.06] border border-[#01411C]/15">
          <p className="text-xs text-muted-foreground">Estimated Total Monthly Expenses</p>
          <p className="text-2xl font-bold text-[#01411C]">PKR {grandTotal.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
