# SR GATEWAY IN

## Current State
- Admin Users list shows only name, principal (truncated), balance, and a credit button
- Mobile number and MPIN are NOT stored in UserProfile backend -- only hashed versions exist
- Only single banner supported (bannerBlobId string in PaymentSettings)
- HomeScreen banner either shows admin-uploaded single image OR default animated slides
- No multi-banner slider support

## Requested Changes (Diff)

### Add
- Multi-banner support: admin can upload multiple banners in Settings tab, each shown with a delete button
- Admin Users list: show mobile number and MPIN (plain) with Show/Hide toggle, per user
- HomeScreen banner slider: auto-advance every 2 seconds, show dots indicator, works with 1 or many banners

### Modify
- RegisterScreen.tsx: pass plain mobile + plain mpin to onRegisterReady callback
- App.tsx: encode {n: name, m: mobile, p: mpin} as JSON string in displayName when saving UserProfile
- UsersTab in AdminPanel: parse displayName JSON to extract name, mobile, MPIN; show mobile (masked/full) and MPIN with show/hide button; keep credit button
- SettingsTab in AdminPanel: replace single banner upload with multi-banner upload UI (list of banners, add button, delete per item); store as pipe-separated blob IDs in bannerBlobId field
- HomeScreen: parse bannerBlobId as pipe-separated list; if admin banners exist, show image slider cycling every 2s; show dot indicators
- All screens that display displayName: decode JSON if needed to show actual name

### Remove
- Single banner upload UI replaced by multi-banner UI

## Implementation Plan
1. Modify RegisterScreen to pass mobile+pin via onRegisterReady
2. Modify App.tsx to encode {n,m,p} in displayName on profile save
3. Create helper function parseDisplayName(str) => {name, mobile, mpin} for decoding
4. Update AdminPanel UsersTab: decode displayName, show mobile (with copy), MPIN (hidden, reveal button), balance, credit button
5. Update AdminPanel SettingsTab: multi-banner management - store as pipe-separated in bannerBlobId
6. Update HomeScreen: parse pipe-separated banners, auto-sliding image carousel every 2s with dots
7. Update any other displayName usage to decode JSON name properly
