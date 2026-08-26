/**
 * NSE OI Pulse - Frontend Application Logic
 * End of Day Open Interest Scanner & Derivatives Analytics
 */

// Application State
const state = {
  data: null,
  filteredStocks: [],
  activeCategory: "ALL",
  activeSector: "ALL",
  activePreset: null,
  searchQuery: "",
  sortBy: "OI_CHG_DESC",
  charts: {
    quadrant: null,
    optionsStrike: null,
  },
};

// Color Definitions
const COLORS = {
  emerald: "#10b981",
  emeraldBg: "rgba(16, 185, 129, 0.65)",
  rose: "#f43f5e",
  roseBg: "rgba(244, 63, 94, 0.65)",
  sky: "#0ea5e9",
  skyBg: "rgba(14, 165, 233, 0.65)",
  amber: "#f59e0b",
  amberBg: "rgba(245, 158, 11, 0.65)",
  gridBorder: "rgba(255, 255, 255, 0.08)",
  textSecondary: "#94a3b8",
};

const INDEX_SYMBOLS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50", "NIFTYFPI", "NIFTYIT", "NIFTYPSE", "SENSEX", "BANKEX"];

function isIndex(sym, sector) {
  if (!sym) return true;
  const s = String(sym).trim().toUpperCase();
  return (
    INDEX_SYMBOLS.includes(s) ||
    s.startsWith("NIFTY") ||
    s.startsWith("BANKNIFTY") ||
    s.startsWith("FINNIFTY") ||
    s.startsWith("MIDCPNIFTY") ||
    (sector && String(sector).toLowerCase() === "index")
  );
}

function formatShortNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const abs = Math.abs(num);
  if (abs >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
  if (abs >= 100000) return (num / 100000).toFixed(2) + " L";
  if (abs >= 1000) return (num / 1000).toFixed(1) + " k";
  return Number(num).toLocaleString("en-IN");
}

function round(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Number(Math.round(val + "e" + decimals) + "e-" + decimals);
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ==========================================================================
// Initialization & Data Loading
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadLatestData();
});

async function loadLatestData() {
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`data/latest.json?t=${timestamp}`);
    if (!response.ok) {
      throw new Error(`Failed to load data/latest.json (Status: ${response.status})`);
    }
    const json = await response.json();
    state.data = json;
    initDashboard();
  } catch (error) {
    console.warn("Could not load data/latest.json directly.", error);
    showNoDataFallback();
  }
}

