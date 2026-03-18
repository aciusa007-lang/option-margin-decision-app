# Option vs Margin Decision App

This is a standalone browser calculator for comparing three ideas:

- selling a covered call against shares you already own
- selling a cash-secured put to earn premium while waiting to buy
- using margin to keep or add stock exposure

## Files

- `index.html`
- `styles.css`
- `app.js`

## How to use

1. Open `index.html` in a web browser.
2. Enter your stock price, shares owned, option strikes and premiums, margin amount, margin rate, and expected stock price at expiration.
3. Review projected profit, annualized option yield, breakeven levels, and which strategy ranks highest under your assumptions.

## Notes

- Covered call assumes contracts are sold only on full 100-share lots.
- Cash-secured put uses the same number of option contracts as your current share count would support.
- Margin carry assumes profit is based on the extra shares you buy with borrowed money and subtracts simple interest for the holding period.
- The calculator is for scenario analysis only. It does not include taxes, dividends, changing option Greeks, maintenance margin, or forced liquidation risk.
