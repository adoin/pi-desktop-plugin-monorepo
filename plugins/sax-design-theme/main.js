/**
 * sax-design-theme — PI-Desktop plugin entry.
 *
 * The host injects the global `pi` object. Every call is gated by the
 * permissions declared in manifest.json, so widening what this file does
 * usually means widening `permissions` too.
 */

async function onLoad() {
  await pi.commands.register({
    id: "pi-desktop-sax-theme.open",
    title: "sax-design-theme: Open Panel",
    keywords: ["sax-design-theme", "pi-desktop-sax-theme"],
    run: async () => {
      await pi.ui.openPanel({ title: "sax-design-theme" });
    },
  });
}

async function onUnload() {
  await pi.commands.unregister("pi-desktop-sax-theme.open");
}

module.exports = { onLoad, onUnload };
