# Decision audit

How one decision is made and audited, as built: the PM rejects a request → a reason is required → the decision is saved with who, when and why → it shows up in the decision log, the profile's decision trail and the PDF → the next generation keeps a snapshot. Keep and wishlist decisions follow the same path without the reason dialog.

```mermaid
sequenceDiagram
  %% Decision audit trail in web/: Pipeline.tsx · RejectDialog.tsx · DecisionLog.tsx · Profiles.tsx · sessions.ts
  %% Today: stored in this browser (localStorage); "by" = the local who-is-deciding identity (lib/user.ts). Planned: Supabase + login.
  autonumber
  actor PM as Product manager
  participant UI as Pipeline list
  participant RD as Reject dialog
  participant ST as Decisions store
  participant LOG as Decision log
  participant GEN as Generation
  participant PRF as Profile page + PDF

  PM->>UI: Reject a feature request
  UI->>RD: Open: why is it rejected?
  alt no reason given
    RD-->>PM: Confirm stays disabled (reason required)
  else preset reason and/or own words
    PM->>RD: e.g. "Conflicts with a BMW principle: ..."
    RD->>ST: Decision {action: reject, reason, by: name, role, at: ISO time}
    ST->>ST: Save per market + series
    ST-->>LOG: Shown in the decision log (who · when · why)
  end
  PM->>UI: Keep others, drag priority, star wishlist items
  UI->>ST: Decision {keep | wish, by, at}
  PM->>UI: Build profiles
  UI->>GEN: Save generation: profiles · decisions · priority order · created_at · created_by
  Note over GEN: Snapshot: later edits do not change this generation
  GEN->>PRF: Decision trail incl. reject reasons
  PRF-->>PM: Download PDF with the same trail
  PM->>GEN: Edit and rebuild
  GEN->>UI: Decisions + priority loaded into the pipeline
  UI->>GEN: Rebuild saves a new generation (the earlier one stays)
```
