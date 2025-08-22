/**
 * Grid Overlay Extension - Content Script
 * Manages grid overlay creation and interaction on web pages
 */

'use strict';

// Grid state management
let gridOverlay = null;
let isGridVisible = false;
let currentSettings = null;

// Configuration constants
const GRID_CONFIG = {
  OVERLAY_ID: 'grid-overlay-extension',
  STORAGE_KEY: 'gridSettings',
  Z_INDEX: 999999,
  DEFAULTS: {
    columns: 12,
    rows: 8,
    spacing: 10,
    color: '#ff0000',
    opacity: 0.3,
    type: 'spacing'
  }
};

/**
 * Initialize the content script
 */
function initialize() {
  loadSavedSettings();
  setupMessageListener();
}

/**
 * Load saved settings from Chrome storage
 */
function loadSavedSettings() {
  chrome.storage.sync.get([GRID_CONFIG.STORAGE_KEY], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading grid settings:', chrome.runtime.lastError);
      return;
    }
    
    const settings = result[GRID_CONFIG.STORAGE_KEY];
    if (settings && validateSettings(settings)) {
      currentSettings = settings;
      createGrid(settings);
    } else {
      currentSettings = GRID_CONFIG.DEFAULTS;
    }
  });
}

/**
 * Setup message listener for popup communication
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      switch (message.action) {
        case 'ping':
          // Respond to ping to confirm content script is loaded
          sendResponse({ success: true, loaded: true });
          break;
          
        case 'toggleGrid':
          toggleGrid();
          sendResponse({ visible: isGridVisible, success: true });
          break;
          
        case 'updateGrid':
          if (message.settings && validateSettings(message.settings)) {
            createGrid(message.settings);
            saveSettings(message.settings);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Invalid settings' });
          }
          break;
          
        case 'getGridState':
          sendResponse({ 
            visible: isGridVisible, 
            settings: currentSettings,
            success: true 
          });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    // Return true to indicate async response
    return true;
  });
}

/**
 * Create and configure the grid overlay
 * @param {Object} settings - Grid configuration settings
 */
function createGrid(settings) {
  if (!validateSettings(settings)) {
    console.error('Invalid grid settings provided');
    return false;
  }
  
  // Remove existing grid
  removeExistingGrid();
  
  // Create new grid overlay
  gridOverlay = createGridElement();
  
  // Configure grid based on settings
  configureGrid(gridOverlay, settings);
  
  // Add to DOM
  document.body.appendChild(gridOverlay);
  
  // Set visibility
  setGridVisibility(isGridVisible);
  
  // Update current settings
  currentSettings = { ...settings };
  
  return true;
}

/**
 * Remove existing grid overlay
 */
function removeExistingGrid() {
  const existingGrid = document.getElementById(GRID_CONFIG.OVERLAY_ID);
  if (existingGrid) {
    existingGrid.remove();
  }
}

/**
 * Create the main grid overlay element
 * @returns {HTMLElement} Grid overlay element
 */
function createGridElement() {
  const overlay = document.createElement('div');
  overlay.id = GRID_CONFIG.OVERLAY_ID;
  
  // Set base styles
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: GRID_CONFIG.Z_INDEX.toString(),
    display: 'none',
    gap: '0',
    margin: '0',
    padding: '0',
    boxSizing: 'border-box'
  });
  
  return overlay;
}

/**
 * Configure grid overlay based on settings
 * @param {HTMLElement} overlay - Grid overlay element
 * @param {Object} settings - Grid configuration settings
 */
function configureGrid(overlay, settings) {
  const { columns, rows, spacing, color, opacity, type } = settings;
  
  // Clear existing classes and styles
  overlay.className = '';
  
  // Configure based on grid type
  switch (type) {
    case 'columns':
      configureColumnsGrid(overlay, columns);
      break;
    case 'spacing':
      configureSpacingGrid(overlay, spacing);
      break;
    case 'grid':
    default:
      configureFullGrid(overlay, columns, rows);
      break;
  }
  
  // Apply color and opacity
  applyGridStyling(overlay, color, opacity);
  
  // Add grid items for non-spacing grids
  if (type !== 'spacing') {
    addGridItems(overlay, type, columns, rows);
  }
}

/**
 * Configure columns-only grid
 * @param {HTMLElement} overlay - Grid overlay element
 * @param {number} columns - Number of columns
 */
