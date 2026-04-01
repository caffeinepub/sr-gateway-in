# SR GATEWAY IN

## Current State
- Backend: Full payment gateway with MPIN, deposits, withdrawals, P2P, API system, live chat, messages, stable memory persistence
- Frontend: Admin panel with live chat, multi-banner, users list (mobile/MPIN/password show-hide); User panel with all features
- Pending: Gift Code System (completely missing from backend and frontend)

## Requested Changes (Diff)

### Add
- Backend: GiftCode type, GiftCodeClaim type, gift code maps + stable storage
- Backend: `createGiftCode` - user creates code (SRIN_ prefix), debits wallet, stores code
- Backend: `adminCreateGiftCode` - admin creates code without wallet deduction
- Backend: `claimGiftCode` - validates and credits wallet, prevents double-claim, checks max claims
- Backend: `getMyGiftCodes` - returns caller's created codes with tracker data
- Backend: `getMyGiftCodeClaims` - returns caller's claim history
- Backend: `adminGetAllGiftCodes` - admin sees all codes
- Backend: `adminToggleGiftCode` - admin activate/deactivate any code
- Frontend AdminPanel: "Gift Codes" section in grid menu with create form + list all codes + activate/deactivate toggle
- Frontend HomeScreen (wallet area): Eye-catching "Claim Gift Code" button + "Create Gift Code" button in services/wallet area
- Frontend: Gift code claim history with date/time/amount display

### Modify
- Backend stable vars: Add `_stabGiftCodes` and `_stabGiftCodeClaims`
- Backend preupgrade/postupgrade: Serialize/restore gift code data
- backend.d.ts: Add GiftCode, GiftCodeClaim types + new function signatures

### Remove
- Nothing removed

## Implementation Plan
1. Add GiftCode + GiftCodeClaim types to main.mo
2. Add gift code stable vars, runtime maps
3. Implement 7 gift code functions in main.mo
4. Update preupgrade/postupgrade to persist gift codes
5. Update backend.d.ts with new types and functions
6. Add Gift Code section to AdminPanel (new grid item + tab)
7. Add gift code UI to HomeScreen (claim button + create button + history)