function showNoDataFallback() {
  const tableBody = document.getElementById("tableBody");
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 2rem;">
          <div style="font-size: 1.1rem; font-weight: 600; color: #60a5fa; margin-bottom: 0.5rem;">
            No Data Yet
          </div>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">
            Data updates automatically after market close.
          </p>
        </td>
      </tr>
    `;
  }
}

function initDashboard() {
  if (!state.data || !state.data.stocks) return;

  // Clean data: Filter out all Index derivatives so only individual equity stocks are displayed
  state.data.stocks = state.data.stocks.filter((s) => !isIndex(s.symbol, s.sector));
  if (state.data.sectors) {
    state.data.sectors = state.data.sectors.filter((sec) => String(sec.sector).toLowerCase() !== "index");
  }

  // Recalculate summary metrics exclusively for stocks
  const total = state.data.stocks.length;
  const lb = state.data.stocks.filter((s) => s.category_code === "LB").length;
  const sb = state.data.stocks.filter((s) => s.category_code === "SB").length;
  const sc = state.data.stocks.filter((s) => s.category_code === "SC").length;
  const lu = state.data.stocks.filter((s) => s.category_code === "LU").length;

  const bullWeight = lb * 1.5 + sc * 0.8;
  const bearWeight = sb * 1.5 + lu * 0.8;
  const totWeight = bullWeight + bearWeight || 1;
  const bullPct = Number(((bullWeight / totWeight) * 100).toFixed(1));

  if (!state.data.metadata) state.data.metadata = {};
  state.data.metadata.total_stocks_scanned = total;
  state.data.summary = {
    market_bias: bullPct >= 60 ? "Bullish Dominance (Heavy Long Buildup)" : bullPct <= 40 ? "Bearish Dominance" : "Neutral / Stock-Specific Rotation",
    bullish_pct: bullPct,
    counts: {
      long_buildup: lb,
      short_buildup: sb,
      short_covering: sc,
      long_unwinding: lu,
      total: total,
    },
    top_picks: {
      top_longs: state.data.stocks.filter((s) => s.category_code === "LB").slice(0, 5).map((s) => s.symbol),
      top_shorts: state.data.stocks.filter((s) => s.category_code === "SB").slice(0, 5).map((s) => s.symbol),
      top_short_covering: state.data.stocks.filter((s) => s.category_code === "SC").slice(0, 5).map((s) => s.symbol),
    },
  };

  try { renderMetadata(); } catch (e) { console.error("Error in renderMetadata:", e); }
  try { renderActionableSignals(); } catch (e) { console.error("Error in renderActionableSignals:", e); }
}

// ==========================================================================
// UI Rendering Functions
// ==========================================================================

function renderMetadata() {
  const meta = state.data?.metadata;
  const dateBadge = document.getElementById("headerTradeDate");
  if (dateBadge && meta) {
    dateBadge.textContent = `EOD Trade Date: ${meta.trade_date || "Completed Session"} (${meta.total_stocks_scanned || 0} F&O Stocks)`;
  }
}

function renderActionableSignals() {
  const stocks = state.data?.stocks || [];
  if (stocks.length === 0) return;

  const buyContainer = document.getElementById("buyCardsList");
  const sellContainer = document.getElementById("sellCardsList");
  const biasBadge = document.getElementById("signalsMarketBias");

  // Set Market Posture
  const summary = state.data?.summary;
  if (biasBadge && summary) {
    if (summary.bullish_pct >= 60) {
      biasBadge.textContent = `BULLISH BUY-ON-DIPS (${summary.bullish_pct}% Bullish)`;
      biasBadge.className = "posture-value green";
    } else if (summary.bullish_pct <= 40) {
      biasBadge.textContent = `BEARISH SELL-ON-RISE (${(100 - summary.bullish_pct).toFixed(1)}% Bearish)`;
      biasBadge.className = "posture-value red";
    } else {
      biasBadge.textContent = `NEUTRAL RANGEBOUND (${summary.bullish_pct}% Bullish)`;
      biasBadge.className = "posture-value yellow";
    }
  }

  // 1. TOP BUY CANDIDATES FOR TOMORROW
  let buyCandidates = stocks
    .filter((s) => s.category_code === "LB" && (s.oi_chg_pct || 0) > 0.5 && (s.price_chg_pct || 0) > 0.0)
    .sort((a, b) => {
      const scoreA = (a.oi_chg_pct || 0) * 1.5 + (a.price_chg_pct || 0) * 3.0 + ((a.pcr || 1) >= 1.2 ? 15 : 0);
      const scoreB = (b.oi_chg_pct || 0) * 1.5 + (b.price_chg_pct || 0) * 3.0 + ((b.pcr || 1) >= 1.2 ? 15 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 5);

  if (buyCandidates.length === 0) {
    buyCandidates = stocks.filter((s) => s.category_code === "LB" || s.category_code === "SC").slice(0, 5);
  }

  // 2. TOP SELL CANDIDATES FOR TOMORROW
  let sellCandidates = stocks
    .filter((s) => s.category_code === "SB" && (s.oi_chg_pct || 0) > 0.5 && (s.price_chg_pct || 0) < 0.0)
    .sort((a, b) => {
      const scoreA = (a.oi_chg_pct || 0) * 1.5 + Math.abs(a.price_chg_pct || 0) * 3.0 + ((a.pcr || 1) <= 0.8 ? 15 : 0);
      const scoreB = (b.oi_chg_pct || 0) * 1.5 + Math.abs(b.price_chg_pct || 0) * 3.0 + ((b.pcr || 1) <= 0.8 ? 15 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 5);

  if (sellCandidates.length === 0) {
    sellCandidates = stocks.filter((s) => s.category_code === "SB" || s.category_code === "LU").slice(0, 5);
  }

  // Render Buy Cards
  if (buyContainer) {
    buyContainer.innerHTML = "";
    buyCandidates.forEach((stock) => {
      const ltp = stock.current_price || 0;
      const pxChg = stock.price_chg_pct || 0;
      const oiChg = stock.oi_chg_pct || 0;
      const entryLow = round(ltp * 0.992, 1);
      const entryHigh = round(ltp * 1.003, 1);
      const stopLoss = stock.max_put_strike && stock.max_put_strike < ltp ? stock.max_put_strike : round(ltp * 0.978, 1);
      const target = stock.max_call_strike && stock.max_call_strike > ltp ? stock.max_call_strike : round(ltp * 1.04, 1);

      const card = document.createElement("div");
      card.className = "signal-card";
      card.onclick = () => openStockModal(stock);
      card.innerHTML = `
        <div class="signal-card-top">
          <div class="signal-card-symbol-group">
            <span class="signal-symbol-badge">${stock.symbol}</span>
            <span class="signal-sector-badge">${stock.sector}</span>
          </div>
          <span class="signal-action-pill buy">🟢 BUY ON DIP</span>
        </div>

        <div class="signal-card-price-row">
          <span class="signal-ltp">₹${ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          <span class="signal-price-chg positive">+${pxChg.toFixed(2)}% (OI: +${oiChg.toFixed(1)}%)</span>
        </div>

        <div class="signal-trade-levels">
          <div class="trade-level-item">
            <span class="trade-level-label">Ideal Buy Zone</span>
            <span class="trade-level-val blue">₹${entryLow} - ${entryHigh}</span>
          </div>
          <div class="trade-level-item">
            <span class="trade-level-label">Support / Stop Loss</span>
            <span class="trade-level-val green">₹${stopLoss.toLocaleString()}</span>
          </div>
          <div class="trade-level-item">
            <span class="trade-level-label">Target Ceiling</span>
            <span class="trade-level-val green">₹${target.toLocaleString()}</span>
          </div>
        </div>

        <div class="signal-plain-reason buy">
          💡 <span class="signal-reason-highlight">Why Buy:</span> Fresh institutional long accumulation (+${oiChg.toFixed(1)}% OI expansion). Put support base firmly at ₹${stopLoss.toLocaleString()}.
        </div>
      `;
      buyContainer.appendChild(card);
    });
  }

  // Render Sell Cards
  if (sellContainer) {
    sellContainer.innerHTML = "";
    sellCandidates.forEach((stock) => {
      const ltp = stock.current_price || 0;
      const pxChg = stock.price_chg_pct || 0;
      const oiChg = stock.oi_chg_pct || 0;
      const sellLow = round(ltp * 0.998, 1);
      const sellHigh = round(ltp * 1.008, 1);
      const stopLoss = stock.max_call_strike && stock.max_call_strike > ltp ? stock.max_call_strike : round(ltp * 1.022, 1);
      const target = stock.max_put_strike && stock.max_put_strike < ltp ? stock.max_put_strike : round(ltp * 0.96, 1);

      const card = document.createElement("div");
      card.className = "signal-card";
      card.onclick = () => openStockModal(stock);
      card.innerHTML = `
        <div class="signal-card-top">
          <div class="signal-card-symbol-group">
            <span class="signal-symbol-badge">${stock.symbol}</span>
            <span class="signal-sector-badge">${stock.sector}</span>
          </div>
          <span class="signal-action-pill sell">🔴 SELL ON RISE</span>
        </div>

        <div class="signal-card-price-row">
          <span class="signal-ltp">₹${ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          <span class="signal-price-chg negative">${pxChg.toFixed(2)}% (OI: +${oiChg.toFixed(1)}%)</span>
        </div>

        <div class="signal-trade-levels">
          <div class="trade-level-item">
            <span class="trade-level-label">Ideal Sell Zone</span>
            <span class="trade-level-val blue">₹${sellLow} - ${sellHigh}</span>
          </div>
          <div class="trade-level-item">
            <span class="trade-level-label">Resistance / Stop Loss</span>
            <span class="trade-level-val red">₹${stopLoss.toLocaleString()}</span>
          </div>
          <div class="trade-level-item">
            <span class="trade-level-label">Downside Target</span>
            <span class="trade-level-val red">₹${target.toLocaleString()}</span>
          </div>
        </div>

        <div class="signal-plain-reason sell">
          ⚠️ <span class="signal-reason-highlight">Why Sell:</span> Institutional short buildup (+${oiChg.toFixed(1)}% OI addition on falling price). Resistance ceiling capped at ₹${stopLoss.toLocaleString()}.
        </div>
      `;
      sellContainer.appendChild(card);
    });
  }
}

function renderSummaryKPIs() {
  const summary = state.data?.summary;
  if (!summary) return;

  // Market Bias
  const biasTitle = document.getElementById("biasTitle");
  const biasPercent = document.getElementById("biasPercent");
  const biasBar = document.getElementById("biasProgressBar");
  const biasFootnote = document.getElementById("biasSummaryFootnote");

  if (biasTitle) biasTitle.textContent = summary.market_bias || "Market Sentiment";
  if (biasPercent) biasPercent.textContent = `${summary.bullish_pct || 50}% Bullish`;
  if (biasBar) {
    biasBar.style.width = `${summary.bullish_pct || 50}%`;
  }
  if (biasFootnote) {
    if ((summary.bullish_pct || 50) >= 60) {
      biasFootnote.textContent = "Institutional buyers aggressively positioning for upside continuation.";
    } else if ((summary.bullish_pct || 50) <= 40) {
      biasFootnote.textContent = "Persistent short buildup dominating major sectoral heavyweights.";
    } else {
      biasFootnote.textContent = "Balanced derivatives activity; selective stock-specific momentum.";
    }
  }

  // Counts
  const counts = summary.counts || {};
  const elLB = document.getElementById("countLB");
  const elSB = document.getElementById("countSB");
  const elSC = document.getElementById("countSC");
  const elLU = document.getElementById("countLU");

  if (elLB) elLB.textContent = counts.long_buildup || 0;
  if (elSB) elSB.textContent = counts.short_buildup || 0;
  if (elSC) elSC.textContent = counts.short_covering || 0;
  if (elLU) elLU.textContent = counts.long_unwinding || 0;

  const tabAll = document.getElementById("tabCountAll");
  const tabLB = document.getElementById("tabCountLB");
  const tabSB = document.getElementById("tabCountSB");
  const tabSC = document.getElementById("tabCountSC");
  const tabLU = document.getElementById("tabCountLU");

  if (tabAll) tabAll.textContent = counts.total || 0;
  if (tabLB) tabLB.textContent = counts.long_buildup || 0;
  if (tabSB) tabSB.textContent = counts.short_buildup || 0;
  if (tabSC) tabSC.textContent = counts.short_covering || 0;
  if (tabLU) tabLU.textContent = counts.long_unwinding || 0;

  // Top picks in KPIs
  const topPicks = summary.top_picks;
  if (topPicks) {
    const elTopLB = document.getElementById("topStockLB");
    const elTopSB = document.getElementById("topStockSB");
    const elTopSC = document.getElementById("topStockSC");
    const elTopLU = document.getElementById("topStockLU");

    if (elTopLB) elTopLB.textContent = "Top: " + (topPicks.top_longs?.slice(0, 3).join(", ") || "Active Longs");
    if (elTopSB) elTopSB.textContent = "Top: " + (topPicks.top_shorts?.slice(0, 3).join(", ") || "Active Shorts");
    if (elTopSC) elTopSC.textContent = "Top: " + (topPicks.top_short_covering?.slice(0, 3).join(", ") || "Short Exits");
    if (elTopLU) elTopLU.textContent = "Top: Longs squaring off";
  }
}

function populateSectorDropdown() {
  const select = document.getElementById("sectorSelect");
  if (!select || !state.data?.sectors) return;

  select.innerHTML = `<option value="ALL">All Sectors (${state.data.sectors.length})</option>`;
  state.data.sectors.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.sector;
    opt.textContent = `${s.sector} (${s.total_stocks})`;
    select.appendChild(opt);
  });
}

function renderSectorFlow() {
  const container = document.getElementById("sectorBarsList");
  if (!container || !state.data?.sectors) return;

  container.innerHTML = "";

  state.data.sectors.forEach((sec) => {
    const tot = sec.total_stocks || 1;
    const lbPct = (sec.long_buildup / tot) * 100;
    const scPct = (sec.short_covering / tot) * 100;
    const sbPct = (sec.short_buildup / tot) * 100;
    const luPct = (sec.long_unwinding / tot) * 100;

    const row = document.createElement("div");
    row.className = "sector-row";
    row.onclick = () => {
      const secSelect = document.getElementById("sectorSelect");
      if (secSelect) secSelect.value = sec.sector;
      state.activeSector = sec.sector;
      applyFiltersAndRender();
    };

    const ratioColor = (sec.bullish_ratio || 50) >= 65 ? "positive" : ((sec.bullish_ratio || 50) <= 35 ? "negative" : "neutral");

    row.innerHTML = `
      <div class="sector-row-top">
        <span class="sector-name">${sec.sector}</span>
        <span class="sector-ratio-pill ${ratioColor}">${sec.bullish_ratio || 50}% Bullish (${sec.total_stocks} stocks)</span>
      </div>
      <div class="sector-bar-stacked" title="LB: ${sec.long_buildup}, SC: ${sec.short_covering}, SB: ${sec.short_buildup}, LU: ${sec.long_unwinding}">
        <div class="bar-segment lb" style="width: ${lbPct}%"></div>
        <div class="bar-segment sc" style="width: ${scPct}%"></div>
        <div class="bar-segment sb" style="width: ${sbPct}%"></div>
        <div class="bar-segment lu" style="width: ${luPct}%"></div>
      </div>
    `;

    container.appendChild(row);
  });
}

// ==========================================================================
// Chart.js Visualizations
// ==========================================================================

function renderQuadrantChart() {
  const ctx = document.getElementById("quadrantChart");
  if (!ctx || !state.data?.stocks) return;

  if (state.charts.quadrant) {
    try { state.charts.quadrant.destroy(); } catch (e) {}
  }

  // Group by quadrant
  const datasets = [
    {
      label: "Long Buildup (Price ▲, OI ▲)",
      data: state.data.stocks
        .filter((s) => s.category_code === "LB")
        .map((s) => ({ x: s.price_chg_pct || 0, y: s.oi_chg_pct || 0, raw: s })),
      backgroundColor: COLORS.emeraldBg,
      borderColor: COLORS.emerald,
      pointHoverRadius: 8,
      pointRadius: 6,
    },
    {
      label: "Short Buildup (Price ▼, OI ▲)",
      data: state.data.stocks
        .filter((s) => s.category_code === "SB")
        .map((s) => ({ x: s.price_chg_pct || 0, y: s.oi_chg_pct || 0, raw: s })),
      backgroundColor: COLORS.roseBg,
      borderColor: COLORS.rose,
      pointHoverRadius: 8,
      pointRadius: 6,
    },
    {
      label: "Short Covering (Price ▲, OI ▼)",
      data: state.data.stocks
        .filter((s) => s.category_code === "SC")
        .map((s) => ({ x: s.price_chg_pct || 0, y: s.oi_chg_pct || 0, raw: s })),
      backgroundColor: COLORS.skyBg,
      borderColor: COLORS.sky,
      pointHoverRadius: 8,
      pointRadius: 6,
    },
    {
      label: "Long Unwinding (Price ▼, OI ▼)",
      data: state.data.stocks
        .filter((s) => s.category_code === "LU")
        .map((s) => ({ x: s.price_chg_pct || 0, y: s.oi_chg_pct || 0, raw: s })),
      backgroundColor: COLORS.amberBg,
      borderColor: COLORS.amber,
      pointHoverRadius: 8,
      pointRadius: 6,
    },
  ];

  try {
    state.charts.quadrant = new Chart(ctx, {
      type: "scatter",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const el = elements[0];
            const stock = datasets[el.datasetIndex].data[el.index].raw;
            openStockModal(stock);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(16, 21, 34, 0.95)",
            titleColor: "#ffffff",
            bodyColor: "#cbd5e1",
            borderColor: "rgba(255, 255, 255, 0.15)",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: (items) => {
                const raw = items[0].raw.raw;
                return `${raw.symbol} (${raw.category})`;
              },
              label: (item) => {
                const raw = item.raw.raw;
                return [
                  `Price: ₹${(raw.current_price || 0).toLocaleString()} (${(raw.price_chg_pct || 0) > 0 ? "+" : ""}${raw.price_chg_pct}%)`,
                  `OI Change: ${(raw.oi_chg_pct || 0) > 0 ? "+" : ""}${raw.oi_chg_pct}%`,
                  `Conviction Score: ${raw.conviction_score || 50}/100`,
                  `Click to view Options & Strategy`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Price % Change",
              color: COLORS.textSecondary,
              font: { size: 11, weight: "bold" },
            },
            grid: {
              color: (c) => (c.tick.value === 0 ? "rgba(255, 255, 255, 0.25)" : COLORS.gridBorder),
              lineWidth: (c) => (c.tick.value === 0 ? 1.5 : 1),
            },
            ticks: {
              color: COLORS.textSecondary,
              callback: (v) => `${v}%`,
            },
          },
          y: {
            title: {
              display: true,
              text: "Total Futures OI % Change",
              color: COLORS.textSecondary,
              font: { size: 11, weight: "bold" },
            },
            grid: {
              color: (c) => (c.tick.value === 0 ? "rgba(255, 255, 255, 0.25)" : COLORS.gridBorder),
              lineWidth: (c) => (c.tick.value === 0 ? 1.5 : 1),
            },
            ticks: {
              color: COLORS.textSecondary,
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("Chart.js error:", err);
  }
}

function renderOptionsStrikeChart(stock) {
  const ctx = document.getElementById("optionsStrikeChart");
  if (!ctx) return;

  if (state.charts.optionsStrike) {
    try { state.charts.optionsStrike.destroy(); } catch (e) {}
  }

  const chain = stock.options_chain || [];
  if (chain.length === 0) {
    return;
  }

  const labels = chain.map((c) => Number(c.strike).toLocaleString());
  const callData = chain.map((c) => c.call_oi || 0);
  const putData = chain.map((c) => c.put_oi || 0);

  try {
    state.charts.optionsStrike = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Call OI (Resistance)",
            data: callData,
            backgroundColor: COLORS.rose,
            borderRadius: 4,
          },
          {
            label: "Put OI (Support)",
            data: putData,
            backgroundColor: COLORS.emerald,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: COLORS.textSecondary, font: { size: 10 } },
          },
        },
        scales: {
          x: {
            ticks: { color: COLORS.textSecondary, font: { size: 10 } },
            grid: { color: COLORS.gridBorder },
          },
          y: {
            ticks: {
              color: COLORS.textSecondary,
              font: { size: 10 },
              callback: (v) => formatShortNumber(v),
            },
            grid: { color: COLORS.gridBorder },
          },
        },
      },
    });
  } catch (err) {
    console.error("Strike Chart error:", err);
  }
}

// ==========================================================================
// Filtering, Sorting & Table Rendering
// ==========================================================================

function applyFiltersAndRender() {
  if (!state.data || !state.data.stocks) return;

  let list = [...state.data.stocks];

  // 1. Category Filter
  if (state.activeCategory !== "ALL") {
    list = list.filter((s) => s.category_code === state.activeCategory);
  }

  // 2. Sector Filter
  if (state.activeSector !== "ALL") {
    list = list.filter((s) => s.sector === state.activeSector);
  }

  // 3. Search Query
  if (state.searchQuery.trim() !== "") {
    const q = state.searchQuery.trim().toUpperCase();
    list = list.filter((s) => s.symbol.includes(q) || (s.sector && s.sector.toUpperCase().includes(q)));
  }

  // 4. Quick Presets
  if (state.activePreset === "HIGH_BUYER") {
    list = list.filter((s) => s.category_code === "LB" && (s.conviction_score || 50) >= 80);
  } else if (state.activePreset === "OI_SURGE") {
    list = list.filter((s) => Math.abs(s.oi_chg_pct || 0) >= 10);
  } else if (state.activePreset === "SHORT_SQUEEZE") {
    list = list.filter((s) => s.category_code === "SC" && (s.price_chg_pct || 0) >= 2.0);
  } else if (state.activePreset === "HIGH_PCR") {
    list = list.filter((s) => (s.pcr || 1) >= 1.3);
  }

  // 5. Sorting
  list.sort((a, b) => {
    switch (state.sortBy) {
      case "OI_CHG_DESC":
        return Math.abs(b.oi_chg_pct || 0) - Math.abs(a.oi_chg_pct || 0);
      case "PRICE_CHG_DESC":
        return (b.price_chg_pct || 0) - (a.price_chg_pct || 0);
      case "PRICE_CHG_ASC":
        return (a.price_chg_pct || 0) - (b.price_chg_pct || 0);
      case "CONVICTION_DESC":
        return (b.conviction_score || 50) - (a.conviction_score || 50);
      case "TOTAL_OI_DESC":
        return (b.total_oi || 0) - (a.total_oi || 0);
      case "SYMBOL_ASC":
        return a.symbol.localeCompare(b.symbol);
      default:
        return 0;
    }
  });

  state.filteredStocks = list;
  renderTable(list);
}

function renderTable(stocks) {
  const tableBody = document.getElementById("tableBody");
  const noResults = document.getElementById("noResults");

  if (!tableBody) return;

  if (stocks.length === 0) {
    tableBody.innerHTML = "";
    if (noResults) noResults.classList.remove("hidden");
    return;
  }

  if (noResults) noResults.classList.add("hidden");

  let html = "";
  stocks.forEach((stock) => {
    const pxVal = stock.price_chg_pct || 0;
    const oiVal = stock.oi_chg_pct || 0;
    const pxClass = pxVal >= 0 ? "positive" : "negative";
    const oiClass = oiVal >= 0 ? "positive" : "negative";
    const badgeColor = stock.category_color || "emerald";

    const convictionColor =
      stock.category_code === "LB"
        ? COLORS.emerald
        : stock.category_code === "SB"
        ? COLORS.rose
        : stock.category_code === "SC"
        ? COLORS.sky
        : COLORS.amber;

    const curPrice = stock.current_price || 0;
    const conviction = stock.conviction_score || 50;
    const planText = stock.next_day_plan || "Monitor support/resistance levels.";

    html += `
      <tr onclick="window.openStockDetail('${stock.symbol}')">
        <td>
          <div class="symbol-cell">
            <span class="stock-symbol">${stock.symbol}</span>
            <span class="stock-sector-sub">${stock.sector || "F&O Stock"}</span>
          </div>
        </td>
        <td>
          <span style="color: var(--text-secondary); font-size: 0.78rem;">${stock.sector || "General"}</span>
        </td>
        <td class="num-cell text-right">
          ₹${curPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td class="num-cell text-right ${pxClass}">
          ${pxVal > 0 ? "+" : ""}${pxVal.toFixed(2)}%
        </td>
        <td class="num-cell text-right">
          ${formatShortNumber(stock.total_oi)}
        </td>
        <td class="num-cell text-right ${oiClass}">
          ${oiVal > 0 ? "+" : ""}${oiVal.toFixed(2)}%
        </td>
        <td class="text-center">
          <span class="pill-badge ${badgeColor}">
            ${stock.category || "Derivatives"}
          </span>
        </td>
        <td class="text-center">
          <div class="sr-levels">
            <span class="sr-sup">Sup: ₹${stock.max_put_strike ? Number(stock.max_put_strike).toLocaleString() : "N/A"}</span>
            <span class="sr-res">Res: ₹${stock.max_call_strike ? Number(stock.max_call_strike).toLocaleString() : "N/A"}</span>
          </div>
        </td>
        <td class="text-center">
          <div class="conviction-cell" title="Buyer / Seller Conviction Score">
            <div class="conviction-bar">
              <div class="conviction-fill" style="width: ${conviction}%; background-color: ${convictionColor};"></div>
            </div>
            <span class="conviction-val">${conviction}%</span>
          </div>
        </td>
        <td>
          <div class="strategy-cell" title="${escapeHtml(planText)}">
            ${planText.slice(0, 75)}...
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// Global modal opener for inline onclick
window.openStockDetail = function (symbol) {
  if (!state.data || !state.data.stocks) return;
  const stock = state.data.stocks.find((s) => s.symbol === symbol);
  if (stock) {
    openStockModal(stock);
  }
};

function openStockModal(stock) {
  const modal = document.getElementById("stockModal");
  if (!modal) return;

  document.getElementById("modalSymbolBadge").textContent = stock.symbol;
  document.getElementById("modalSymbol").textContent = stock.symbol;
  document.getElementById("modalSector").textContent = stock.sector || "F&O Stock";

  const curPrice = stock.current_price || 0;
  const pxChg = stock.price_chg_pct || 0;
  const pxDiff = stock.price_diff || 0;
  const totOi = stock.total_oi || 0;
  const oiChgPct = stock.oi_chg_pct || 0;
  const oiChgAbs = stock.oi_chg || 0;

  document.getElementById("modalPrice").textContent = `₹${curPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  
  const pxChgEl = document.getElementById("modalPriceChg");
  pxChgEl.textContent = `${pxChg > 0 ? "+" : ""}${pxChg.toFixed(2)}% (${pxDiff > 0 ? "+₹" : "-₹"}${Math.abs(pxDiff).toFixed(2)})`;
  pxChgEl.className = `stat-sub ${pxChg >= 0 ? "positive" : "negative"}`;

  document.getElementById("modalTotalOI").textContent = formatShortNumber(totOi);
  
  const oiChgEl = document.getElementById("modalOIChg");
  oiChgEl.textContent = `${oiChgPct > 0 ? "+" : ""}${oiChgPct.toFixed(2)}% (${oiChgAbs > 0 ? "+" : ""}${formatShortNumber(oiChgAbs)})`;
  oiChgEl.className = `stat-sub ${oiChgPct >= 0 ? "positive" : "negative"}`;

  const catBadge = document.getElementById("modalCategoryBadge");
  catBadge.textContent = stock.category || "Derivatives";
  catBadge.className = `pill-badge ${stock.category_color || "emerald"}`;

  document.getElementById("modalActionTag").textContent = stock.action_tag || "Active Activity";
  document.getElementById("modalPCR").textContent = (stock.pcr || 1).toFixed(2);
  document.getElementById("modalPCRSentiment").textContent = (stock.pcr || 1) >= 1.2 ? "Bullish Put Writing" : ((stock.pcr || 1) <= 0.8 ? "Bearish Call Writing" : "Neutral PCR Range");

  document.getElementById("modalNextDayPlan").textContent = stock.next_day_plan || "Monitor support/resistance strikes.";
  document.getElementById("modalSupport").textContent = stock.max_put_strike ? `₹${Number(stock.max_put_strike).toLocaleString()}` : "N/A";
  document.getElementById("modalResistance").textContent = stock.max_call_strike ? `₹${Number(stock.max_call_strike).toLocaleString()}` : "N/A";

  // Futures table
  const fTable = document.getElementById("modalFuturesTable");
  fTable.innerHTML = "";
  (stock.futures_breakdown || []).forEach((f) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${f.expiry}</td>
      <td class="text-right">₹${(f.close || 0).toLocaleString()}</td>
      <td class="text-right">${formatShortNumber(f.oi)}</td>
      <td class="text-right ${(f.chg_oi || 0) >= 0 ? "positive" : "negative"}">${(f.chg_oi || 0) > 0 ? "+" : ""}${formatShortNumber(f.chg_oi)}</td>
    `;
    fTable.appendChild(row);
  });

  renderOptionsStrikeChart(stock);

  modal.classList.remove("hidden");
}

function setupEventListeners() {
  // Modals close
  const modalClose = document.getElementById("modalCloseBtn");

  if (modalClose) {
    modalClose.onclick = () => {
      document.getElementById("stockModal")?.classList.add("hidden");
    };
  }

  // Close modals when clicking outside card
  window.onclick = (e) => {
    const stockModal = document.getElementById("stockModal");
    if (e.target === stockModal) stockModal.classList.add("hidden");
  };

  // Close on Escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.getElementById("stockModal")?.classList.add("hidden");
    }
  });
}

// ==========================================================================
// Watchlist CSV Exporter
// ==========================================================================

function exportWatchlistCSV() {
  if (!state.filteredStocks || state.filteredStocks.length === 0) {
    alert("No stocks to export.");
    return;
  }

  const headers = ["Symbol", "Sector", "LTP", "Price_Chg_%", "Total_OI", "OI_Chg_%", "Buildup", "Support_Strike", "Resistance_Strike", "PCR", "Conviction_%", "Next_Day_Plan"];
  
  const rows = state.filteredStocks.map((s) => [
    s.symbol,
    `"${s.sector || "Equity"}"`,
    s.current_price || 0,
    s.price_chg_pct || 0,
    s.total_oi || 0,
    s.oi_chg_pct || 0,
    `"${s.category || "Derivatives"}"`,
    s.max_put_strike || "N/A",
    s.max_call_strike || "N/A",
    s.pcr || 1,
    s.conviction_score || 50,
    `"${(s.next_day_plan || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `NSE_OI_Scanner_${state.data?.metadata?.trade_date || "EOD"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
