# Sprint 3 Green Screen Kiosk

This project delivers a fully touch-friendly HTML kiosk experience for the group green screen sprint. Open `index.html` in any modern browser to run the kiosk locally.

## Features

- Guided, touch-first workflow for choosing backgrounds, adding custom uploads, and capturing an identifying selfie.
- Configurable pricing, payment methods, delivery options, and selectable backgrounds via `config.js`.
- Dynamic email and print selections with on-screen keyboard input (no hardware keyboard required).
- Auto-generated two-part receipt with stamp areas and operations checklist ready for printing.

## Customizing the kiosk

1. Update the values exported from `config.js` to adjust pricing, event names, delivery methods, or available backgrounds.
2. Provide new background image URLs or host local assets and update the `backgrounds` array.
3. Open `index.html` in a browser, and the kiosk will reflect the new configuration immediately.

## Development notes

- The kiosk persists the next customer number in `localStorage`. To reset numbering, clear the browser storage for the page.
- All assets are static and require no build step; modify the HTML, CSS, or JavaScript directly as needed.

