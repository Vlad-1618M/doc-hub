# Design prototypes (HTML)

Static mocks for **Recent records** styling experiments — not wired to the app.

| File | Background | Recent-dot effect |
|------|------------|-------------------|
| [recent-records-glow-01-chart-grid.html](recent-records-glow-01-chart-grid.html) | Chart-style grid + soft radial wash | Pulse scale + `box-shadow` glow |
| [recent-records-glow-02-sparkline-mesh.html](recent-records-glow-02-sparkline-mesh.html) | Mesh as above + **occasional fast “meteor”** streak (random `d`, color, ~0.65–1.2s, ~8–35s apart) | Themes + ring dots |
| [recent-records-glow-03-hex-breathe.html](recent-records-glow-03-hex-breathe.html) | Slow-drifting diagonal line mesh | Breathe scale + `drop-shadow` |
| [recent-records-glow-04-electric-discharge.html](recent-records-glow-04-electric-discharge.html) | Procedural lightning (midpoint displacement); flicker via opacity + stroke-width (no dash-array) | Themes + ring dots |
| [recent-records-glow-05-energy-waves.html](recent-records-glow-05-energy-waves.html) | **Shattered glass** bursts (radial facets + cracks), same timing rhythm as prototype 4 lightning | Themes + ring dots |
| [recent-records-glow-06-world-monitor.html](recent-records-glow-06-world-monitor.html) | **World Monitor–style** ops UI: **circular radar** with simplified world map, range rings, sweep; **Cyan** or **night vision** scheme; hotspot pulses, UTC clock ([worldmonitor.app](https://www.worldmonitor.app)–inspired riff) | Telemetry ring (recent) / dim diamond (stale) |

Open any `.html` file in a browser (double-click or `open designs_prototypes/…`).

Each file includes a mock **pagination** footer (`1–5 of 248`, Previous / Next).
