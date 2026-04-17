// ============================================
// PennyWise — Inflation Data Aggregator Service
//
// Scrapes Pakistani commodity prices and caches
// them in the inflation_cache table. Every function
// is designed to fail gracefully — if scraping fails,
// the last cached value is returned with a stale flag.
// ============================================

const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../config/db');

// ── Shared helpers ──

const SCRAPE_TIMEOUT = 10000; // 10 seconds
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function httpGet(url) {
  return axios.get(url, {
    timeout: SCRAPE_TIMEOUT,
    headers: { 'User-Agent': USER_AGENT },
  });
}

/**
 * Upsert a price into the inflation_cache table.
 * Rather than updating, we INSERT a new row each time
 * so that the history endpoint can return a time-series.
 */
async function cachePrice(dataType, value, unit, source) {
  await db.query(
    `INSERT INTO inflation_cache (data_type, value, unit, source, fetched_at, valid_until)
     VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '12 hours')`,
    [dataType, value, unit, source]
  );
}

/**
 * Return the last cached value for a given data_type.
 * Used as fallback when scraping fails.
 */
async function getCached(dataType) {
  const result = await db.query(
    `SELECT value, unit, source, fetched_at, valid_until
     FROM inflation_cache
     WHERE data_type = $1
     ORDER BY fetched_at DESC LIMIT 1`,
    [dataType]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    value: parseFloat(row.value),
    unit: row.unit,
    source: row.source,
    fetched_at: row.fetched_at,
    stale: row.valid_until ? new Date(row.valid_until) < new Date() : true,
  };
}

function sanityCheck(value, min, max) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max ? num : null;
}

// ════════════════════════════════════════════════
// 1. fetchPetrolPrice()
// ════════════════════════════════════════════════
async function fetchPetrolPrice() {
  const DATA_TYPE = 'petrol_price';
  try {
    // Attempt OGRA website
    const { data: html } = await httpGet('https://www.ogra.org.pk/');
    const $ = cheerio.load(html);

    // Try common patterns on OGRA site
    let price = null;

    // Pattern 1: Look for text containing "Petrol" and a number
    $('td, span, div, p').each((_, el) => {
      const text = $(el).text();
      if (/petrol|ms\s*premium|motor\s*spirit/i.test(text)) {
        const match = text.match(/(\d{2,3}(?:\.\d{1,2})?)/);
        if (match) {
          const candidate = sanityCheck(match[1], 200, 500);
          if (candidate && !price) price = candidate;
        }
      }
    });

    if (price) {
      await cachePrice(DATA_TYPE, price, 'PKR/liter', 'ogra.org.pk');
      return { value: price, unit: 'PKR/liter', source: 'ogra.org.pk', stale: false };
    }

    // If parsing fails, try alternate source
    const altPrice = await tryAlternateSource(DATA_TYPE, 'petrol', 200, 500);
    if (altPrice) return altPrice;

    // Fallback to cache
    throw new Error('Scraping returned no valid price');
  } catch (err) {
    console.warn(`Inflation Service — fetchPetrolPrice failed: ${err.message}`);
    const cached = await getCached(DATA_TYPE);
    if (cached) return cached;

    // Ultimate fallback: seed default
    const defaultPrice = 293.0;
    await cachePrice(DATA_TYPE, defaultPrice, 'PKR/liter', 'default');
    return { value: defaultPrice, unit: 'PKR/liter', source: 'default', stale: true };
  }
}

// ════════════════════════════════════════════════
// 2. fetchChickenPrice()
// ════════════════════════════════════════════════
async function fetchChickenPrice() {
  const DATA_TYPE_BROILER = 'chicken_broiler';
  const DATA_TYPE_DESI = 'chicken_desi';
  const results = {};

  try {
    // Try scraping a Pakistani market price aggregator
    const { data: html } = await httpGet('https://www.pakwheels.com/blog/'); // placeholder — actual market site
    const $ = cheerio.load(html);

    let broilerPrice = null;
    let desiPrice = null;

    // Attempt parsing; for most Pakistani price sites, look for table rows
    $('td, span, p').each((_, el) => {
      const text = $(el).text();
      if (/broiler|chicken\s*farm/i.test(text)) {
        const match = text.match(/(\d{3,4}(?:\.\d{1,2})?)/);
        if (match) broilerPrice = sanityCheck(match[1], 200, 1500);
      }
      if (/desi\s*chicken|desi\s*murgh/i.test(text)) {
        const match = text.match(/(\d{3,4}(?:\.\d{1,2})?)/);
        if (match) desiPrice = sanityCheck(match[1], 200, 1500);
      }
    });

    if (broilerPrice) {
      await cachePrice(DATA_TYPE_BROILER, broilerPrice, 'PKR/kg', 'market-scrape');
      results.broiler = { value: broilerPrice, unit: 'PKR/kg', source: 'market-scrape', stale: false };
    }
    if (desiPrice) {
      await cachePrice(DATA_TYPE_DESI, desiPrice, 'PKR/kg', 'market-scrape');
      results.desi = { value: desiPrice, unit: 'PKR/kg', source: 'market-scrape', stale: false };
    }

    // If we got at least one, return
    if (Object.keys(results).length > 0) return results;
    throw new Error('No chicken prices found');
  } catch (err) {
    console.warn(`Inflation Service — fetchChickenPrice failed: ${err.message}`);

    // Fallback to cache
    const cachedBroiler = await getCached(DATA_TYPE_BROILER);
    const cachedDesi = await getCached(DATA_TYPE_DESI);

    results.broiler = cachedBroiler || (() => {
      cachePrice(DATA_TYPE_BROILER, 380, 'PKR/kg', 'default');
      return { value: 380, unit: 'PKR/kg', source: 'default', stale: true };
    })();
    results.desi = cachedDesi || (() => {
      cachePrice(DATA_TYPE_DESI, 850, 'PKR/kg', 'default');
      return { value: 850, unit: 'PKR/kg', source: 'default', stale: true };
    })();

    return results;
  }
}

