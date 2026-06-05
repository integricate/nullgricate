let timeoutId = null;

function scheduleCapture() {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    chrome.runtime.sendMessage({ action: 'capture' });
  }, 1000); // 1 second after last interaction
}

// Listen to all meaningful interactions
const events = ['mousedown', 'keydown', 'wheel', 'touchstart'];
events.forEach(event => {
  document.addEventListener(event, scheduleCapture, { passive: true });
});

// Also capture on scroll (wheel already covers, but just in case)
window.addEventListener('scroll', scheduleCapture, { passive: true });