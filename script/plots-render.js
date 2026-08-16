// Renders the interactive plot map for one colony listing on
// plots.html?id=<property-id>. Plot positions are schematic
// (block/row/col entered by the client via the CMS), not traced from
// real survey geometry — see the CSS comment in style/components.css
// for why. Shares escapeHTML with properties-render.js (both inject
// CMS-controlled strings into innerHTML) via script/render-utils.js.

const escapeHTML = window.KDST.escapeHTML;

const STATUS_META = {
  available: {
    label: "Available",
    cellClass: "plot-cell-available",
    badgeClass: "plot-status-badge-available",
  },
  reserved: {
    label: "Reserved",
    cellClass: "plot-cell-reserved",
    badgeClass: "plot-status-badge-reserved",
  },
  sold: {
    label: "Sold",
    cellClass: "plot-cell-sold",
    badgeClass: "plot-status-badge-sold",
  },
};

// Falls back to a neutral/unavailable-looking state rather than
// "Available" for any status the CMS didn't actually set — an
// unrecognized status should never visually read as buyable.
function statusMeta(status) {
  return (
    STATUS_META[status] || {
      label: "Status Unavailable",
      cellClass: "plot-cell-sold",
      badgeClass: "plot-status-badge-sold",
    }
  );
}

function groupPlotsByBlock(plots) {
  // Each plot carries its own index into the flat `plots` array (its
  // position in data/properties.json) — used to look it up again on
  // click, without requiring the client to type a unique id per plot
  // in the CMS. Blocks preserve the order plots appear in the source
  // array, which is also the order the client sees/can reorder in the
  // CMS's list widget.
  const blocks = new Map();
  plots.forEach((plot, index) => {
    const blockName = plot.block || "Plots";
    if (!blocks.has(blockName)) blocks.set(blockName, []);
    blocks.get(blockName).push({ plot, index });
  });
  return blocks;
}

function plotCellHTML(entry) {
  const { plot, index } = entry;
  const meta = statusMeta(plot.status);
  const row = Number.isInteger(plot.row) && plot.row > 0 ? plot.row : 1;
  const col = Number.isInteger(plot.col) && plot.col > 0 ? plot.col : 1;
  const label = plot.label || "?";

  return `
    <button
      type="button"
      class="plot-cell ${meta.cellClass}"
      style="grid-row:${row};grid-column:${col};"
      data-plot-index="${index}"
      aria-label="Plot ${escapeHTML(label)}, ${escapeHTML(plot.sizeLabel || "size not specified")}, ${meta.label}"
    >${escapeHTML(label)}</button>
  `;
}

function blockHTML(blockName, entries) {
  const maxCol = Math.max(1, ...entries.map(({ plot }) => (Number.isInteger(plot.col) && plot.col > 0 ? plot.col : 1)));
  const cells = entries.map(plotCellHTML).join("");

  return `
    <div class="plot-block">
      <h3 class="plot-block-title">${escapeHTML(blockName)}</h3>
      <div class="plot-grid" style="grid-template-columns:repeat(${maxCol}, 44px);">
        ${cells}
      </div>
    </div>
  `;
}

function legendHTML() {
  return `
    <div class="plot-legend">
      <span class="plot-legend-item"><span class="plot-legend-swatch plot-cell-available"></span>Available</span>
      <span class="plot-legend-item"><span class="plot-legend-swatch plot-cell-reserved"></span>Reserved</span>
      <span class="plot-legend-item"><span class="plot-legend-swatch plot-cell-sold"></span>Sold</span>
    </div>
  `;
}

function notFoundHTML() {
  return `
    <p class="notice-text">
      We couldn't find that listing. It may have been removed or the link may be incorrect.
      <br /><br />
      <a href="properties.html" class="btn btn-primary">Browse All Properties</a>
    </p>
  `;
}

function noPlotDataHTML(property) {
  return `
    <p class="notice-text">
      A detailed plot map isn't available for "${escapeHTML(property.title)}" yet.
      Contact us and we'll walk you through the full site plan directly.
      <br /><br />
      <a href="contact.html?property=${encodeURIComponent(property.title)}" class="btn btn-primary">Contact Us</a>
    </p>
  `;
}

// ---- Detail panel (slide-in, with a real focus trap) --------------
let panelBackdrop;
let panel;
let panelCloseBtn;
let panelTitle;
let panelBlock;
let panelSize;
let panelPrice;
let panelStatus;
let panelCta;
let lastFocusedTrigger = null;

