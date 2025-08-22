document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleBtn");
  const applyBtn = document.getElementById("applyBtn");
  const gridType = document.getElementById("gridType");
  const columns = document.getElementById("columns");
  const rows = document.getElementById("rows");
  const spacing = document.getElementById("spacing");
  const color = document.getElementById("color");
  const opacity = document.getElementById("opacity");
  const status = document.getElementById("status");
  const rowsControl = document.getElementById("rowsControl");
  const spacingControl = document.getElementById("spacingControl");

  // Load saved settings
  chrome.storage.sync.get(["gridSettings"], (result) => {
    if (result.gridSettings) {
      const settings = result.gridSettings;
      gridType.value = settings.type || "columns";
      columns.value = settings.columns || 12;
      rows.value = settings.rows || 8;
      spacing.value = settings.spacing || 20;
      color.value = settings.color || "#ff0000";
      opacity.value = settings.opacity || 0.3;
      updateControlVisibility();
    }
  });

  // Check current grid state
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "getGridState" }, (response) => {
      if (response && response.visible) {
        toggleBtn.textContent = "Hide Grid";
        toggleBtn.classList.add("off");
      } else {
        toggleBtn.textContent = "Show Grid";
        toggleBtn.classList.remove("off");
      }
    });
  });

  // Toggle grid visibility
  toggleBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleGrid" }, (response) => {
        if (response && response.visible) {
          toggleBtn.textContent = "Hide Grid";
          toggleBtn.classList.add("off");
          status.textContent = "Grid is visible";
        } else {
          toggleBtn.textContent = "Show Grid";
          toggleBtn.classList.remove("off");
          status.textContent = "Grid is hidden";
        }
      });
    });
  });

  // Apply settings
  applyBtn.addEventListener("click", () => {
    const settings = {
      type: gridType.value,
      columns: parseInt(columns.value),
      rows: parseInt(rows.value),
      spacing: parseInt(spacing.value),
      color: color.value,
      opacity: parseFloat(opacity.value),
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: "updateGrid",
          settings: settings,
        },
        (response) => {
          if (response && response.success) {
            status.textContent = "Settings applied!";
            setTimeout(() => {
              status.textContent = "Ready";
            }, 2000);
          }
        }
      );
    });
  });

  // Update control visibility based on grid type
  gridType.addEventListener("change", updateControlVisibility);

  function updateControlVisibility() {
    const type = gridType.value;
    if (type === "spacing") {
      rowsControl.style.display = "none";
      spacingControl.style.display = "block";
    } else if (type === "columns") {
      rowsControl.style.display = "none";
      spacingControl.style.display = "none";
    } else {
      rowsControl.style.display = "block";
      spacingControl.style.display = "none";
    }
  }
});
