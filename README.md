# Cryptrail Wallet MVP

React-based wallet onboarding prototype with:

- Create wallet with 12 or 24-word phrase
- Import wallet by seed phrase or private key
- Passcode setup and security re-check
- Local encrypted vault unlock
- Send crypto (native token, USDC, USDT)
- Receive view with Base/Ethereum/Polygon and USDC/USDT balances
- Polygon native `POL` send/receive support
- Live market rates (CoinGecko + fallback cache)
- Dedicated send window with fee/commission preview (gas, USD fee, total debit)
- Tokens section with top-25 market tokens (track/untrack)
- Portfolio value based on actual on-chain balances + live USD rates
- Request payment text generator
- Local contacts book and one-tap recipient fill
- Activity feed with tx status + explorer links
- Tools panel (gas tracker, security lock, explorer jump)

## Run

```bash
npm install
npm run dev
```

## Security note

This is an MVP. The wallet is encrypted in browser `localStorage` using the user passcode.  
Before production or App Store release, add secure enclave/keychain storage, biometrics, jailbreak/root checks, and full security audit coverage.
