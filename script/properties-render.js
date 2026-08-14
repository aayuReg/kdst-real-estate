// Renders property cards from data/properties.json and wires up
// the search box + location/type/price filters + "Apply Filters" button.

const ICONS = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2 6 6L7 23l-6-6Z"/><path d="m14.5 3.5 2 2"/><path d="m11.5 6.5 2 2"/><path d="m8.5 9.5 2 2"/><path d="m5.5 12.5 2 2"/></svg>',
  "file-check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>',
  road: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19 8 5h8l4 14"/><path d="M12 5v3"/><path d="M12 12v3"/></svg>',
  houses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V10l6-4 6 4v11"/><path d="M15 21v-7l6-4v11"/><path d="M9 21v-5h0"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7v8l10-12h-7z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/></svg>',
  bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6 12 3l7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/></svg>'
};

function icon(name) {
  return `<span class="detail-icon">${ICONS[name] || ""}</span>`;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// F08: validate image sources rather than trusting them blindly.
// Escaping (above) prevents HTML/script injection, but a malicious or
// malformed CMS entry could still point `image` at an arbitrary
// external URL. Only allow local paths (this site's own bundled or
// CMS-uploaded assets) or same-origin absolute URLs; anything else
// falls back to a safe local placeholder.
const FALLBACK_IMAGE = "assets/icons/placeholder-house.jpg";
function safeImageSrc(rawSrc) {
  const value = String(rawSrc || "").trim();
  if (!value) return FALLBACK_IMAGE;

  // Relative/root-relative local paths, e.g. "assets/uploads/x.jpg" or
  // "/assets/uploads/x.jpg" — what the CMS actually writes.
  if (/^\/?assets\//.test(value) || /^\.\/assets\//.test(value)) {
    return value;
  }

  // Same-origin absolute URL (e.g. a canonical https://www.kdst-realestate.com/assets/... link).
  try {
    const url = new URL(value, window.location.href);
    if (url.origin === window.location.origin && /^\/?assets\//.test(url.pathname)) {
      return url.pathname;
    }
  } catch (_) {
    // Not a parseable URL — fall through to the placeholder.
  }

  return FALLBACK_IMAGE;
}

// F17: price buckets as explicit, data-driven ranges instead of a
// hard-coded if/else chain with implicit boundaries. Keep these values
// in sync with the <option value="..."> list in properties.html.
const PRICE_RANGES = [
  { value: "0-50", min: 0, max: 50 },
  { value: "50-100", min: 50, max: 100 },
  { value: "100-200", min: 100, max: 200 },
  { value: "200+", min: 200, max: Infinity },
];

function priceBucket(value) {
  const range = PRICE_RANGES.find((r) => value >= r.min && value < r.max);
  return range ? range.value : PRICE_RANGES[PRICE_RANGES.length - 1].value;
}

function propertyCardHTML(p) {
  const badge = p.badge
    ? `<span class="property-badge">${escapeHTML(p.badge)}</span>`
    : "";
  const details = (p.details || [])
    .map(
      (d) =>
        `<div class="property-detail">${icon(d.icon)}<span>${escapeHTML(d.label)}</span></div>`
    )
    .join("");

  return `
    <div class="property-card" data-type="${escapeHTML(p.type)}" data-location="${escapeHTML(p.location)}" data-price="${Number(p.priceValue) || 0}" data-property-id="${escapeHTML(p.id)}">
      <div class="property-image">
        <img src="${escapeHTML(safeImageSrc(p.image))}" alt="${escapeHTML(p.title)}" width="400" height="240" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';" />
        ${badge}
      </div>
      <div class="property-content">
        <h3 class="property-title">${escapeHTML(p.title)}</h3>
        <div class="property-location">${icon("pin")}<span>${escapeHTML(p.locationLabel)}</span></div>
        <div class="property-details">${details}</div>
        <div class="property-price">${escapeHTML(p.priceLabel)}</div>
        <a href="contact.html?property=${encodeURIComponent(p.title)}" class="btn btn-primary btn-full">Contact Agent</a>
      </div>
    </div>
  `;
}

async function loadProperties() {
  const grid = document.getElementById("propertiesGrid");
  if (!grid) return;

  let properties = [];
  try {
    const res = await fetch("data/properties.json");
    const data = await res.json();
    properties = Array.isArray(data.listings) ? data.listings : [];
  } catch (err) {
    if (window.location.protocol === "file:") {
      grid.innerHTML =
        '<p class="notice-text">' +
        "It looks like this page was opened directly as a file, which browsers block from loading property data for security reasons. " +
        "Run a local server (e.g. <code>python3 -m http.server</code> in this folder) or view the live deployed site instead." +
        "</p>";
    } else {
      grid.innerHTML =
        '<p class="notice-text">Could not load properties right now. Please try again shortly.</p>';
    }
    console.error("Failed to load properties.json", err);
    return;
  }

  grid.innerHTML = properties.map(propertyCardHTML).join("");
  wireFilters();

  // Register the freshly-injected cards for the same scroll-reveal
  // animation used elsewhere on the site (see script/main.js). Cards
  // don't exist yet when main.js does its own initial pass, so this
  // page registers them itself once they're actually in the DOM.
  if (window.KDST && typeof window.KDST.observeReveal === "function") {
    window.KDST.observeReveal(grid.querySelectorAll(".property-card"));
  }
}

function wireFilters() {
  const searchInput = document.getElementById("propertySearch");
  const locationFilter = document.getElementById("locationFilter");
  const typeFilter = document.getElementById("typeFilter");
  const priceFilter = document.getElementById("priceFilter");
  const resetBtn = document.getElementById("resetFiltersBtn");
  const noResults = document.getElementById("noResults");
  const grid = document.getElementById("propertiesGrid");

  function applyFilters() {
    const term = (searchInput?.value || "").toLowerCase().trim();
    const loc = locationFilter?.value || "";
    const type = typeFilter?.value || "";
    const price = priceFilter?.value || "";

    let visibleCount = 0;

    grid.querySelectorAll(".property-card").forEach((card) => {
      const title = card.querySelector(".property-title").textContent.toLowerCase();
      const locationText = card.querySelector(".property-location").textContent.toLowerCase();
      // F18: search now also covers the detail-tag chips (size, road
      // width, utilities, etc.), not just title/location, since those
      // often contain the terms a visitor actually searches for.
      const detailsText = card.querySelector(".property-details")?.textContent.toLowerCase() || "";
      const cardLocation = card.dataset.location;
      const cardType = card.dataset.type;
      const cardPriceBucket = priceBucket(Number(card.dataset.price));

      const matchesSearch =
        !term ||
        title.includes(term) ||
        locationText.includes(term) ||
        detailsText.includes(term);
      const matchesLocation = !loc || cardLocation === loc;
      const matchesType = !type || cardType === type;
      const matchesPrice = !price || cardPriceBucket === price;

      const visible =
        matchesSearch && matchesLocation && matchesType && matchesPrice;

      card.style.display = visible ? "block" : "none";
      if (visible) visibleCount++;
    });

    noResults?.classList.toggle("is-visible", visibleCount === 0);
  }

  function resetFilters() {
    if (searchInput) searchInput.value = "";
    if (locationFilter) locationFilter.value = "";
    if (typeFilter) typeFilter.value = "";
    if (priceFilter) priceFilter.value = "";
    applyFilters();
  }

  searchInput?.addEventListener("input", applyFilters);
  locationFilter?.addEventListener("change", applyFilters);
  typeFilter?.addEventListener("change", applyFilters);
  priceFilter?.addEventListener("change", applyFilters);
  resetBtn?.addEventListener("click", resetFilters);
}

document.addEventListener("DOMContentLoaded", loadProperties);
