const form = document.getElementById("calculator-form");

const fields = {
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
const STORAGE_KEY = "option-margin-decision-inputs";

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

function saveInputs() {
  const snapshot = {};
  Object.entries(fields).forEach(([key, field]) => {
    snapshot[key] = field.value;
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function restoreInputs() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const snapshot = JSON.parse(raw);
    Object.entries(fields).forEach(([key, field]) => {
      if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
        field.value = snapshot[key];
      }
    });
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
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

Object.values(fields).forEach((field) => {
  field.addEventListener("input", () => {
    calculate();
    saveInputs();
  });
});

restoreInputs();
calculate();
