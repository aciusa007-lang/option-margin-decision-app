const form = document.getElementById("calculator-form");
const stockList = document.getElementById("stockList");
const addTickerButton = document.getElementById("addTickerButton");
const fetchPriceButton = document.getElementById("fetchPriceButton");
const priceStatus = document.getElementById("priceStatus");
const activeTickerLabel = document.getElementById("activeTickerLabel");

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
const FALLBACK_TICKER = "AAPL";
const GLOBAL_FIELD_KEYS = ["marginAmount", "marginRate", "marginShares"];
const FINNHUB_API_KEY = "d1kvekhr01qt8foqinm0d1kvekhr01qt8foqinmg";

const defaultValues = Object.fromEntries(
  Object.entries(fields).map(([key, field]) => [key, field.value])
);

function readNumber(input) {
  return Number.parseFloat(input.value) || 0;
}

function clampContracts(shares) {
  return Math.floor(shares / 100);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatCurrencyPrecise(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function normalizeTicker(value) {
  return (value || "").trim().toUpperCase();
}

function getStorageState() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setStorageState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getGlobalSettings() {
  try {
    return JSON.parse(window.localStorage.getItem(GLOBAL_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function setGlobalSettings(settings) {
  window.localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
}

function currentTicker() {
  return normalizeTicker(fields.stockTicker.value);
}

function listTickers() {
  return Object.keys(getStorageState()).sort((left, right) => left.localeCompare(right));
}

function updateActiveTickerLabel() {
  activeTickerLabel.textContent = currentTicker() || "No stock selected";
}

function setPriceStatus(message, isError = false) {
  priceStatus.textContent = message;
  priceStatus.style.color = isError ? "var(--warn)" : "";
}

function ensureTickerProfile(ticker) {
  const normalizedTicker = normalizeTicker(ticker) || FALLBACK_TICKER;
  const state = getStorageState();
  if (!state[normalizedTicker]) {
    state[normalizedTicker] = { ...defaultValues, stockTicker: normalizedTicker };
    setStorageState(state);
  }
  return normalizedTicker;
}

function renderStockList() {
  const tickers = listTickers();
  const activeTicker = currentTicker();

  stockList.innerHTML = "";

  tickers.forEach((ticker) => {
    const item = document.createElement("li");
    item.className = `stock-item${ticker === activeTicker ? " is-active" : ""}`;

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "stock-select";
    selectButton.textContent = ticker;
    selectButton.addEventListener("click", () => {
      restoreInputs(ticker);
      calculate();
      saveInputs();
    });

    item.append(selectButton);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "stock-remove";
    removeButton.setAttribute("aria-label", `Remove ${ticker}`);
    removeButton.title = `Remove ${ticker}`;
    removeButton.textContent = "x";
    removeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeTicker(ticker);
    });
    item.append(removeButton);

    stockList.append(item);
  });
}

function saveInputs() {
  const ticker = currentTicker();
  if (!ticker) {
    updateActiveTickerLabel();
    renderStockList();
    return;
  }

  fields.stockTicker.value = ticker;

  const state = getStorageState();
  const snapshot = {};
  Object.entries(fields).forEach(([key, field]) => {
    if (!GLOBAL_FIELD_KEYS.includes(key)) {
      snapshot[key] = field.value;
    }
  });

  const globalSettings = {};
  GLOBAL_FIELD_KEYS.forEach((key) => {
    globalSettings[key] = fields[key].value;
  });

  state[ticker] = snapshot;
  setStorageState(state);
  setGlobalSettings(globalSettings);
  window.localStorage.setItem(LAST_TICKER_KEY, ticker);
  updateActiveTickerLabel();
  renderStockList();
}

function restoreInputs(ticker) {
  const normalizedTicker = normalizeTicker(ticker);
  const state = getStorageState();
  const globalSettings = getGlobalSettings();

  if (!normalizedTicker || !state[normalizedTicker]) {
    Object.entries(fields).forEach(([key, field]) => {
      field.value = key === "stockTicker" ? "" : defaultValues[key];
    });
    GLOBAL_FIELD_KEYS.forEach((key) => {
      if (globalSettings[key] !== undefined) {
        fields[key].value = globalSettings[key];
      }
    });
    updateActiveTickerLabel();
    renderStockList();
    return;
  }
  const snapshot = state[normalizedTicker];

  Object.entries(fields).forEach(([key, field]) => {
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      field.value = snapshot[key];
    }
  });

  GLOBAL_FIELD_KEYS.forEach((key) => {
    fields[key].value =
      globalSettings[key] !== undefined ? globalSettings[key] : defaultValues[key];
  });

  fields.stockTicker.value = normalizedTicker;
  updateActiveTickerLabel();
  renderStockList();
}

function switchTickerProfile() {
  const ticker = currentTicker();
  restoreInputs(ticker);
  calculate();
}

function addTicker() {
  const ticker = normalizeTicker(fields.stockTicker.value);
  if (!ticker) {
    fields.stockTicker.value = currentTicker() || "";
    return;
  }

  ensureTickerProfile(ticker);
  restoreInputs(ticker);
  calculate();
  saveInputs();
}

function removeTicker(tickerToRemove) {
  const normalizedTicker = normalizeTicker(tickerToRemove);
  const state = getStorageState();
  const activeTicker = currentTicker();

  delete state[normalizedTicker];

  setStorageState(state);

  const remainingTickers = Object.keys(state).sort((left, right) => left.localeCompare(right));

  const nextTicker =
    activeTicker === normalizedTicker
      ? (remainingTickers[0] || "")
      : activeTicker;

  restoreInputs(nextTicker);
  if (nextTicker) {
    calculate();
    saveInputs();
  }
}

function initializeTickerProfile() {
  const tickers = listTickers();
  const lastTicker = normalizeTicker(window.localStorage.getItem(LAST_TICKER_KEY));

  if (tickers.length === 0) {
    ensureTickerProfile(FALLBACK_TICKER);
    window.localStorage.setItem(LAST_TICKER_KEY, FALLBACK_TICKER);
    restoreInputs(FALLBACK_TICKER);
    return;
  }

  restoreInputs(lastTicker && tickers.includes(lastTicker) ? lastTicker : tickers[0]);
}

function calculate() {
  const stockPrice = readNumber(fields.stockPrice);
  const sharesOwned = readNumber(fields.sharesOwned);
  const expectedPrice = readNumber(fields.expectedPrice);
  const days = Math.max(readNumber(fields.daysToExpiration), 1);
  const callStrike = readNumber(fields.callStrike);
  const callPremium = readNumber(fields.callPremium);
  const putStrike = readNumber(fields.putStrike);
  const putContracts = readNumber(fields.putContracts);
  const putPremium = readNumber(fields.putPremium);
  const marginAmount = readNumber(fields.marginAmount);
  const marginRate = readNumber(fields.marginRate) / 100;
  const marginShares = readNumber(fields.marginShares);

  const contracts = clampContracts(sharesOwned);
  const optionShares = contracts * 100;

  const calledAwayPrice = Math.min(expectedPrice, callStrike);
  const coveredCallPremiumIncome = callPremium * optionShares;
  const coveredCallProfit =
    ((calledAwayPrice - stockPrice) * optionShares) +
    coveredCallPremiumIncome;
  const coveredCallYield =
    stockPrice > 0 && days > 0
      ? ((callPremium / stockPrice) * (TRADING_DAYS_PER_YEAR / days) * 100)
      : 0;
  const coveredCallBreakeven = stockPrice - callPremium;
  const coveredCallCap = (callStrike - stockPrice + callPremium) * optionShares;

  const putShares = putContracts * 100;
  const putPremiumIncome = putPremium * putShares;
  const putCashNeeded = putStrike * putShares;
  const putNetCashNeeded = putCashNeeded - putPremiumIncome;
  const putProfit =
    expectedPrice >= putStrike
      ? putPremiumIncome
      : ((expectedPrice - putStrike) * putShares) + putPremiumIncome;
  const putYield =
    putStrike > 0 && days > 0
      ? ((putPremium / putStrike) * (TRADING_DAYS_PER_YEAR / days) * 100)
      : 0;
  const putBreakeven = putStrike - putPremium;

  const interestCost = marginAmount * marginRate * (days / 365);
  const marginStockChange = (expectedPrice - stockPrice) * marginShares;
  const marginProfit = marginStockChange - interestCost;
  const marginBreakevenMove =
    marginShares > 0 ? interestCost / marginShares : 0;

  const strategies = [
    {
      key: "coveredCall",
      name: "Covered call",
      profit: coveredCallProfit,
      reason: expectedPrice > callStrike
        ? "Projected profit includes premium, but upside is capped above the call strike."
        : "Projected profit includes stock movement plus call premium."
    },
    {
      key: "cashPut",
      name: "Cash-secured put",
      profit: putProfit,
      reason: expectedPrice < putStrike
        ? "Projected result assumes assignment below the put strike."
        : "Projected result is premium income with no assignment."
    },
    {
      key: "margin",
      name: "Margin carry",
      profit: marginProfit,
      reason: "Projected result separates unrealized stock change from financing cost on the borrowed money."
    }
  ];

  const best = strategies.reduce((top, current) =>
    current.profit > top.profit ? current : top
  );

  outputIds.coveredCallPremiumIncome.textContent = formatCurrency(coveredCallPremiumIncome);
  outputIds.coveredCallProfit.textContent = formatCurrency(coveredCallProfit);
  outputIds.coveredCallYield.textContent = formatPercent(coveredCallYield);
  outputIds.coveredCallBreakeven.textContent = formatCurrencyPrecise(coveredCallBreakeven);
  outputIds.coveredCallCap.textContent = formatCurrency(coveredCallCap);

  outputIds.cashPutPremiumIncome.textContent = formatCurrency(putPremiumIncome);
  outputIds.cashPutProfit.textContent = formatCurrency(putProfit);
  outputIds.cashPutYield.textContent = formatPercent(putYield);
  outputIds.cashPutBreakeven.textContent = formatCurrencyPrecise(putBreakeven);
  outputIds.cashPutAssignment.textContent = formatCurrencyPrecise(putStrike);
  outputIds.cashPutCashNeeded.textContent = formatCurrency(putCashNeeded);
  outputIds.cashPutNetCashNeeded.textContent = formatCurrency(putNetCashNeeded);

  outputIds.marginStockChange.textContent = formatCurrency(marginStockChange);
  outputIds.marginProfit.textContent = formatCurrency(marginProfit);
  outputIds.marginInterest.textContent = formatCurrencyPrecise(interestCost);
  outputIds.marginBreakevenMove.textContent = formatCurrencyPrecise(marginBreakevenMove);
  outputIds.marginExposure.textContent = formatCurrency(stockPrice * marginShares);

  outputIds.bestChoiceTitle.textContent = best.name;
  outputIds.bestChoiceReason.textContent = `${best.reason} Highest projected profit under the current expiration price assumption: ${formatCurrency(best.profit)}.`;

  Object.values(cards).forEach((card) => {
    card.classList.remove("is-best", "is-risk");
  });

  cards[best.key].classList.add("is-best");

  if (marginProfit < 0) {
    cards.margin.classList.add("is-risk");
  }

  if (expectedPrice < putBreakeven) {
    cards.cashPut.classList.add("is-risk");
  }

  if (expectedPrice > callStrike) {
    cards.coveredCall.classList.add("is-risk");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculate();
  saveInputs();
});

Object.entries(fields).forEach(([key, field]) => {
  if (key === "stockTicker") {
    return;
  }

  field.addEventListener("input", () => {
    calculate();
    saveInputs();
  });
});

fields.stockTicker.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addTicker();
  }
});

addTickerButton.addEventListener("click", addTicker);

fetchPriceButton.addEventListener("click", async () => {
  const ticker = currentTicker() || normalizeTicker(fields.stockTicker.value);
  if (!ticker) {
    setPriceStatus("Enter a ticker first.", true);
    return;
  }

  setPriceStatus(`Fetching price for ${ticker}...`);
  fetchPriceButton.disabled = true;

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const price = Number.parseFloat(data.c);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("No quote returned for this ticker.");
    }

    fields.stockPrice.value = price.toFixed(2);
    calculate();
    saveInputs();
    setPriceStatus(`Current price loaded for ${ticker}: ${price.toFixed(2)}`);
  } catch (error) {
    setPriceStatus(error.message || "Unable to fetch stock price.", true);
  } finally {
    fetchPriceButton.disabled = false;
  }
});

initializeTickerProfile();
calculate();
