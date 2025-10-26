// Background service worker - handles extension lifecycle events

chrome.runtime.onInstalled.addListener(() => {
  console.log("Yapgan extension installed");

  // Set default API URL if not already set
  chrome.storage.local.get(["yapgan_api_url"], (result) => {
    if (!result.yapgan_api_url) {
      chrome.storage.local.set({
        yapgan_api_url: "http://localhost:8080",
      });
    }
  });

  // Create context menu for "Save to Yapgan"
  chrome.contextMenus.create({
    id: "save-to-yapgan",
    title: "Save to Yapgan",
    contexts: ["selection"],
  });
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-to-yapgan") {
    // Get the actual selected text from content script to preserve formatting
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getSelectedText",
      });
      const selectedText = response?.selectedText || info.selectionText;

      if (selectedText) {
        saveToYapgan(selectedText, tab);
      }
    } catch (error) {
      // Fallback to context menu selection if content script fails
      if (info.selectionText) {
        saveToYapgan(info.selectionText, tab);
      }
    }
  }
});

// Function to save selected text to Yapgan
async function saveToYapgan(selectedText, tab) {
  try {
    // Get API URL and token from storage
    const storage = await chrome.storage.local.get([
      "yapgan_api_url",
      "yapgan_access_token",
    ]);
    const apiUrl = storage.yapgan_api_url || "http://localhost:8080";
    const token = storage.yapgan_access_token;

    if (!token) {
      // Show notification if token is not set
      showNotification(
        "Yapgan",
        "Please configure your API token in the extension settings",
      );
      return;
    }

    // Prepare note data (matching popup.js format)
    const noteData = {
      title: `Note from ${tab.title || "webpage"}`,
      content_md: selectedText,
      source_url: tab.url,
      tags: null,
    };

    // Send to API
    const response = await fetch(`${apiUrl}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(noteData),
    });

    if (response.ok) {
      // Show success notification
      showNotification("Yapgan", "Note saved successfully!");
    } else {
      const data = await response.json();
      throw new Error(data.message || `API returned ${response.status}`);
    }
  } catch (error) {
    console.error("Error saving to Yapgan:", error);
    showNotification("Yapgan Error", `Failed to save note: ${error.message}`);
  }
}

// Helper function to show notifications without icon
function showNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    title: title,
    message: message,
    iconUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  });
}
