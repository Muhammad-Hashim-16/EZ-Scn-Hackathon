// ============================================
// Dashboard — Inflation Ticker
// Horizontally scrolling price marquee
// ============================================

import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

// Fallback data — real PBS Weekly SPI prices (April 2026)
const FALLBACK_PRICES = [
  { item: 'Petrol', price: 252.10, unit: '/L', change: 0, emoji: '⛽' },
  { item: 'Chicken', price: 478.61, unit: '/kg', change: 1.9, emoji: '🐔' },
  { item: 'Cooking Oil', price: 555.82, unit: '/L', change: 0.9, emoji: '🫙' },
  { item: 'Flour (Atta)', price: 118.50, unit: '/kg', change: 0.6, emoji: '🌾' },
  { item: 'Sugar', price: 146.23, unit: '/kg', change: 0.8, emoji: '🍬' },
  { item: 'Electricity', price: 44.50, unit: '/kWh', change: 0, emoji: '⚡' },
  { item: 'Rice (Basmati)', price: 312.40, unit: '/kg', change: 0.8, emoji: '🍚' },
  { item: 'Milk', price: 220, unit: '/L', change: 0.9, emoji: '🥛' },
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
