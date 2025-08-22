/**
 * Grid Overlay Extension - Popup Script
 * Manages the extension popup interface and user interactions
 */

'use strict';

// Configuration constants
const CONFIG = {
  DEFAULTS: {
    type: 'columns',
    columns: 12,
    rows: 8,
    spacing: 20,
    color: '#ff0000',
    opacity: 0.3
  },
  LIMITS: {
    columns: { min: 1, max: 50 },
    rows: { min: 1, max: 50 },
    spacing: { min: 5, max: 200 },
    opacity: { min: 0.1, max: 1.0 }
  },
  MESSAGES: {
    GRID_VISIBLE: 'Grid is visible',
    GRID_HIDDEN: 'Grid is hidden',
    SETTINGS_APPLIED: 'Settings applied!',
    READY: 'Ready',
    ERROR: 'Error occurred'
  }
};

// DOM elements cache
let elements = {};

/**
 * Initialize the popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements
  elements = {
    toggleBtn: document.getElementById('toggleBtn'),
    applyBtn: document.getElementById('applyBtn'),
    gridType: document.getElementById('gridType'),
    columns: document.getElementById('columns'),
    rows: document.getElementById('rows'),
    spacing: document.getElementById('spacing'),
    color: document.getElementById('color'),
    opacity: document.getElementById('opacity'),
    status: document.getElementById('status'),
    rowsControl: document.getElementById('rowsControl'),
    spacingControl: document.getElementById('spacingControl'),
    columnsRowsControl: document.getElementById('columnsRowsControl'),
    colorLabel: document.getElementById('colorLabel')
  };

  // Validate that all required elements exist
  const missingElements = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([key]) => key);
  
  if (missingElements.length > 0) {
    console.error('Missing DOM elements:', missingElements);
    showStatus('Error: Missing interface elements', 'error');
    return;
  }

  // Initialize the popup
  initializePopup();

});

/**
 * Initialize the popup interface
 */
function initializePopup() {
  loadSavedSettings();
  checkGridState();
  setupEventListeners();
}

/**
 * Load saved settings from Chrome storage
 */
function loadSavedSettings() {
  chrome.storage.sync.get(['gridSettings'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading settings:', chrome.runtime.lastError);
      showStatus('Error loading settings', 'error');
      return;
    }

    const settings = result.gridSettings || CONFIG.DEFAULTS;
    
    // Apply loaded settings with validation
    elements.gridType.value = validateGridType(settings.type);
    elements.columns.value = validateNumber(settings.columns, CONFIG.LIMITS.columns);
    elements.rows.value = validateNumber(settings.rows, CONFIG.LIMITS.rows);
    elements.spacing.value = validateNumber(settings.spacing, CONFIG.LIMITS.spacing);
    elements.color.value = validateColor(settings.color);
    elements.opacity.value = validateNumber(settings.opacity, CONFIG.LIMITS.opacity);
    
    updateColorDisplay();
    updateControlVisibility();
  });
}

/**
 * Check current grid state and update toggle button
 */
function checkGridState() {
  executeInActiveTab((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'getGridState' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Could not get grid state:', chrome.runtime.lastError);
        return;
      }
      
      updateToggleButton(response?.visible || false);
    });
  });
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {

  elements.toggleBtn.addEventListener('click', handleToggleGrid);
  elements.applyBtn.addEventListener('click', handleApplySettings);
  elements.gridType.addEventListener('change', updateControlVisibility);
  elements.color.addEventListener('change', handleColorChange);
  
  // Add input validation listeners
  elements.columns.addEventListener('input', () => validateInput(elements.columns, CONFIG.LIMITS.columns));
  elements.rows.addEventListener('input', () => validateInput(elements.rows, CONFIG.LIMITS.rows));
  elements.spacing.addEventListener('input', () => validateInput(elements.spacing, CONFIG.LIMITS.spacing));
}

/**
 * Handle grid toggle button click
 */
function handleToggleGrid() {
  elements.applyBtn.disabled = true;
  
  executeInActiveTab((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleGrid' }, (response) => {
      elements.applyBtn.disabled = false;
      
      if (chrome.runtime.lastError) {
        console.error('Error toggling grid:', chrome.runtime.lastError);
        showStatus('Error toggling grid', 'error');
        return;
      }
      
      const isVisible = response?.visible || false;
      updateToggleButton(isVisible);
      showStatus(isVisible ? CONFIG.MESSAGES.GRID_VISIBLE : CONFIG.MESSAGES.GRID_HIDDEN);
    });
  });
}

/**
 * Handle apply settings button click
 */
function handleApplySettings() {
  const settings = getCurrentSettings();
  
  if (!validateSettings(settings)) {
    showStatus('Invalid settings', 'error');
    return;
  }
  
  elements.applyBtn.disabled = true;
  showStatus('Applying settings...');
  
  executeInActiveTab((tab) => {
    chrome.tabs.sendMessage(tab.id, {
      action: 'updateGrid',
      settings: settings
    }, (response) => {
      elements.applyBtn.disabled = false;
      
      if (chrome.runtime.lastError) {
        console.error('Error applying settings:', chrome.runtime.lastError);
        showStatus('Error applying settings', 'error');
        return;
      }
      
      if (response?.success) {
        saveSettings(settings);
        showStatus(CONFIG.MESSAGES.SETTINGS_APPLIED, 'success');
        setTimeout(() => showStatus(CONFIG.MESSAGES.READY), 2000);
      } else {
        showStatus('Failed to apply settings', 'error');
      }
    });
  });
}

/**
 * Handle color change event
 */
