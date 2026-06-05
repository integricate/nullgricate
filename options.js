const botTokenInput = document.getElementById('botToken');
const chatIdInput = document.getElementById('chatId');
const statusDiv = document.getElementById('status');

// Load current values
chrome.storage.local.get(['botToken', 'chatId'], (result) => {
  botTokenInput.value = result.botToken || '';
  chatIdInput.value = result.chatId || '';
});

document.getElementById('save').addEventListener('click', () => {
  const botToken = botTokenInput.value.trim();
  const chatId = chatIdInput.value.trim();
  chrome.storage.local.set({ botToken, chatId }, () => {
    statusDiv.textContent = 'Settings saved. Extension is running.';
    setTimeout(() => statusDiv.textContent = '', 2000);
  });
});