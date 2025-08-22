let gridOverlay = null;
let isGridVisible = false;

// Load saved settings
chrome.storage.sync.get(["gridSettings"], (result) => {
  if (result.gridSettings) {
    createGrid(result.gridSettings);
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleGrid") {
    toggleGrid();
    sendResponse({ visible: isGridVisible });
  } else if (message.action === "updateGrid") {
    createGrid(message.settings);
    // Save settings
    chrome.storage.sync.set({ gridSettings: message.settings });
    sendResponse({ success: true });
  } else if (message.action === "getGridState") {
    sendResponse({ visible: isGridVisible });
  }
});

function createGrid(settings) {
  // Remove existing grid
  if (gridOverlay) {
    gridOverlay.remove();
  }

  gridOverlay = document.createElement("div");
  gridOverlay.id = "grid-overlay-extension";

  // Set grid properties based on settings
  const { columns, rows, spacing, color, opacity, type } = settings;

  if (type === "columns") {
    gridOverlay.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    gridOverlay.style.gridTemplateRows = "none";
  } else if (type === "spacing") {
    gridOverlay.style.backgroundSize = `${spacing}px ${spacing}px`;
    gridOverlay.classList.add("spacing-grid");
  } else {
    gridOverlay.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    gridOverlay.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  }

  gridOverlay.style.borderColor = color;
  gridOverlay.style.opacity = opacity;

  // Add grid items for column/row grid
  if (type !== "spacing") {
    const totalCells = type === "columns" ? columns : columns * rows;
    for (let i = 0; i < totalCells; i++) {
      const gridItem = document.createElement("div");
      gridItem.className = "grid-item";
      gridOverlay.appendChild(gridItem);
    }
  }

  document.body.appendChild(gridOverlay);

  if (isGridVisible) {
    gridOverlay.style.display = "grid";
  } else {
    gridOverlay.style.display = "none";
  }
}

function toggleGrid() {
  if (!gridOverlay) {
    // Create default grid if none exists
    createGrid({
      columns: 12,
      rows: 8,
      spacing: 20,
      color: "#ff0000",
      opacity: 0.3,
      type: "columns",
    });
  }

  isGridVisible = !isGridVisible;
  gridOverlay.style.display = isGridVisible ? "grid" : "none";
}
