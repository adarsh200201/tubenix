// Utility functions for managing ads with cookies

export const setCookie = (name, value, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

export const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export const shouldShowAds = (pageName) => {
  const visitedKey = `visited_${pageName}`;
  const hasVisited = getCookie(visitedKey);
  
  if (!hasVisited) {
    // First time visiting this page, mark as visited and don't show ads
    setCookie(visitedKey, 'true', 30); // Remember for 30 days
    return false;
  }
  
  // Not first time, show ads
  return true;
};

export const openAdsAndNavigate = (url, navigate, path) => {
  // Open ads in new tab
  window.open(url, '_blank');
  // Navigate to the actual page
  navigate(path);
};