// ════════════════════════════════════════════════
// 3. fetchCookingOilPrice()
// ════════════════════════════════════════════════
async function fetchCookingOilPrice() {
  const DATA_TYPE = 'cooking_oil';
  try {
    const { data: html } = await httpGet('https://www.google.com/search?q=cooking+oil+price+pakistan+today+per+liter');
    const $ = cheerio.load(html);

    let price = null;
    $('span, div').each((_, el) => {
      const text = $(el).text();
      if (/cooking\s*oil|dalda|habib/i.test(text)) {
        const match = text.match(/(\d{3}(?:\.\d{1,2})?)/);
        if (match) {
          const candidate = sanityCheck(match[1], 300, 800);
          if (candidate && !price) price = candidate;
        }
      }
    });

    if (price) {
      await cachePrice(DATA_TYPE, price, 'PKR/liter', 'web-scrape');
      return { value: price, unit: 'PKR/liter', source: 'web-scrape', stale: false };
    }
    throw new Error('No cooking oil price parsed');
  } catch (err) {
    console.warn(`Inflation Service — fetchCookingOilPrice failed: ${err.message}`);
    const cached = await getCached(DATA_TYPE);
    if (cached) return cached;

    const defaultPrice = 450.0;
    await cachePrice(DATA_TYPE, defaultPrice, 'PKR/liter', 'default');
    return { value: defaultPrice, unit: 'PKR/liter', source: 'default', stale: true };
  }
}

// ════════════════════════════════════════════════
// 4. fetchAttaPrice()
// ════════════════════════════════════════════════
async function fetchAttaPrice() {
  const DATA_TYPE = 'atta';
  try {
    const { data: html } = await httpGet('https://www.google.com/search?q=flour+atta+price+pakistan+today+per+kg');
    const $ = cheerio.load(html);

    let price = null;
    $('span, div').each((_, el) => {
      const text = $(el).text();
      if (/atta|flour|wheat/i.test(text)) {
        const match = text.match(/(\d{2,3}(?:\.\d{1,2})?)/);
        if (match) {
          const candidate = sanityCheck(match[1], 80, 400);
          if (candidate && !price) price = candidate;
        }
      }
    });

    if (price) {
      await cachePrice(DATA_TYPE, price, 'PKR/kg', 'web-scrape');
      return { value: price, unit: 'PKR/kg', source: 'web-scrape', stale: false };
    }
    throw new Error('No atta price parsed');
  } catch (err) {
    console.warn(`Inflation Service — fetchAttaPrice failed: ${err.message}`);
    const cached = await getCached(DATA_TYPE);
    if (cached) return cached;

    const defaultPrice = 120.0;
    await cachePrice(DATA_TYPE, defaultPrice, 'PKR/kg', 'default');
    return { value: defaultPrice, unit: 'PKR/kg', source: 'default', stale: true };
  }
}

// ════════════════════════════════════════════════
// 5. fetchInflationRate()
// ════════════════════════════════════════════════
async function fetchInflationRate() {
  const DATA_TYPE = 'cpi';
  try {
    // Try Pakistan Bureau of Statistics
    const { data: html } = await httpGet('https://www.pbs.gov.pk/');
    const $ = cheerio.load(html);

    let rate = null;
    $('td, span, p, div, h1, h2, h3, h4').each((_, el) => {
      const text = $(el).text();
      if (/cpi|inflation|consumer\s*price/i.test(text)) {
        const match = text.match(/(\d{1,3}(?:\.\d{1,2})?)[\s]*%/);
        if (match) {
          const candidate = sanityCheck(match[1], -5, 100);
          if (candidate !== null && rate === null) rate = candidate;
        }
      }
    });

    if (rate !== null) {
      await cachePrice(DATA_TYPE, rate, '%', 'pbs.gov.pk');
      return { value: rate, unit: '%', source: 'pbs.gov.pk', stale: false };
    }
    throw new Error('No CPI rate parsed');
  } catch (err) {
    console.warn(`Inflation Service — fetchInflationRate failed: ${err.message}`);
    const cached = await getCached(DATA_TYPE);
    if (cached) return cached;

    const defaultRate = 12.0;
    await cachePrice(DATA_TYPE, defaultRate, '%', 'default');
    return { value: defaultRate, unit: '%', source: 'default', stale: true };
  }
}

