(function() {
    const authenticated = localStorage.getItem('gate_authenticated');
    const token = localStorage.getItem('gate_token');
    
    // Check if the current page is not login-gate.html
    const isLoginPage = window.location.pathname.endsWith('login-gate.html');
    
    if (!isLoginPage) {
        if (authenticated !== 'true' || !token) {
            // Get current path including query parameters for redirecting back
            const currentPath = window.location.pathname + window.location.search;
            window.location.href = 'login-gate.html?redirect=' + encodeURIComponent(currentPath);
        }
    }
})();