function handleColorChange() {
  updateColorDisplay();
  const settings = getCurrentSettings();
  saveSettings(settings);
}

/**
 * Update the color display indicator
 */
function updateColorDisplay() {
  if (elements.colorLabel && elements.color.value) {
    elements.colorLabel.style.setProperty('--selected-color', elements.color.value);
  }
}

/**
 * Get current settings from form inputs
 * @returns {Object} Current settings object
 */
function getCurrentSettings() {
  return {
    type: elements.gridType.value,
    columns: parseInt(elements.columns.value) || CONFIG.DEFAULTS.columns,
    rows: parseInt(elements.rows.value) || CONFIG.DEFAULTS.rows,
    spacing: parseInt(elements.spacing.value) || CONFIG.DEFAULTS.spacing,
    color: elements.color.value || CONFIG.DEFAULTS.color,
    opacity: parseFloat(elements.opacity.value) || CONFIG.DEFAULTS.opacity
  };
}

/**
 * Save settings to Chrome storage
 * @param {Object} settings - Settings to save
 */
function saveSettings(settings) {
  chrome.storage.sync.set({ gridSettings: settings }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving settings:', chrome.runtime.lastError);
    }
  });
}

/**
 * Update control visibility based on grid type
 */
function updateControlVisibility() {
  const type = elements.gridType.value;
  
  // Hide/show controls based on grid type
  switch (type) {
    case 'spacing':
      elements.columnsRowsControl.style.display = 'none';
      elements.spacingControl.style.display = 'block';
      break;
    case 'columns':
      elements.columnsRowsControl.style.display = 'block';
      elements.rowsControl.style.display = 'none';
      elements.spacingControl.style.display = 'none';
      break;
    case 'grid':
    default:
      elements.columnsRowsControl.style.display = 'block';
      elements.rowsControl.style.display = 'block';
      elements.spacingControl.style.display = 'none';
      break;
  }
}

/**
 * Update toggle button state
 * @param {boolean} isVisible - Whether grid is visible
 */
function updateToggleButton(isVisible) {
  if (isVisible) {
    elements.toggleBtn.textContent = 'Hide Grid';
    elements.toggleBtn.classList.add('off');
  } else {
    elements.toggleBtn.textContent = 'Show Grid';
    elements.toggleBtn.classList.remove('off');
  }
}

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success', 'error', or default)
 */
function showStatus(message, type = '') {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
}

/**
 * Execute callback with active tab, ensuring content script is injected
 * @param {Function} callback - Callback function
 */
function executeInActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      showStatus('Error accessing tab', 'error');
      return;
    }
    
    if (tabs && tabs[0]) {
      ensureContentScriptInjected(tabs[0], callback);
    } else {
      showStatus('No active tab found', 'error');
    }
  });
}

/**
 * Ensure content script is injected in the tab
 * @param {Object} tab - Chrome tab object
 * @param {Function} callback - Callback function to execute after injection
 */
function ensureContentScriptInjected(tab, callback) {
  // Skip injection for chrome:// and other restricted URLs
  if (!canInjectIntoTab(tab)) {
    showStatus('Cannot inject into this page', 'error');
    return;
  }

  // Test if content script is already available
  chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      // Content script not available, inject it
      injectContentScript(tab, callback);
    } else {
      // Content script available, proceed
      callback(tab);
    }
  });
}

/**
 * Check if we can inject scripts into the current tab
 * @param {Object} tab - Chrome tab object
 * @returns {boolean} Whether injection is allowed
 */
function canInjectIntoTab(tab) {
  const url = tab.url;
  const restrictedSchemes = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'opera:'];
  const restrictedUrls = ['chrome.google.com/webstore'];
  
  return url && 
         !restrictedSchemes.some(scheme => url.startsWith(scheme)) &&
         !restrictedUrls.some(restricted => url.includes(restricted));
}

/**
 * Inject content script and CSS into tab
 * @param {Object} tab - Chrome tab object
 * @param {Function} callback - Callback function to execute after injection
 */
function injectContentScript(tab, callback) {
  showStatus('Initializing grid system...');
  
  // Inject CSS first
  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['grid.css']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error injecting CSS:', chrome.runtime.lastError);
      showStatus('Error loading grid styles', 'error');
      return;
    }
    
    // Then inject JavaScript
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error injecting script:', chrome.runtime.lastError);
        showStatus('Error loading grid system', 'error');
        return;
      }
      
      // Wait a moment for script to initialize, then proceed
      setTimeout(() => {
        showStatus(CONFIG.MESSAGES.READY);
        callback(tab);
      }, 100);
    });
  });
}

// Validation functions
function validateGridType(type) {
  const validTypes = ['columns', 'grid', 'spacing'];
  return validTypes.includes(type) ? type : CONFIG.DEFAULTS.type;
}

function validateNumber(value, limits) {
  const num = parseFloat(value);
  if (isNaN(num)) return limits.min;
  return Math.max(limits.min, Math.min(limits.max, num));
}

function validateColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : CONFIG.DEFAULTS.color;
}

function validateSettings(settings) {
  return settings && 
         typeof settings.type === 'string' &&
         typeof settings.columns === 'number' &&
         typeof settings.rows === 'number' &&
         typeof settings.spacing === 'number' &&
         typeof settings.color === 'string' &&
         typeof settings.opacity === 'number';
}

function validateInput(input, limits) {
  const value = parseFloat(input.value);
  if (isNaN(value) || value < limits.min || value > limits.max) {
    input.style.borderColor = 'var(--error-color)';
    return false;
  }
  input.style.borderColor = '';
  return true;
}
