// Authentication check - Run on page load
function checkAuthentication() {
  const isAuthenticated = sessionStorage.getItem("authenticated") === "true";
  const authTime = sessionStorage.getItem("authTime");
  const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  // Check if authenticated
  if (!isAuthenticated) {
    // Redirect to password page with the current page as redirect parameter
    const currentPage = window.location.pathname;
    window.location.href =
      "/pasword-require.html?redirect=" + encodeURIComponent(currentPage);
    return;
  }

  // Check if session has expired
  if (authTime) {
    const currentTime = new Date().getTime();
    const sessionAge = currentTime - parseInt(authTime);

    if (sessionAge > TWO_HOURS) {
      // Session expired - clear authentication and redirect to login
      sessionStorage.removeItem("authenticated");
      sessionStorage.removeItem("authTime");
      const currentPage = window.location.pathname;
      window.location.href =
        "/pasword-require.html?redirect=" + encodeURIComponent(currentPage);
    }
  }
}

// Check authentication when page loads
document.addEventListener("DOMContentLoaded", checkAuthentication);
