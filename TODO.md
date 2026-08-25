# ✅ TODO

Next improvements for Statva. Newest ideas at the top; move to **Done** when shipped.

## Ideas / Backlog

- [ ] Merge odometer info into the event timeline (km labels or color intensity on the gantt bars)
- [ ] Cost per km per part (link expense price to part lifespans)
- [ ] Part wear gauges: km on the current part vs average life, with a km/weeks-left estimate

## In progress

- [ ] Review lazy loading: every chart is in `lazy-charts.ts`, but the per-chart
      chunks are 1–6 kB while `recharts` (386 kB) is the real cost. Lazy loading
      matters for the shared recharts chunk, not for individual charts.

## Done

- [x] Drop ApexCharts: all 17 charts now use `@chakra-ui/charts` + recharts, one
      chart runtime instead of two. Shared pieces in `components/charts/ChartTooltip.tsx`
      and `models/chart-colors.ts`. `EventTimelineChart` was rebuilt as stacked
      floating bars (recharts has no range-bar type).

- [x] Search activities by date (e.g. `november 2`, `2 nov`, `2024-11-02`, `02/11/2024`)
- [x] Add cost/km chart with deletable expense list
