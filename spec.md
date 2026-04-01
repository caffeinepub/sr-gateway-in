# SR GATEWAY IN

## Current State
All UI components exist: Live Chat button in HomeScreen + ProfileScreen, AdminLiveChatTab in AdminPanel, Multi-banner slider in HomeScreen, Mobile/MPIN display in Admin Users tab.

Root cause of all failures: `backend.ts` Backend class does not implement methods like `joinChatQueue`, `leaveChatQueue`, `getChatQueueStatus`, `sendChatMessage`, `getChatMessages`, `getActiveChatInfo`, `getChatQueueList`, `adminSendChatMessage`, `endCurrentChat`, `adminGetAllUserDetails`, `saveAdminVisibleData`. These exist in `main.mo` and IDL but are missing from the Backend wrapper class. When hooks call `(actor as any).functionName()`, actor is a Backend instance, not raw ICP actor, so it throws "is not a function".

## Requested Changes (Diff)

### Add
- Proxy wrapper in `createActor` (backend.ts) so any method not on Backend class falls through to the raw ICP actor

### Modify
- `createActor` in backend.ts: wrap return value with Proxy that forwards unknown property access to raw `actor`

### Remove
- Nothing

## Implementation Plan
1. Modify `createActor` in `src/frontend/src/backend.ts` to return a Proxy instead of the Backend instance directly. The Proxy checks Backend first, then falls through to the raw ICP actor. This one change fixes Live Chat, Admin Users, and all other `(actor as any).X()` calls permanently.
