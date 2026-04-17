// ============================================
// Dashboard — Inflation Ticker
// Horizontally scrolling price marquee
// ============================================

import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

// Fallback data when API is unavailable or loading
const FALLBACK_PRICES = [
  { item: 'Petrol', price: 293, unit: '/L', change: 3, emoji: '⛽' },
  { item: 'Chicken', price: 380, unit: '/kg', change: -2, emoji: '🐔' },
  { item: 'Cooking Oil', price: 450, unit: '/L', change: 8, emoji: '🫙' },
  { item: 'Flour (Atta)', price: 120, unit: '/kg', change: 5, emoji: '🌾' },
  { item: 'Sugar', price: 145, unit: '/kg', change: -1, emoji: '🍬' },
  { item: 'Electricity', price: 42, unit: '/kWh', change: 12, emoji: '⚡' },
  { item: 'Rice (Basmati)', price: 310, unit: '/kg', change: 4, emoji: '🍚' },
  { item: 'Milk', price: 220, unit: '/L', change: 6, emoji: '🥛' },
];

export default function InflationTicker({ accessToken }) {
  const [prices, setPrices] = useState(FALLBACK_PRICES);

  useEffect(() => {
    let interval;

    async function fetchPrices() {
      try {
        const res = await fetch(`${API_URL}/api/inflation/latest`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success && data.prices && data.prices.length > 0) {
          setPrices(data.prices);
        }
      } catch {
        // Keep fallback data
      }
    }

    fetchPrices();
    interval = setInterval(fetchPrices, REFRESH_MS);

    return () => clearInterval(interval);
  }, [accessToken]);

  // Duplicate the array for seamless loop
  const doubled = [...prices, ...prices];

  return (
    <div className="relative overflow-hidden rounded-xl bg-gray-900 py-3">
      {/* Gradient edges for fading */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-900 to-transparent z-10 pointer-events-none" />

      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 mx-6 text-sm text-gray-200"
          >
            <span>{item.emoji}</span>
            <span className="font-medium">{item.item}:</span>
            <span className="font-bold text-white">
              PKR {item.price}{item.unit}
            </span>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                item.change > 0
                  ? 'text-red-400 bg-red-400/10'
                  : item.change < 0
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-gray-400 bg-gray-400/10'
              }`}
            >
              {item.change > 0 ? '+' : ''}{item.change}%
            </span>
            <span className="text-gray-600 ml-3">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}
