let iframe: HTMLIFrameElement | null = null;
let previousOverflow = '';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'TOGGLE_COMMAND_PALETTE') {
    if (iframe) {
      removeIframe();
    } else {
      createIframe('action=command-palette-overlay');
    }
    sendResponse({ success: true });
  } else if (request.type === 'OPEN_ADD_BOOKMARK') {
    if (iframe) removeIframe();
    createIframe(`action=add-overlay&url=${encodeURIComponent(request.url || '')}&title=${encodeURIComponent(request.title || '')}`);
    sendResponse({ success: true });
  }
});

window.addEventListener('message', (event) => {
  if (iframe && event.source === iframe.contentWindow && event.data?.type === 'CLOSE_COMMAND_PALETTE') {
    removeIframe();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && iframe) {
    removeIframe();
  }
});

function createIframe(queryString: string) {
  if (iframe) return;
  iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL(`index.html?${queryString}`);
  
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483647',
    border: 'none',
    background: 'transparent',
    colorScheme: 'normal',
  });
  
  document.body.appendChild(iframe);
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  
  setTimeout(() => {
    if (iframe) iframe.focus();
  }, 50);
}

function removeIframe() {
  if (iframe) {
    iframe.remove();
    iframe = null;
    document.body.style.overflow = previousOverflow;
  }
}
