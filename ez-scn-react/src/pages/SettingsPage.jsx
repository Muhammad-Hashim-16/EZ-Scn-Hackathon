// ============================================
// PennyWise — Settings Page
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useInvalidate, useExpenses } from '@/hooks/useQueries';
import { api } from '@/services/api';
import { formatPKR } from '@/utils/formatters';
import {
  User, Shield, Bell, Target, CalendarCheck, FileDown, Trash2, 
  Settings as SettingsIcon, ExternalLink, LogOut, Info, Lock, ArrowRight,
  Pencil, Check, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import PageError from '@/components/shared/PageError';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

// ── Financial Edit Card (Replace / Add toggle) ──
// Used in the Financial Setup section for quick inline
// income and expense amount edits.
function FinancialEditCard({ title, subtitle, fieldLabel, toast, api, type, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState('replace'); // 'replace' | 'add'
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  const isIncome = type === 'income';
  const currentValue = currentRecord
    ? (isIncome ? currentRecord.income : currentRecord.expected_expenses)
    : 0;

  async function fetchRecord() {
    setLoadingRecord(true);
    try {
      const res = await api.get('monthly-record/current');
      if (res.success) setCurrentRecord(res.record);
    } catch { /* */ }
    setLoadingRecord(false);
  }

  function handleExpand() {
    if (!expanded) {
      fetchRecord();
    }
    setExpanded(!expanded);
    setAmount('');
    setMode('replace');
  }

  const enteredAmount = parseFloat(amount) || 0;
  const newTotal = mode === 'add' ? currentValue + enteredAmount : enteredAmount;

  async function handleSave() {
    if (enteredAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }
    setSaving(true);
    try {
      const body = isIncome
        ? { income: newTotal, expected_expenses: currentRecord.expected_expenses }
        : { income: currentRecord.income, expected_expenses: newTotal };

      const res = await api.put('monthly-record/confirm', body);
      if (res.success) {
        toast.success(`${title} updated successfully`);
        setCurrentRecord(res.record);
        setExpanded(false);
        setAmount('');
        if (onSaved) onSaved();
      } else {
        toast.error('Failed to save.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`bg-white border rounded-xl transition-all ${expanded ? 'border-[#01411C] shadow-md col-span-full' : 'border-border hover:border-[#01411C] hover:shadow-sm'}`}>
      {/* Collapsed state — clickable card */}
      <button onClick={handleExpand} className="w-full p-4 text-left cursor-pointer group">
        <div className="flex items-center justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-3 group-hover:bg-[#01411C] transition-colors">
              {isIncome
                ? <User className="w-4 h-4 text-green-700 group-hover:text-white" />
                : <Target className="w-4 h-4 text-green-700 group-hover:text-white" />
              }
            </div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {expanded && (
            <Pencil className="w-4 h-4 text-[#01411C]" />
          )}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-5 space-y-4 border-t border-border/50 pt-4">
          {loadingRecord ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Current value */}
              <div className="p-3 rounded-xl bg-gray-50 border border-border/50">
                <p className="text-xs text-muted-foreground">Current {isIncome ? 'Income' : 'Expected Expenses'}</p>
                <p className="text-lg font-bold text-foreground">{formatPKR(currentValue)}</p>
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-xl overflow-hidden border border-border">
                <button
                  onClick={() => setMode('replace')}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    mode === 'replace'
                      ? 'bg-[#01411C] text-white'
                      : 'bg-white text-foreground hover:bg-gray-50'
                  }`}
                >
                  Replace
                </button>
                <button
                  onClick={() => setMode('add')}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer border-l ${
                    mode === 'add'
                      ? 'bg-[#01411C] text-white'
                      : 'bg-white text-foreground hover:bg-gray-50'
                  }`}
                >
                  Add to Previous
                </button>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  {mode === 'replace' ? `New ${fieldLabel}` : `Amount to Add`}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">PKR</span>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 pl-11 pr-3 rounded-xl border border-input bg-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                  />
                </div>
              </div>

              {/* Preview (for Add mode) */}
              {mode === 'add' && enteredAmount > 0 && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm">
                  <span className="text-blue-700">New total will be: </span>
                  <span className="font-bold text-blue-900">{formatPKR(newTotal)}</span>
                </div>
              )}

              {/* Replace mode preview */}
              {mode === 'replace' && enteredAmount > 0 && enteredAmount !== currentValue && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                  <span className="text-amber-700">Will change from </span>
                  <span className="font-semibold text-amber-800">{formatPKR(currentValue)}</span>
                  <span className="text-amber-700"> to </span>
                  <span className="font-bold text-amber-900">{formatPKR(enteredAmount)}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setExpanded(false); setAmount(''); }}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground
                             hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || enteredAmount <= 0}
                  className="flex-1 h-10 rounded-xl bg-[#01411C] text-white text-sm font-semibold
                             hover:bg-[#026b2e] disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


// ── Expense Redistribution Card ──
// Shows category-level preview when changing total expenses.
function ExpenseRedistributeCard({ toast, api, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch expenses via React Query
  const { data: expensesResponse, isLoading: expensesLoading } = useExpenses();
  const expenses = expensesResponse?.success ? expensesResponse.expenses : [];
  const currentTotal = expensesResponse?.success
    ? expensesResponse.total_monthly_expenses
    : 0;

  const enteredAmount = parseFloat(amount) || 0;

  // Calculate live preview using percentages
  const preview = expenses.map((exp) => {
    const amt = parseFloat(exp.monthly_amount) || 0;
    const pct = currentTotal > 0 ? (amt / currentTotal) * 100 : 0;
    return {
      id: exp.id,
      category_name: exp.category_name || exp.custom_label || 'Other',
      current_amount: amt,
      percentage: pct,
      new_amount: enteredAmount > 0 ? Math.round((pct / 100) * enteredAmount) : amt,
    };
  });

  // Fix rounding for preview
  if (enteredAmount > 0 && preview.length > 0) {
    const previewSum = preview.reduce((s, p) => s + p.new_amount, 0);
    const diff = Math.round(enteredAmount) - previewSum;
    if (diff !== 0) {
      let largest = 0;
      for (let i = 1; i < preview.length; i++) {
        if (preview[i].new_amount > preview[largest].new_amount) largest = i;
      }
      preview[largest].new_amount += diff;
    }
  }

  async function handleRedistribute() {
    if (enteredAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('expenses/redistribute', {
        new_total_expenses: enteredAmount,
      });
      if (res.success) {
        toast.success('✅ Expenses redistributed. All pages updated.');
        setExpanded(false);
        setAmount('');
        setShowPreview(false);
        if (onSaved) onSaved();
      } else {
        toast.error(res.error || 'Failed to redistribute.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to redistribute.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`bg-white border rounded-xl transition-all ${expanded ? 'border-[#01411C] shadow-md col-span-full' : 'border-border hover:border-[#01411C] hover:shadow-sm'}`}>
      {/* Collapsed state */}
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left cursor-pointer group">
        <div className="flex items-center justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-3 group-hover:bg-[#01411C] transition-colors">
              <Target className="w-4 h-4 text-green-700 group-hover:text-white" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Monthly Expenses</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Total expected expenses</p>
          </div>
          {expanded && <Pencil className="w-4 h-4 text-[#01411C]" />}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-5 space-y-4 border-t border-border/50 pt-4">
          {expensesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Add expenses first before changing the total.
            </div>
          ) : (
            <>
              {/* Current total */}
              <div className="p-3 rounded-xl bg-gray-50 border border-border/50">
                <p className="text-xs text-muted-foreground">Current Total Expenses</p>
                <p className="text-lg font-bold text-foreground">{formatPKR(currentTotal)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{expenses.length} categories</p>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  New Total Monthly Expenses
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">PKR</span>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 pl-11 pr-3 rounded-xl border border-input bg-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                  />
                </div>
              </div>

              {/* Change summary */}
              {enteredAmount > 0 && enteredAmount !== currentTotal && (
                <div className={`p-3 rounded-xl border text-sm ${
                  enteredAmount > currentTotal
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <span className={enteredAmount > currentTotal ? 'text-red-700' : 'text-green-700'}>
                    {enteredAmount > currentTotal ? '▲' : '▼'}{' '}
                    {formatPKR(Math.abs(enteredAmount - currentTotal))}{' '}
                    {enteredAmount > currentTotal ? 'increase' : 'decrease'}
                  </span>
                </div>
              )}

              {/* Category redistribution preview */}
              {enteredAmount > 0 && enteredAmount !== currentTotal && (
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 text-sm font-medium text-foreground hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span>📊 Category Redistribution Preview</span>
                    {showPreview
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>

                  {showPreview && (
                    <div className="divide-y divide-border/40">
                      {/* Header */}
                      <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-gray-50/50">
                        <span>Category</span>
                        <span className="text-right">Current</span>
                        <span className="text-right">New</span>
                        <span className="text-right">%</span>
                      </div>

                      {preview.map((item) => (
                        <div key={item.id} className="grid grid-cols-4 gap-2 px-3 py-2.5 text-sm items-center">
                          <span className="text-foreground truncate text-xs" title={item.category_name}>
                            {item.category_name}
                          </span>
                          <span className="text-right text-muted-foreground text-xs">
                            {formatPKR(item.current_amount)}
                          </span>
                          <span className={`text-right font-semibold text-xs ${
                            item.new_amount > item.current_amount
                              ? 'text-red-600'
                              : item.new_amount < item.current_amount
                              ? 'text-green-600'
                              : 'text-foreground'
                          }`}>
                            {formatPKR(item.new_amount)}
                          </span>
                          <span className="text-right text-[11px] text-muted-foreground">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ))}

                      {/* Total row */}
                      <div className="grid grid-cols-4 gap-2 px-3 py-2.5 bg-gray-50 font-semibold text-xs">
                        <span>Total</span>
                        <span className="text-right">{formatPKR(currentTotal)}</span>
                        <span className="text-right text-[#01411C]">{formatPKR(enteredAmount)}</span>
                        <span className="text-right">100%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setExpanded(false); setAmount(''); setShowPreview(false); }}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground
                             hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedistribute}
                  disabled={saving || enteredAmount <= 0 || enteredAmount === currentTotal}
                  className="flex-1 h-10 rounded-xl bg-[#01411C] text-white text-sm font-semibold
                             hover:bg-[#026b2e] disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Apply Changes
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


export default function SettingsPage() {
  const { user, accessToken, logout, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const invalidate = useInvalidate();

  // Settings State
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);

  // Modals
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Form states
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [deleteInput, setDeleteInput] = useState('');

  // SWR: Fetch mock preferences (since backend might not exist yet)
  // We'll use a local state fallback to demonstrate the UI
  const [preferences, setPreferences] = useState({
    priceAlerts: true,
    weeklyReminder: true,
    monthlyReport: true,
    milestoneAlerts: true,
    reengagement: false,
    quietStart: '22:00',
    quietEnd: '08:00',
    weeklyTracker: user?.weekly_tracker_opt_in || false,
  });

  useEffect(() => {
    if (user) {
      setProfileName(user.full_name);
      setPreferences(p => ({ ...p, weeklyTracker: user.weekly_tracker_opt_in === true }));
    }
  }, [user]);

  // ── Actions ──

  async function handleSaveName() {
    if (!profileName.trim()) return;
    setNameSaving(true);
    try {
      await api.put('/user/profile', { full_name: profileName });
      updateUser({ full_name: profileName });
      toast.success('Profile updated successfully');
      setIsEditingName(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update name');
    } finally {
      setNameSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwdForm.new !== pwdForm.confirm) {
      return toast.error('New passwords do not match');
    }
    if (pwdForm.new.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwdForm.current,
        newPassword: pwdForm.new
      });
      toast.success('Password changed safely');
      setPwdModalOpen(false);
      setPwdForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    }
  }

  async function handleTogglePref(key, val) {
    const newPrefs = { ...preferences, [key]: val };
    setPreferences(newPrefs);
    try {
      // If it's weekly tracker, call its specific route, else notification route
      if (key === 'weeklyTracker') {
        await api.put('/weekly/opt-in', { opt_in: val });
      } else {
        await api.put('/notifications/preferences', { [key]: val });
      }
      toast.info('Preferences saved');
    } catch (err) {
      toast.error('Failed to save preferences');
      setPreferences(preferences); // revert
    }
  }

  async function handleDownloadData() {
    try {
      toast.info('Preparing your data archive...');
      const data = await api.get('/user/export-data');
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pennywise_data_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Download complete');
    } catch (err) {
      toast.error(err.message || 'Failed to export data');
    }
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'DELETE') return;
    try {
      await api.delete('/user/account');
      toast.success('Account successfully deleted');
      setDeleteModalOpen(false);
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
    }
  }

  // Calculate next Sunday reminder (mock logic)
  const getNextSunday = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    d.setHours(18, 0, 0, 0); // 6:00 PM
    return d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[#01411C]" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile, alerts, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Navigation Sidebar (Desktop) */}
        <div className="hidden lg:block lg:col-span-1 space-y-1">
          {[
            { id: 'profile', icon: User, label: 'Profile & Account' },
            { id: 'financial', icon: Target, label: 'Financial Setup' },
            { id: 'notifications', icon: Bell, label: 'Notifications' },
            { id: 'weekly', icon: CalendarCheck, label: 'Weekly Tracker' },
            { id: 'security', icon: Shield, label: 'Privacy & Security' },
            { id: 'about', icon: Info, label: 'About PennyWise' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.id} href={`#${item.id}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-sm font-medium text-foreground transition-colors">
                <Icon className="w-4 h-4 text-muted-foreground" />
                {item.label}
              </a>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="col-span-1 lg:col-span-2 space-y-12">
          
          {/* 1. Profile */}
          <section id="profile" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b pb-2">
              <User className="w-5 h-5 text-[#01411C]" /> Profile
            </h2>
            <div className="bg-white rounded-2xl border border-border p-5 space-y-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</label>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={profileName} 
                        onChange={e => setProfileName(e.target.value)}
                        className="flex-1 h-9 px-3 text-sm border rounded-lg focus:ring-2 focus:ring-[#01411C] outline-none"
                      />
                      <button onClick={handleSaveName} disabled={nameSaving} className="text-xs bg-[#01411C] text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer">Save</button>
                      <button onClick={() => setIsEditingName(false)} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg cursor-pointer">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-transparent hover:border-border transition-colors group">
                      <span className="text-sm font-medium text-foreground">{profileName || 'No name set'}</span>
                      <button onClick={() => setIsEditingName(true)} className="text-xs text-[#01411C] font-semibold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">Edit</button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                  <div className="bg-gray-50 px-3 py-2 rounded-lg border border-border/50 text-sm text-foreground/70">
                    {user?.email}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">City</label>
                  <div className="bg-gray-50 px-3 py-2 rounded-lg border border-border/50 text-sm text-foreground">
                    Pakistan <span className="text-xs text-muted-foreground italic">(Set in onboarding)</span>
                  </div>
                </div>

              </div>

              <div className="pt-2">
                <button onClick={() => setPwdModalOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-[#01411C] hover:text-[#026b2e] cursor-pointer">
                  <Lock className="w-4 h-4" /> Change Password
                </button>
              </div>
            </div>
          </section>

          {/* 2. Financial Profile — Inline Editing with Replace/Add Toggle */}
          <section id="financial" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b pb-2">
              <Target className="w-5 h-5 text-[#01411C]" /> Financial Setup
            </h2>
            <p className="text-sm text-muted-foreground">Modify your core financial data. Changes here will immediately recalculate your analysis and monthly record.</p>
            
            {/* Quick Nav Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => navigate('/onboarding', { state: { step: 0, editMode: true } })} className="p-4 bg-white border border-border rounded-xl text-left hover:border-[#01411C] hover:shadow-sm transition-all group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-3 group-hover:bg-[#01411C] transition-colors">
                  <User className="w-4 h-4 text-green-700 group-hover:text-white" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Edit Work Setup</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Daily hours, work days</p>
              </button>
              
              <FinancialEditCard
                title="Income Sources"
                subtitle="Total monthly income"
                type="income"
                fieldLabel="Income Amount"
                toast={toast}
                api={api}
                onSaved={() => invalidate.afterFinancialUpdate()}
              />
              
              <ExpenseRedistributeCard
                toast={toast}
                api={api}
                onSaved={() => invalidate.afterFinancialUpdate()}
              />
            </div>
            
            <div className="pt-2">
              <button onClick={() => navigate('/goals')} className="flex items-center gap-2 text-sm font-semibold text-[#01411C] hover:text-[#026b2e] cursor-pointer">
                Manage Savings Goals <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* 3. Notifications */}
          <section id="notifications" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b pb-2">
              <Bell className="w-5 h-5 text-[#01411C]" /> Alerts & Notifications
            </h2>
            <div className="bg-white border rounded-2xl divide-y">
              
              {[
                { id: 'priceAlerts', title: 'Inflation Price Alerts', desc: 'Get notified when essential commodity prices jump.' },
                { id: 'weeklyReminder', title: 'Weekly Expense Reminder', desc: 'Sunday evening prompt to log your tracked expenses.' },
                { id: 'monthlyReport', title: 'Monthly Analysis Report', desc: 'A summary of your financial health every 1st of the month.' },
                { id: 'milestoneAlerts', title: 'Goal Milestone Alerts', desc: `Get cheered on when you hit 25%, 50%, 75% of a goal.` },
                { id: 'reengagement', title: 'Re-engagement Reminders', desc: 'Gentle nudges if you haven\'t logged in for a while.' },
              ].map(toggle => (
                <div key={toggle.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{toggle.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{toggle.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={preferences[toggle.id]} 
                      onChange={e => handleTogglePref(toggle.id, e.target.checked)} 
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01411C]"></div>
                  </label>
                </div>
              ))}

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 rounded-b-2xl">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Quiet Hours</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">We won't send push notifications during this window.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="time" value={preferences.quietStart} onChange={e => handleTogglePref('quietStart', e.target.value)} className="h-9 px-2 text-sm border rounded bg-white" />
                  <span className="text-xs font-semibold text-muted-foreground">to</span>
                  <input type="time" value={preferences.quietEnd} onChange={e => handleTogglePref('quietEnd', e.target.value)} className="h-9 px-2 text-sm border rounded bg-white" />
                </div>
              </div>

            </div>
          </section>

          {/* 4. Weekly Tracker */}
          <section id="weekly" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b pb-2">
              <CalendarCheck className="w-5 h-5 text-[#01411C]" /> Weekly Tracker
            </h2>
            <div className="p-5 bg-white border rounded-2xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Enable Tracker Module</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-md">The weekly tracker asks you to log your variable spending once a week to ensure you remain inside your monthly budget.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={preferences.weeklyTracker} 
                    onChange={e => handleTogglePref('weeklyTracker', e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01411C]"></div>
                </label>
              </div>

              {preferences.weeklyTracker && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <p className="text-sm font-medium text-amber-900">
                    Next reminder: {getNextSunday()}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 5. Privacy & Security */}
          <section id="security" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b pb-2">
              <Shield className="w-5 h-5 text-[#01411C]" /> Privacy & Security
            </h2>
            
            <div className="space-y-3">
              <button 
                onClick={() => document.cookie = "pennywise_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"} 
                className="w-full p-4 bg-white border border-border rounded-xl text-left hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Cookie Preferences</h3>
                  <p className="text-xs text-muted-foreground">Click here to re-open the cookie banner.</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </button>

              <button 
                onClick={handleDownloadData}
                className="w-full p-4 bg-white border border-border rounded-xl text-left hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Download My Data</h3>
                  <p className="text-xs text-muted-foreground">Export a JSON file containing all your inputs and preferences.</p>
                </div>
                <FileDown className="w-4 h-4 text-muted-foreground" />
              </button>

              <button 
                onClick={() => setDeleteModalOpen(true)}
                className="w-full p-4 bg-red-50 border border-red-100 rounded-xl text-left hover:bg-red-100 transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <h3 className="text-sm font-semibold text-red-700">Delete Account</h3>
                  <p className="text-xs text-red-600/80">Permanently delete your account and wipe all data serverside.</p>
                </div>
                <Trash2 className="w-4 h-4 text-red-600 opacity-50 group-hover:opacity-100" />
              </button>
            </div>
          </section>

          {/* 6. About */}
          <section id="about" className="space-y-4 border-t pt-8">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#01411C] flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">PennyWise v1.0.0</h2>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <a href="/terms" className="text-xs text-[#01411C] hover:underline">Terms & Conditions</a>
                  <span className="text-gray-300">•</span>
                  <a href="/privacy" className="text-xs text-[#01411C] hover:underline">Privacy Policy</a>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground max-w-sm mt-4">
                Disclaimer: PennyWise is a financial tool, not a licensed financial advisor. All projections, inflation rates, and health scores are estimates based on user input.
              </p>
            </div>
          </section>

        </div>
      </div>

      {/* ── Modals ── */}
      
      {/* Change Password Modal */}
      {pwdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl animate-scale-in">
            <div className="p-6 pb-2">
              <h2 className="text-lg font-bold text-foreground">Change Password</h2>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Current Password</label>
                <input 
                  type="password" required
                  value={pwdForm.current} onChange={e => setPwdForm({...pwdForm, current: e.target.value})}
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-[#01411C] outline-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">New Password</label>
                <input 
                  type="password" required minLength="8"
                  value={pwdForm.new} onChange={e => setPwdForm({...pwdForm, new: e.target.value})}
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-[#01411C] outline-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
                <input 
                  type="password" required minLength="8"
                  value={pwdForm.confirm} onChange={e => setPwdForm({...pwdForm, confirm: e.target.value})}
                  className="w-full h-11 px-3 border rounded-xl focus:ring-2 focus:ring-[#01411C] outline-none text-sm"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setPwdModalOpen(false)} className="flex-1 h-11 border rounded-xl text-sm font-semibold hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 h-11 bg-[#01411C] text-white rounded-xl text-sm font-semibold hover:bg-[#026b2e] cursor-pointer">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl animate-scale-in">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-center text-foreground">Delete Account completely?</h2>
              <p className="text-sm text-center text-muted-foreground">
                This will wipe out all your financial data, goals, and history. This action <strong>cannot be undone</strong>.
              </p>
              
              <div className="pt-2">
                <label className="text-xs font-semibold text-foreground mb-1 block text-center">Type <span className="font-mono text-red-600 font-bold bg-red-50 px-1 rounded">DELETE</span> to confirm</label>
                <input 
                  type="text" 
                  value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                  className="w-full h-11 px-3 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm text-center tracking-widest font-mono"
                  placeholder="DELETE"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button onClick={() => { setDeleteModalOpen(false); setDeleteInput(''); }} className="flex-1 h-11 border rounded-xl text-sm font-semibold hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button onClick={handleDeleteAccount} disabled={deleteInput !== 'DELETE'} className="flex-1 h-11 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer">Yes, Erase Everything</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
