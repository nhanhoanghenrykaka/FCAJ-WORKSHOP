# Tab-isolated authentication

Authentication is stored only in `sessionStorage`.

This makes every browser tab an independent login session:

- Tab A can stay signed in as ADMIN.
- Tab B can stay signed in as Customer A.
- Tab C can stay signed in as Customer B.
- Refreshing any tab restores that tab's own account.
- Signing in or signing out in one tab does not replace credentials in another tab.

Shared `localStorage` authentication from older builds is intentionally removed and is never used as a token source.

This design also allows order synchronization between tabs while API requests continue to use the JWT belonging to the tab that sent the request.
