// Content script - runs on all web pages to capture selected text

// Store the last selected text with proper formatting
let lastSelectedText = '';

// Function to convert HTML to text preserving line breaks
function htmlToText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Replace <br> and </br> with newlines
  div.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });
  
  // Replace block elements with newlines
  const blockElements = div.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, tr');
  blockElements.forEach(el => {
    el.insertAdjacentText('afterend', '\n');
  });
  
  // Get the text content
  let text = div.textContent || div.innerText || '';
  
  // Clean up excessive newlines (more than 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

// Function to get selected text with preserved formatting
function getFormattedSelection() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return '';
  
  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  
  // Create a temporary div to get the HTML
  const div = document.createElement('div');
  div.appendChild(fragment);
  
  // Convert HTML to text preserving line breaks
  return htmlToText(div.innerHTML);
}

// Listen for text selection changes
document.addEventListener('selectionchange', () => {
  const selectedText = getFormattedSelection();
  
  if (selectedText) {
    lastSelectedText = selectedText;
  }
});

// Also capture selection on mouseup (more reliable for some cases)
document.addEventListener('mouseup', () => {
  const selectedText = getFormattedSelection();
  
  if (selectedText) {
    lastSelectedText = selectedText;
  }
});

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    // Return the last selected text (even if selection is cleared)
    sendResponse({ selectedText: lastSelectedText });
  }
  return true; // Keep the message channel open for async response
});

// Optional: Add visual feedback when text is selected (future enhancement)
// You can add a small icon next to selected text to indicate capture is available