function buildPanel() {
  panelBackdrop = document.createElement("div");
  panelBackdrop.className = "plot-panel-backdrop";
  panelBackdrop.id = "plotPanelBackdrop";
  panelBackdrop.hidden = true;

  panel = document.createElement("aside");
  panel.className = "plot-detail-panel";
  panel.id = "plotDetailPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "plotPanelTitle");
  panel.hidden = true;
  panel.innerHTML = `
    <button type="button" class="plot-panel-close" id="plotPanelClose" aria-label="Close plot details">&times;</button>
    <h2 class="plot-panel-title" id="plotPanelTitle"></h2>
    <dl class="plot-panel-details">
      <div><dt>Block</dt><dd id="plotPanelBlock"></dd></div>
      <div><dt>Size</dt><dd id="plotPanelSize"></dd></div>
      <div><dt>Price</dt><dd id="plotPanelPrice"></dd></div>
      <div><dt>Status</dt><dd id="plotPanelStatus"></dd></div>
    </dl>
    <a href="#" class="btn btn-primary btn-full" id="plotPanelCta"></a>
  `;

  document.body.appendChild(panelBackdrop);
  document.body.appendChild(panel);

  panelCloseBtn = document.getElementById("plotPanelClose");
  panelTitle = document.getElementById("plotPanelTitle");
  panelBlock = document.getElementById("plotPanelBlock");
  panelSize = document.getElementById("plotPanelSize");
  panelPrice = document.getElementById("plotPanelPrice");
  panelStatus = document.getElementById("plotPanelStatus");
  panelCta = document.getElementById("plotPanelCta");

  panelCloseBtn.addEventListener("click", closePanel);
  panelBackdrop.addEventListener("click", closePanel);
  panel.addEventListener("keydown", handlePanelKeydown);
}

function handlePanelKeydown(event) {
  if (event.key === "Escape") {
    closePanel();
    return;
  }

  // Minimal focus trap: keep Tab/Shift+Tab cycling within the panel
  // while it's open, so keyboard users can't tab out into the page
  // behind the backdrop.
  if (event.key !== "Tab") return;

  const focusable = panel.querySelectorAll(
    'button, a[href], [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openPanel(plot, property, triggerEl) {
  lastFocusedTrigger = triggerEl;
  const meta = statusMeta(plot.status);

  panelTitle.textContent = `Plot ${plot.label || "?"}`;
  panelBlock.textContent = plot.block || "—";
  panelSize.textContent = plot.sizeLabel || "Not specified";
  panelPrice.textContent = plot.priceLabel || property.priceLabel || "Contact for price";
  panelStatus.innerHTML = `<span class="plot-status-badge ${meta.badgeClass}">${escapeHTML(meta.label)}</span>`;

  if (plot.status === "available") {
    panelCta.textContent = `Enquire About Plot ${plot.label || ""}`;
    panelCta.href = `contact.html?property=${encodeURIComponent(`${property.title} - Plot ${plot.label || ""}`)}`;
  } else {
    panelCta.textContent = "Contact Us About This Colony";
    panelCta.href = `contact.html?property=${encodeURIComponent(property.title)}`;
  }

  panelBackdrop.hidden = false;
  panel.hidden = false;
  panelCloseBtn.focus();
  document.addEventListener("keydown", handleDocumentEscapeWhilePanelOpen);
}

function handleDocumentEscapeWhilePanelOpen(event) {
  if (event.key === "Escape") closePanel();
}

function closePanel() {
  panelBackdrop.hidden = true;
  panel.hidden = true;
  document.removeEventListener("keydown", handleDocumentEscapeWhilePanelOpen);
  if (lastFocusedTrigger) lastFocusedTrigger.focus();
}

// ---- Page load --------------------------------------------------
async function loadPlotMap() {
  const contentEl = document.getElementById("plotsContent");
  const titleEl = document.getElementById("plotsTitle");
  const subtitleEl = document.getElementById("plotsSubtitle");
  if (!contentEl) return;

  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get("id");

  let data;
  try {
    const res = await fetch("data/properties.json");
    data = await res.json();
  } catch (err) {
    contentEl.innerHTML =
      '<p class="notice-text">Could not load property data right now. Please try again shortly.</p>';
    console.error("Failed to load properties.json", err);
    return;
  }

  const listings = Array.isArray(data.listings) ? data.listings : [];
  const property = listings.find((p) => p.id === propertyId);

  if (!property) {
    titleEl.textContent = "Listing Not Found";
    subtitleEl.textContent = "";
    contentEl.innerHTML = notFoundHTML();
    return;
  }

  titleEl.textContent = `Plot Map — ${property.title}`;
  subtitleEl.textContent = property.locationLabel || "";

  const plots = Array.isArray(property.plots) ? property.plots : [];
  if (plots.length === 0) {
    contentEl.innerHTML = noPlotDataHTML(property);
    return;
  }

  const blocks = groupPlotsByBlock(plots);
  const blocksHTML = Array.from(blocks.entries())
    .map(([blockName, entries]) => blockHTML(blockName, entries))
    .join("");

  contentEl.innerHTML = `
    <p class="plot-map-intro">Click any plot below to see its size, price, and availability.</p>
    ${legendHTML()}
    <div class="plot-blocks-wrapper">${blocksHTML}</div>
  `;

  buildPanel();

  contentEl.addEventListener("click", (event) => {
    const cell = event.target.closest(".plot-cell");
    if (!cell) return;
    const index = Number(cell.dataset.plotIndex);
    const plot = plots[index];
    if (plot) openPanel(plot, property, cell);
  });
}

document.addEventListener("DOMContentLoaded", loadPlotMap);
