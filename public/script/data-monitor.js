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
      console.log("📢 Data has changed! Verifying save before refreshing...");
      const newHash = data.hash;
      // Wait briefly to allow save to complete on server, then confirm hash
      setTimeout(async () => {
        try {
          const r = await fetch("/data-hash");
          const d = await r.json();
          if (d.hash === newHash) {
            location.reload();
          } else {
            currentDataHash = d.hash;
          }
        } catch (e) {
          console.error("Error confirming data-hash after change:", e);
        }
      }, 500);
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

// Also listen for storage events triggered by saveToServer in other tabs
window.addEventListener("storage", (e) => {
  if (e.key === "employees_updated_at") {
    try {
      // small delay to ensure the server write is visible
      setTimeout(() => location.reload(), 200);
    } catch (err) {
      console.error("Error handling storage event:", err);
    }
  }
});