function configureColumnsGrid(overlay, columns) {
  overlay.style.gridTemplateColumns = `repeat(${Math.max(1, columns)}, 1fr)`;
  overlay.style.gridTemplateRows = 'none';
}

/**
 * Configure spacing grid
 * @param {HTMLElement} overlay - Grid overlay element
 * @param {number} spacing - Grid spacing in pixels
 */
function configureSpacingGrid(overlay, spacing) {
  const spacingValue = Math.max(5, Math.min(200, spacing));
  overlay.style.backgroundSize = `${spacingValue}px ${spacingValue}px`;
  overlay.classList.add('spacing-grid');
}

/**
 * Configure full grid (rows and columns)
 * @param {HTMLElement} overlay - Grid overlay element
 * @param {number} columns - Number of columns
 * @param {number} rows - Number of rows
 */
function configureFullGrid(overlay, columns, rows) {
  overlay.style.gridTemplateColumns = `repeat(${Math.max(1, columns)}, 1fr)`;
  overlay.style.gridTemplateRows = `repeat(${Math.max(1, rows)}, 1fr)`;
}

/**
 * Apply color and opacity styling
 * @param {HTMLElement} overlay - Grid overlay element
 * @param {string} color - Grid color
 * @param {number} opacity - Grid opacity
 * @param {string} type - Grid type
 */
function applyGridStyling(overlay, color, opacity) {
  const validColor = validateColor(color) ? color : GRID_CONFIG.DEFAULTS.color;
  const validOpacity = Math.max(0.1, Math.min(1.0, opacity));
  
  overlay.style.borderColor = validColor;
  overlay.style.opacity = validOpacity.toString();
  overlay.style.setProperty('--grid-color', validColor);
}

/**
 * Add grid items to overlay
 * @param {HTMLElement} overlay - Grid overlay element
 * @param {string} type - Grid type
 * @param {number} columns - Number of columns
 * @param {number} rows - Number of rows
 */
function addGridItems(overlay, type, columns, rows) {
  const totalCells = type === 'columns' ? columns : columns * rows;
  const fragment = document.createDocumentFragment();
  
  for (let i = 0; i < totalCells; i++) {
    const gridItem = document.createElement('div');
    gridItem.className = 'grid-item';
    fragment.appendChild(gridItem);
  }
  
  overlay.appendChild(fragment);
}

/**
 * Toggle grid visibility
 */
function toggleGrid() {
  if (!gridOverlay) {
    // Create default grid if none exists
    const defaultSettings = currentSettings || GRID_CONFIG.DEFAULTS;
    if (!createGrid(defaultSettings)) {
      console.error('Failed to create default grid');
      return;
    }
  }
  
  isGridVisible = !isGridVisible;
  setGridVisibility(isGridVisible);
}

/**
 * Set grid visibility
 * @param {boolean} visible - Whether grid should be visible
 */
function setGridVisibility(visible) {
  if (!gridOverlay) return;
  
  gridOverlay.style.display = visible ? 'grid' : 'none';
  isGridVisible = visible;
}

/**
 * Save settings to Chrome storage
 * @param {Object} settings - Settings to save
 */
function saveSettings(settings) {
  chrome.storage.sync.set({ [GRID_CONFIG.STORAGE_KEY]: settings }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving grid settings:', chrome.runtime.lastError);
    }
  });
}

/**
 * Validate grid settings object
 * @param {Object} settings - Settings to validate
 * @returns {boolean} Whether settings are valid
 */
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return false;
  }
  
  const requiredFields = ['type', 'columns', 'rows', 'spacing', 'color', 'opacity'];
  return requiredFields.every(field => settings.hasOwnProperty(field)) &&
         ['columns', 'grid', 'spacing'].includes(settings.type) &&
         typeof settings.columns === 'number' && settings.columns > 0 &&
         typeof settings.rows === 'number' && settings.rows > 0 &&
         typeof settings.spacing === 'number' && settings.spacing > 0 &&
         typeof settings.color === 'string' &&
         typeof settings.opacity === 'number' && settings.opacity > 0 && settings.opacity <= 1;
}

/**
 * Validate color format
 * @param {string} color - Color string to validate
 * @returns {boolean} Whether color is valid
 */
function validateColor(color) {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Initialize the content script
initialize();