# sched-prod incident board — plan

The on-call board for sched-prod. One page, one list: tonight's incidents, newest first, so on-call sees
what just broke and takes it.

## Flows

| flow | who | what happens |
|------|-----|--------------|
| `open-board` | on-call | opens the board; sees tonight's incidents |
| `ack-incident` | on-call | picks an incident on the board, which opens its incident panel, and acks it there — "I've got this one" |
| `watch-board` | on-call | keeps the board open; it stays current without a reload |

## Requirements

- **R1** New incidents appear live at the top of the list, newest first.
- **R2** A row opens its incident panel (click or Enter). The panel names the incident id and holds the **Ack** button;
  rows have no Ack. Panel Ack sends the ack (`api.ack(id)`) for the incident the panel names and marks the row acked.
  New incidents stay live at the top (R1), so the panel never moves under the pointer and a row shift cannot ack
  the wrong incident. (Product decision, 2026-11-17, after step-one evidence: Ack at 00:11 landed on INC-1997
  when INC-2490 was meant.)
- **R3** Show a loader until incidents load.
- **R4** The board refreshes itself every 2 seconds while open.
- **R5** Times show in the viewer's local time; day before month for EU locales (dd/mm).
- **R6** The page names its build: `<meta name="build" content="<git sha>">` in the head and the same sha in the footer.

## Hooks (pinned — tests and the replay rely on them)

| `data-testid` | element |
|---------------|---------|
| `board` | the board's main area |
| `loader` | the loader (gone once incidents load) |
| `empty` | what shows when there are no incidents |
| `incident-list` | the list |
| `incident-row` | one incident row, with `data-id="<incident id>"` |
| ~~`ack`~~ | removed: rows have no Ack button (R2) |
| `incident-panel` | the incident panel, naming the incident id (`data-id` too) |
| `panel-ack` | the Ack button in the panel |
| `acked` | the acked mark in a row |
| `build-sha` | the sha in the footer |

## Done

Every issue in `issues/` delivered, deployed to a public https address, and shown working.
