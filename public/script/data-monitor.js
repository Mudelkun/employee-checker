// ===================================================
// DATA MONITOR - Auto-refresh when employees.json changes
// ===================================================

let currentDataHash = null;

// Initialize data monitor when page loads
async function initDataMonitor() {
  try {
    const response = await fetch("/data-hash");
    const data = await response.json();
    currentDataHash = data.hash;
  } catch (err) {
    console.error("Error initializing data monitor:", err);
  }

  // Check for changes every 5 seconds (optimized from 3s for better performance)
  setInterval(checkForDataChanges, 5000);
}

// Check if data has changed and reload page if it has
async function checkForDataChanges() {
  try {
    const response = await fetch("/data-hash");
    const data = await response.json();

    if (currentDataHash && data.hash !== currentDataHash) {
      console.log("📢 Data has changed! Refreshing page...");
      // Reload page to get latest data
      location.reload();
    }

    currentDataHash = data.hash;
  } catch (err) {
    console.error("Error checking for data changes:", err);
  }
}

// Start monitoring when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDataMonitor);
} else {
  initDataMonitor();
}
