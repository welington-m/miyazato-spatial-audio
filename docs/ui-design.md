# UI design

Dark near-black canvas, official electric lime accent, low-opacity borders, translucent-gradient panels and a CSS-rendered listening orb. Official logos and icons are sourced from `assets/branding/` and served locally; no remote font is needed. Sidebar navigation, status header, Home mode cards, content presets, quick controls, A/B, EQ response editor, expert dynamics, output routing and settings are implemented.

Home quick controls expose real stereo width, bass and clarity. Spatial/immersion are marked Phase 2 and are not interactive fake DSP controls. Spatial page explicitly labels the layout preview and HRTF bypass. Device cards show actual enumerated endpoints in the native host, and an empty state in browser preview. No mock hardware, CPU or latency is presented as measured data.

EQ uses 180 response samples computed on parameter changes, including filter types at the selected output rate (48 kHz fallback). SVG points edit gain/frequency by pointer; arrow keys edit gain; numerical fields edit frequency, gain, Q and filter type. Tooltip uses native SVG titles; continuous drag tooltips and a dedicated worker/canvas response renderer are future refinements.

Tokens live in `styles.css`: surface, border, accent, muted, radius, spacing, duration and sidebar width. More token consolidation and extraction into a larger component system remains future work. Shared Slider, Meter, Spectrum, Orb and SpatialVisualizer are independent UI components; no audio processing happens in React. Native status arrives by events. CSS orb updates use transform and amplitude; Off/Low stop decorative motion, Medium animates a single layer, High adds orbit rotation. Reduced-motion preferences disable animations.

Responsive breakpoints support narrow notebooks, standard desktop and large displays. Small screens use icon sidebar and stacked panels. High DPI uses CSS/SVG and WebView2 layout; hardware 4K/GPU performance is unverified. Focus outlines, semantic buttons, pressed states, range labels and keyboard EQ controls are present. Touch/pointer interaction, screen reader contrast and visual QA need Windows verification.
