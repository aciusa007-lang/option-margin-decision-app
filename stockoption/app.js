const form = document.getElementById("calculator-form");
const stockList = document.getElementById("stockList");
const addTickerButton = document.getElementById("addTickerButton");
const fetchPriceButton = document.getElementById("fetchPriceButton");
const priceStatus = document.getElementById("priceStatus");
const cloudStatus = document.getElementById("cloudStatus");
const activeTickerLabel = document.getElementById("activeTickerLabel");
const marketStatus = document.getElementById("marketStatus");
const period1yButton = document.getElementById("period1yButton");
const period2yButton = document.getElementById("period2yButton");
const qqqChart = document.getElementById("qqqChart");
const vixChart = document.getElementById("vixChart");
const qqqRangeLabel = document.getElementById("qqqRangeLabel");
const vixRangeLabel = document.getElementById("vixRangeLabel");
const fields = {
  stockTicker: document.getElementById("stockTicker"),
  stockPrice: document.getElementById("stockPrice"),
  sharesOwned: document.getElementById("sharesOwned"),
  expectedPrice: document.getElementById("expectedPrice"),
  daysToExpiration: document.getElementById("daysToExpiration"),
  callStrike: document.getElementById("callStrike"),
  callPremium: document.getElementById("callPremium"),
  putStrike: document.getElementById("putStrike"),
  putContracts: document.getElementById("putContracts"),
  putPremium: document.getElementById("putPremium"),
  marginAmount: document.getElementById("marginAmount"),
  marginRate: document.getElementById("marginRate"),
  marginShares: document.getElementById("marginShares")
};
const outputIds = {
  coveredCallPremiumIncome: document.getElementById("coveredCallPremiumIncome"),
  coveredCallProfit: document.getElementById("coveredCallProfit"),
  coveredCallYield: document.getElementById("coveredCallYield"),
  coveredCallBreakeven: document.getElementById("coveredCallBreakeven"),
  coveredCallCap: document.getElementById("coveredCallCap"),
  cashPutPremiumIncome: document.getElementById("cashPutPremiumIncome"),
  cashPutProfit: document.getElementById("cashPutProfit"),
  cashPutYield: document.getElementById("cashPutYield"),
  cashPutBreakeven: document.getElementById("cashPutBreakeven"),
  cashPutAssignment: document.getElementById("cashPutAssignment"),
  cashPutCashNeeded: document.getElementById("cashPutCashNeeded"),
  cashPutNetCashNeeded: document.getElementById("cashPutNetCashNeeded"),
  marginStockChange: document.getElementById("marginStockChange"),
  marginProfit: document.getElementById("marginProfit"),
  marginInterest: document.getElementById("marginInterest"),
  marginBreakevenMove: document.getElementById("marginBreakevenMove"),
  marginExposure: document.getElementById("marginExposure"),
  bestChoiceTitle: document.getElementById("bestChoiceTitle"),
  bestChoiceReason: document.getElementById("bestChoiceReason")
};
const cards = {
  coveredCall: document.getElementById("coveredCallCard"),
  cashPut: document.getElementById("cashPutCard"),
  margin: document.getElementById("marginCard")
};
const TRADING_DAYS_PER_YEAR = 252;
const STORAGE_KEY = "option-margin-decision-inputs-v2";
const LAST_TICKER_KEY = "option-margin-decision-last-ticker-v2";
const GLOBAL_SETTINGS_KEY = "option-margin-decision-global-v1";
const MARKET_CACHE_KEY = "option-margin-market-cache-v2";
const FALLBACK_TICKER = "AAPL";
const GLOBAL_FIELD_KEYS = ["marginAmount", "marginRate", "marginShares"];
const FINNHUB_API_KEY = "d1kvekhr01qt8foqinm0d1kvekhr01qt8foqinmg";
const TWELVE_DATA_API_KEY = "12e639d8c84846f7982c862c02078f38";
const SUPABASE_URL = "https://seczrlmqftcqsbzuhzvh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8KAo4fIYcX9rq1rXdWZZ5Q_Owwncvjx";
const SUPABASE_TABLE = "portfolio_state";
const SUPABASE_SYNC_ID = "leeclub-private-site";
const supabaseClient = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let syncTimer = null;
let cloudLoaded = false;
let selectedPeriod = "1y";
let marketRequestId = 0;
const defaultValues = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
const readNumber = (input) => Number.parseFloat(input.value) || 0;
const clampContracts = (shares) => Math.floor(shares / 100);
const formatCurrency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const formatCurrencyPrecise = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const formatPercent = (value) => `${value.toFixed(2)}%`;
const normalizeTicker = (value) => (value || "").trim().toUpperCase();
function getStorageState(){ try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
function setStorageState(state){ window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getGlobalSettings(){ try { return JSON.parse(window.localStorage.getItem(GLOBAL_SETTINGS_KEY) || "{}"); } catch { return {}; } }
function setGlobalSettings(settings){ window.localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings)); }
function getMarketCache(){ try { return JSON.parse(window.localStorage.getItem(MARKET_CACHE_KEY) || "{}"); } catch { return {}; } }
function setMarketCache(cache){ window.localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(cache)); }
function currentTicker(){ return normalizeTicker(fields.stockTicker.value); }
function listTickers(){ return Object.keys(getStorageState()).sort((a,b)=>a.localeCompare(b)); }
function updateActiveTickerLabel(){ activeTickerLabel.textContent = currentTicker() || "No stock selected"; }
function setPriceStatus(message, isError = false){ priceStatus.textContent = message; priceStatus.style.color = isError ? "var(--warn)" : ""; }
function setCloudStatus(message, isError = false){ cloudStatus.textContent = message; cloudStatus.style.color = isError ? "var(--warn)" : ""; }
function setMarketStatus(message, isError = false){ marketStatus.textContent = message; marketStatus.style.color = isError ? "var(--warn)" : ""; }
function buildCloudPayload(){ return { profiles: getStorageState(), global: getGlobalSettings(), lastTicker: window.localStorage.getItem(LAST_TICKER_KEY) || "" }; }
function applyCloudPayload(payload){ if (!payload || typeof payload !== "object") return; if (payload.profiles && typeof payload.profiles === "object") setStorageState(payload.profiles); if (payload.global && typeof payload.global === "object") setGlobalSettings(payload.global); if (typeof payload.lastTicker === "string") window.localStorage.setItem(LAST_TICKER_KEY, payload.lastTicker); }
async function syncCloudState(){ if (!supabaseClient || !cloudLoaded) return; setCloudStatus("Syncing to cloud..."); const { error } = await supabaseClient.from(SUPABASE_TABLE).upsert({ id: SUPABASE_SYNC_ID, data: buildCloudPayload(), updated_at: new Date().toISOString() }, { onConflict: "id" }); if (error) { setCloudStatus(`Cloud sync error: ${error.message}`, true); return; } setCloudStatus("Cloud sync complete."); }
function queueCloudSync(){ if (!supabaseClient) { setCloudStatus("Supabase client not loaded.", true); return; } window.clearTimeout(syncTimer); syncTimer = window.setTimeout(() => { syncCloudState(); }, 500); }
async function loadCloudState(){ if (!supabaseClient) { setCloudStatus("Supabase client not loaded.", true); return; } setCloudStatus("Loading cloud data..."); const { data, error } = await supabaseClient.from(SUPABASE_TABLE).select("data").eq("id", SUPABASE_SYNC_ID).maybeSingle(); if (error) { setCloudStatus(`Cloud load error: ${error.message}`, true); cloudLoaded = true; return; } if (data?.data) { applyCloudPayload(data.data); initializeTickerProfile(); calculate(); setCloudStatus("Cloud data loaded."); } else { setCloudStatus("No cloud data yet. Saving current data..."); } cloudLoaded = true; queueCloudSync(); }
function ensureTickerProfile(ticker){ const normalizedTicker = normalizeTicker(ticker) || FALLBACK_TICKER; const state = getStorageState(); if (!state[normalizedTicker]) { state[normalizedTicker] = { ...defaultValues, stockTicker: normalizedTicker }; setStorageState(state); } return normalizedTicker; }
function renderStockList(){ const tickers = listTickers(); const activeTicker = currentTicker(); stockList.innerHTML = ""; tickers.forEach((ticker)=>{ const item = document.createElement("li"); item.className = `stock-item${ticker === activeTicker ? " is-active" : ""}`; const selectButton = document.createElement("button"); selectButton.type = "button"; selectButton.className = "stock-select"; selectButton.textContent = ticker; selectButton.addEventListener("click", ()=>{ restoreInputs(ticker); calculate(); saveInputs(); }); item.append(selectButton); const removeButton = document.createElement("button"); removeButton.type = "button"; removeButton.className = "stock-remove"; removeButton.textContent = "x"; removeButton.title = `Remove ${ticker}`; removeButton.addEventListener("click", (event)=>{ event.preventDefault(); event.stopPropagation(); removeTicker(ticker); }); item.append(removeButton); stockList.append(item); }); }
function saveInputs(){ const ticker = currentTicker(); if (!ticker) { updateActiveTickerLabel(); renderStockList(); return; } fields.stockTicker.value = ticker; const state = getStorageState(); const snapshot = {}; Object.entries(fields).forEach(([key, field])=>{ if (!GLOBAL_FIELD_KEYS.includes(key)) snapshot[key] = field.value; }); const globalSettings = {}; GLOBAL_FIELD_KEYS.forEach((key)=>{ globalSettings[key] = fields[key].value; }); state[ticker] = snapshot; setStorageState(state); setGlobalSettings(globalSettings); window.localStorage.setItem(LAST_TICKER_KEY, ticker); updateActiveTickerLabel(); renderStockList(); queueCloudSync(); }
function restoreInputs(ticker){ const normalizedTicker = normalizeTicker(ticker); const state = getStorageState(); const globalSettings = getGlobalSettings(); if (!normalizedTicker || !state[normalizedTicker]) { Object.entries(fields).forEach(([key, field])=>{ field.value = key === "stockTicker" ? "" : defaultValues[key]; }); GLOBAL_FIELD_KEYS.forEach((key)=>{ if (globalSettings[key] !== undefined) fields[key].value = globalSettings[key]; }); updateActiveTickerLabel(); renderStockList(); return; } const snapshot = state[normalizedTicker]; Object.entries(fields).forEach(([key, field])=>{ if (Object.prototype.hasOwnProperty.call(snapshot, key)) field.value = snapshot[key]; }); GLOBAL_FIELD_KEYS.forEach((key)=>{ fields[key].value = globalSettings[key] !== undefined ? globalSettings[key] : defaultValues[key]; }); fields.stockTicker.value = normalizedTicker; updateActiveTickerLabel(); renderStockList(); }
function addTicker(){ const ticker = normalizeTicker(fields.stockTicker.value); if (!ticker) { fields.stockTicker.value = currentTicker() || ""; return; } ensureTickerProfile(ticker); restoreInputs(ticker); calculate(); saveInputs(); }
function removeTicker(tickerToRemove){ const normalizedTicker = normalizeTicker(tickerToRemove); const state = getStorageState(); const activeTicker = currentTicker(); delete state[normalizedTicker]; setStorageState(state); const remainingTickers = Object.keys(state).sort((a,b)=>a.localeCompare(b)); const nextTicker = activeTicker === normalizedTicker ? (remainingTickers[0] || "") : activeTicker; restoreInputs(nextTicker); if (nextTicker) { calculate(); saveInputs(); } }
function initializeTickerProfile(){ const tickers = listTickers(); const lastTicker = normalizeTicker(window.localStorage.getItem(LAST_TICKER_KEY)); if (tickers.length === 0) { ensureTickerProfile(FALLBACK_TICKER); window.localStorage.setItem(LAST_TICKER_KEY, FALLBACK_TICKER); restoreInputs(FALLBACK_TICKER); return; } restoreInputs(lastTicker && tickers.includes(lastTicker) ? lastTicker : tickers[0]); }
function calculate(){ const stockPrice = readNumber(fields.stockPrice); const sharesOwned = readNumber(fields.sharesOwned); const expectedPrice = readNumber(fields.expectedPrice); const days = Math.max(readNumber(fields.daysToExpiration), 1); const callStrike = readNumber(fields.callStrike); const callPremium = readNumber(fields.callPremium); const putStrike = readNumber(fields.putStrike); const putContracts = readNumber(fields.putContracts); const putPremium = readNumber(fields.putPremium); const marginAmount = readNumber(fields.marginAmount); const marginRate = readNumber(fields.marginRate) / 100; const marginShares = readNumber(fields.marginShares); const contracts = clampContracts(sharesOwned); const optionShares = contracts * 100; const calledAwayPrice = Math.min(expectedPrice, callStrike); const coveredCallPremiumIncome = callPremium * optionShares; const coveredCallProfit = ((calledAwayPrice - stockPrice) * optionShares) + coveredCallPremiumIncome; const coveredCallYield = stockPrice > 0 && days > 0 ? ((callPremium / stockPrice) * (TRADING_DAYS_PER_YEAR / days) * 100) : 0; const coveredCallBreakeven = stockPrice - callPremium; const coveredCallCap = (callStrike - stockPrice + callPremium) * optionShares; const putShares = putContracts * 100; const putPremiumIncome = putPremium * putShares; const putCashNeeded = putStrike * putShares; const putNetCashNeeded = putCashNeeded - putPremiumIncome; const putProfit = expectedPrice >= putStrike ? putPremiumIncome : ((expectedPrice - putStrike) * putShares) + putPremiumIncome; const putYield = putStrike > 0 && days > 0 ? ((putPremium / putStrike) * (TRADING_DAYS_PER_YEAR / days) * 100) : 0; const putBreakeven = putStrike - putPremium; const interestCost = marginAmount * marginRate * (days / 365); const marginStockChange = (expectedPrice - stockPrice) * marginShares; const marginProfit = marginStockChange - interestCost; const marginBreakevenMove = marginShares > 0 ? interestCost / marginShares : 0; const strategies = [{ key: "coveredCall", name: "Covered call", profit: coveredCallProfit, reason: expectedPrice > callStrike ? "Projected profit includes premium, but upside is capped above the call strike." : "Projected profit includes stock movement plus call premium." }, { key: "cashPut", name: "Cash-secured put", profit: putProfit, reason: expectedPrice < putStrike ? "Projected result assumes assignment below the put strike." : "Projected result is premium income with no assignment." }, { key: "margin", name: "Margin carry", profit: marginProfit, reason: "Projected result separates unrealized stock change from financing cost on the borrowed money." }]; const best = strategies.reduce((top, current)=>current.profit > top.profit ? current : top); outputIds.coveredCallPremiumIncome.textContent = formatCurrency(coveredCallPremiumIncome); outputIds.coveredCallProfit.textContent = formatCurrency(coveredCallProfit); outputIds.coveredCallYield.textContent = formatPercent(coveredCallYield); outputIds.coveredCallBreakeven.textContent = formatCurrencyPrecise(coveredCallBreakeven); outputIds.coveredCallCap.textContent = formatCurrency(coveredCallCap); outputIds.cashPutPremiumIncome.textContent = formatCurrency(putPremiumIncome); outputIds.cashPutProfit.textContent = formatCurrency(putProfit); outputIds.cashPutYield.textContent = formatPercent(putYield); outputIds.cashPutBreakeven.textContent = formatCurrencyPrecise(putBreakeven); outputIds.cashPutAssignment.textContent = formatCurrencyPrecise(putStrike); outputIds.cashPutCashNeeded.textContent = formatCurrency(putCashNeeded); outputIds.cashPutNetCashNeeded.textContent = formatCurrency(putNetCashNeeded); outputIds.marginStockChange.textContent = formatCurrency(marginStockChange); outputIds.marginProfit.textContent = formatCurrency(marginProfit); outputIds.marginInterest.textContent = formatCurrencyPrecise(interestCost); outputIds.marginBreakevenMove.textContent = formatCurrencyPrecise(marginBreakevenMove); outputIds.marginExposure.textContent = formatCurrency(stockPrice * marginShares); outputIds.bestChoiceTitle.textContent = best.name; outputIds.bestChoiceReason.textContent = `${best.reason} Highest projected profit under the current expiration price assumption: ${formatCurrency(best.profit)}.`; Object.values(cards).forEach((card)=>card.classList.remove("is-best", "is-risk")); cards[best.key].classList.add("is-best"); if (marginProfit < 0) cards.margin.classList.add("is-risk"); if (expectedPrice < putBreakeven) cards.cashPut.classList.add("is-risk"); if (expectedPrice > callStrike) cards.coveredCall.classList.add("is-risk"); }
function setPeriodButtons(){ period1yButton.classList.toggle("is-active", selectedPeriod === "1y"); period2yButton.classList.toggle("is-active", selectedPeriod === "2y"); }
function formatRangeLabel(series){ if (!series.length) return "-"; const first = series[0].close; const last = series[series.length - 1].close; const change = last - first; const pct = first !== 0 ? (change / first) * 100 : 0; const sign = change >= 0 ? "+" : ""; return `${formatCurrencyPrecise(last)} | ${sign}${change.toFixed(2)} (${sign}${pct.toFixed(2)}%)`; }
function renderLineChart(svg, series, lineClass){ const width = 720, height = 220, left = 22, right = 10, top = 12, bottom = 18, innerWidth = width - left - right, innerHeight = height - top - bottom; svg.innerHTML = ""; if (!series.length) { svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" class="chart-empty">No data available</text>'; return; } const values = series.map((point)=>point.close); const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1; const guides = [0,0.5,1].map((ratio)=>{ const y = top + innerHeight * ratio; return `<line class="chart-guide" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" />`; }).join(""); const path = series.map((point, index)=>{ const x = left + (innerWidth * index) / Math.max(series.length - 1, 1); const y = top + ((max - point.close) / span) * innerHeight; return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`; }).join(" "); svg.innerHTML = `${guides}<line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" /><path class="${lineClass}" d="${path}" />`; }
function parseTimeSeriesResponse(data){ if (!data || !Array.isArray(data.values)) return []; return data.values.map((entry)=>({ date: entry.datetime, close: Number.parseFloat(entry.close) })).filter((entry)=>Number.isFinite(entry.close)).sort((a,b)=>new Date(a.date) - new Date(b.date)); }
function parseCboeCsv(csv, startDate){ const minTime = new Date(`${startDate}T00:00:00Z`).getTime(); return csv.split(/\r?\n/).slice(1).map((line)=>line.trim()).filter(Boolean).map((line)=>{ const parts = line.split(","); const date = parts[0]; const close = Number.parseFloat(parts[parts.length - 1]); const [month, day, year] = date.split("/"); return { date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`, close }; }).filter((entry)=>Number.isFinite(entry.close) && new Date(`${entry.date}T00:00:00Z`).getTime() >= minTime).sort((a,b)=>new Date(a.date) - new Date(b.date)); }
function getCachedSeries(cacheKey){ const cache = getMarketCache(); const entry = cache[cacheKey]; if (!entry || !Array.isArray(entry.series) || !entry.savedAt) return null; if (Date.now() - entry.savedAt > 12 * 60 * 60 * 1000) return null; return entry.series; }
function setCachedSeries(cacheKey, series){ const cache = getMarketCache(); cache[cacheKey] = { savedAt: Date.now(), series }; setMarketCache(cache); }
async function fetchTwelveSeries(symbol, startDate){ const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&start_date=${encodeURIComponent(startDate)}&order=asc&outputsize=5000&apikey=${TWELVE_DATA_API_KEY}`; const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); if (data.status === "error") throw new Error(data.message || `Unable to load ${symbol}`); return parseTimeSeriesResponse(data); }
async function fetchCboeVixSeries(startDate){ const response = await fetch("data/vix-history.csv"); if (!response.ok) throw new Error(`HTTP ${response.status}`); const csv = await response.text(); const series = parseCboeCsv(csv, startDate); if (!series.length) throw new Error("Unable to load VIX history."); return series; }
function periodStartDate(periodKey){ const now = new Date(); const start = new Date(now); start.setFullYear(now.getFullYear() - (periodKey === "2y" ? 2 : 1)); return start.toISOString().slice(0, 10); }
async function loadMarketHistory(){
  const requestId = ++marketRequestId;
  const startDate = periodStartDate(selectedPeriod);
  const qqqCacheKey = `QQQ-${selectedPeriod}`;
  const vixCacheKey = `VIX-${selectedPeriod}`;
  setPeriodButtons();
  setMarketStatus(`Loading ${selectedPeriod === "2y" ? "2-year" : "1-year"} history...`);
  const cachedQqqSeries = getCachedSeries(qqqCacheKey);
  const cachedVixSeries = getCachedSeries(vixCacheKey);
  const qqqPromise = cachedQqqSeries ? Promise.resolve(cachedQqqSeries) : fetchTwelveSeries("QQQ", startDate);
  const vixPromise = cachedVixSeries ? Promise.resolve(cachedVixSeries) : fetchCboeVixSeries(startDate);
  const [qqqResult, vixResult] = await Promise.allSettled([qqqPromise, vixPromise]);
  if (requestId !== marketRequestId) return;

  const messages = [];

  if (qqqResult.status === "fulfilled" && qqqResult.value.length) {
    if (!cachedQqqSeries) setCachedSeries(qqqCacheKey, qqqResult.value);
    renderLineChart(qqqChart, qqqResult.value, "chart-line-qqq");
    qqqRangeLabel.textContent = formatRangeLabel(qqqResult.value);
  } else {
    renderLineChart(qqqChart, [], "chart-line-qqq");
    qqqRangeLabel.textContent = "-";
    messages.push("QQQ history is unavailable right now.");
  }

  if (vixResult.status === "fulfilled" && vixResult.value.length) {
    if (!cachedVixSeries) setCachedSeries(vixCacheKey, vixResult.value);
    renderLineChart(vixChart, vixResult.value, "chart-line-vix");
    vixRangeLabel.textContent = formatRangeLabel(vixResult.value);
  } else {
    renderLineChart(vixChart, [], "chart-line-vix");
    vixRangeLabel.textContent = "-";
    messages.push("VIX history is unavailable right now.");
  }

  if (messages.length === 0) {
    setMarketStatus(`Loaded ${selectedPeriod === "2y" ? "2-year" : "1-year"} history for QQQ and VIX.`);
  } else if (messages.length === 2) {
    setMarketStatus("QQQ and VIX history are unavailable right now. Try refreshing in a minute.", true);
  } else {
    setMarketStatus(messages[0], true);
  }
}
form.addEventListener("submit", (event)=>{ event.preventDefault(); calculate(); saveInputs(); });
Object.entries(fields).forEach(([key, field])=>{ if (key === "stockTicker") return; field.addEventListener("input", ()=>{ calculate(); saveInputs(); }); });
fields.stockTicker.addEventListener("keydown", (event)=>{ if (event.key === "Enter") { event.preventDefault(); addTicker(); } });
addTickerButton.addEventListener("click", addTicker);
fetchPriceButton.addEventListener("click", async ()=>{ const ticker = currentTicker() || normalizeTicker(fields.stockTicker.value); if (!ticker) { setPriceStatus("Enter a ticker first.", true); return; } setPriceStatus(`Fetching price for ${ticker}...`); fetchPriceButton.disabled = true; try { const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`; const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); const price = Number.parseFloat(data.c); if (!Number.isFinite(price) || price <= 0) throw new Error("No quote returned for this ticker."); fields.stockPrice.value = price.toFixed(2); calculate(); saveInputs(); setPriceStatus(`Current price loaded for ${ticker}: ${price.toFixed(2)}`); } catch (error) { setPriceStatus(error.message || "Unable to fetch stock price.", true); } finally { fetchPriceButton.disabled = false; } });
period1yButton.addEventListener("click", ()=>{ if (selectedPeriod !== "1y") { selectedPeriod = "1y"; loadMarketHistory(); } });
period2yButton.addEventListener("click", ()=>{ if (selectedPeriod !== "2y") { selectedPeriod = "2y"; loadMarketHistory(); } });
initializeTickerProfile();
calculate();
loadCloudState();
loadMarketHistory();

