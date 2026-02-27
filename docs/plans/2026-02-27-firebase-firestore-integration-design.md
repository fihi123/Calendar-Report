# Firebase Firestore Integration Design

## Goal
Replace localStorage with Firebase Firestore so team members can share data across devices in real-time.

## Decisions
- **Authentication**: None (public access, `allow read, write: if true`)
- **Sync mode**: Real-time via Firestore `onSnapshot`
- **Approach**: Abstraction layer (custom hooks) to minimize changes to existing components

## Firestore Data Structure

```
/teamsync (collection)
  /team-members (document) → { members: TeamMember[] }
  /calendar-events (document) → { events: CalendarEvent[] }  (dates as ISO strings)
  /completed-reports (document) → { records: CompletionRecord[] }
  /reports (collection)
    /{eventId} (document) → ReportData
```

## Files to Change

| File | Action |
|------|--------|
| `package.json` | Add `firebase` dependency |
| `src/lib/firebase.ts` | New — Firebase config & initialization |
| `src/hooks/useFirestoreSync.ts` | New — Real-time sync hook |
| `src/features/calendar/CalendarApp.tsx` | Replace localStorage with Firestore hook |
| `src/features/report/ReportApp.tsx` | Replace localStorage with Firestore functions |

## Key Implementation Details

- `useFirestoreSync<T>(docPath, fallback)` hook: subscribes via `onSnapshot`, writes via `setDoc`
- CalendarEvent dates stored as ISO strings in Firestore, deserialized on read
- Reports stored in sub-collection `/teamsync/reports/{eventId}`
- localStorage kept as offline fallback (Firestore failure)