// ════════════════════════════════════════════════
// 6. refreshAllPrices()
// ════════════════════════════════════════════════
async function refreshAllPrices() {
  console.log('📊 Inflation Service — Starting price refresh...');

  const results = {};
  const tasks = [
    { name: 'petrol', fn: fetchPetrolPrice },
    { name: 'chicken', fn: fetchChickenPrice },
    { name: 'cooking_oil', fn: fetchCookingOilPrice },
    { name: 'atta', fn: fetchAttaPrice },
    { name: 'inflation_rate', fn: fetchInflationRate },
  ];

  for (const task of tasks) {
    try {
      results[task.name] = await task.fn();
      console.log(`   ✅ ${task.name}: success`);
    } catch (err) {
      console.error(`   ❌ ${task.name}: ${err.message}`);
      results[task.name] = { error: err.message };
    }
  }

  console.log('📊 Inflation Service — Price refresh complete.');
  return results;
}

// ════════════════════════════════════════════════
// 7. getLatestPrices() — Read all from DB
// ════════════════════════════════════════════════
async function getLatestPrices() {
  const types = [
    'petrol_price', 'chicken_broiler', 'chicken_desi',
    'cooking_oil', 'atta', 'cpi',
  ];

  const result = await db.query(
    `SELECT DISTINCT ON (data_type)
       data_type, value, unit, source, fetched_at, valid_until
     FROM inflation_cache
     WHERE data_type = ANY($1)
     ORDER BY data_type, fetched_at DESC`,
    [types]
  );

  const map = {};
  for (const row of result.rows) {
    map[row.data_type] = {
      value: parseFloat(row.value),
      unit: row.unit,
      source: row.source,
      fetched_at: row.fetched_at,
      stale: row.valid_until ? new Date(row.valid_until) < new Date() : true,
    };
  }

  // Build the frontend-friendly format
  const now = new Date();
  const lastEntry = result.rows[0];
  const lastUpdated = lastEntry ? lastEntry.fetched_at : now;

  return {
    petrol: map.petrol_price || null,
    chicken_broiler: map.chicken_broiler || null,
    chicken_desi: map.chicken_desi || null,
    cooking_oil: map.cooking_oil || null,
    atta: map.atta || null,
    inflation_rate: map.cpi || null,
    last_updated: lastUpdated,

    // Formatted prices array for the InflationTicker component
    prices: buildTickerPrices(map),
  };
}

/**
 * Build the array format expected by the frontend InflationTicker.
 * Each item: { item, price, unit, change, emoji }
 */
function buildTickerPrices(map) {
  const items = [];

  if (map.petrol_price) {
    items.push({ item: 'Petrol', price: map.petrol_price.value, unit: '/L', change: 0, emoji: '⛽' });
  }
  if (map.chicken_broiler) {
    items.push({ item: 'Chicken', price: map.chicken_broiler.value, unit: '/kg', change: 0, emoji: '🐔' });
  }
  if (map.cooking_oil) {
    items.push({ item: 'Cooking Oil', price: map.cooking_oil.value, unit: '/L', change: 0, emoji: '🫙' });
  }
  if (map.atta) {
    items.push({ item: 'Flour (Atta)', price: map.atta.value, unit: '/kg', change: 0, emoji: '🌾' });
  }

  // Calculate % change from the second-most-recent entry
  // This is handled async elsewhere; for now, return 0
  return items;
}

// ════════════════════════════════════════════════
// 8. getPriceHistory(dataType, days)
// ════════════════════════════════════════════════
async function getPriceHistory(dataType, days = 30) {
  const result = await db.query(
    `SELECT value, fetched_at
     FROM inflation_cache
     WHERE data_type = $1
       AND fetched_at >= NOW() - INTERVAL '${days} days'
     ORDER BY fetched_at ASC`,
    [dataType]
  );
  return result.rows.map((r) => ({
    value: parseFloat(r.value),
    date: r.fetched_at,
  }));
}

// ════════════════════════════════════════════════
// Helper: try alternate source
// ════════════════════════════════════════════════
async function tryAlternateSource(dataType, keyword, min, max) {
  try {
    const { data: html } = await httpGet(
      `https://www.google.com/search?q=${encodeURIComponent(keyword + ' price pakistan today')}`
    );
    const $ = cheerio.load(html);

    let price = null;
    $('span, div').each((_, el) => {
      const text = $(el).text();
      const match = text.match(/(\d{2,4}(?:\.\d{1,2})?)/);
      if (match) {
        const candidate = sanityCheck(match[1], min, max);
        if (candidate && !price) price = candidate;
      }
    });

    if (price) {
      await cachePrice(dataType, price, 'PKR', 'alternate-scrape');
      return { value: price, unit: 'PKR', source: 'alternate-scrape', stale: false };
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = {
  fetchPetrolPrice,
  fetchChickenPrice,
  fetchCookingOilPrice,
  fetchAttaPrice,
  fetchInflationRate,
  refreshAllPrices,
  getLatestPrices,
  getPriceHistory,
  getCached,
};
