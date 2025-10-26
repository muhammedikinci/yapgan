// Popup script - handles UI and API interactions

const API_CONFIG_KEY = "yapgan_api_url";
const AUTH_TOKEN_KEY = "yapgan_access_token";
const USER_EMAIL_KEY = "yapgan_user_email";
const DRAFT_NOTE_KEY = "yapgan_draft_note";

// DOM Elements
let loginScreen, registerScreen, saveScreen, loginForm, registerForm, saveForm;
let emailInput, passwordInput, apiUrlInput;
let registerEmailInput,
  registerPasswordInput,
  registerPasswordConfirmInput,
  registerApiUrlInput;
let titleInput, contentInput, tagsInput, sourceUrlInput;
let loginBtn, registerBtn, saveBtn, logoutBtn, clearDraftBtn, togglePreviewBtn;
let loginError, registerError, saveError, saveSuccess, contentHint;
let showRegisterLink, showLoginLink;
let contentPreview, dropIndicator;

// Draft auto-save timer
let draftSaveTimer = null;
let isPreviewMode = false;

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Get DOM elements
  loginScreen = document.getElementById("login-screen");
  registerScreen = document.getElementById("register-screen");
  saveScreen = document.getElementById("save-screen");
  loginForm = document.getElementById("login-form");
  registerForm = document.getElementById("register-form");
  saveForm = document.getElementById("save-form");

  emailInput = document.getElementById("email");
  passwordInput = document.getElementById("password");
  apiUrlInput = document.getElementById("api-url");

  registerEmailInput = document.getElementById("register-email");
  registerPasswordInput = document.getElementById("register-password");
  registerPasswordConfirmInput = document.getElementById(
    "register-password-confirm",
  );
  registerApiUrlInput = document.getElementById("register-api-url");

  titleInput = document.getElementById("title");
  contentInput = document.getElementById("content");
  tagsInput = document.getElementById("tags");
  sourceUrlInput = document.getElementById("source-url");

  loginBtn = document.getElementById("login-btn");
  registerBtn = document.getElementById("register-btn");
  saveBtn = document.getElementById("save-btn");
  logoutBtn = document.getElementById("logout-btn");
  clearDraftBtn = document.getElementById("clear-draft-btn");
  togglePreviewBtn = document.getElementById("toggle-preview-btn");

  loginError = document.getElementById("login-error");
  registerError = document.getElementById("register-error");
  saveError = document.getElementById("save-error");
  saveSuccess = document.getElementById("save-success");
  contentHint = document.getElementById("content-hint");
  contentPreview = document.getElementById("content-preview");
  dropIndicator = document.getElementById("drop-indicator");

  showRegisterLink = document.getElementById("show-register");
  showLoginLink = document.getElementById("show-login");

  // Event listeners
  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  saveForm.addEventListener("submit", handleSaveNote);
  logoutBtn.addEventListener("click", handleLogout);
  clearDraftBtn.addEventListener("click", handleClearDraft);
  togglePreviewBtn.addEventListener("click", togglePreview);

  showRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    showRegisterScreen();
  });
  showLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showLoginScreen();
  });

  // Auto-save draft on input changes
  titleInput.addEventListener("input", saveDraftDebounced);
  contentInput.addEventListener("input", () => {
    saveDraftDebounced();
    if (isPreviewMode) {
      updatePreview();
    }
  });
  tagsInput.addEventListener("input", saveDraftDebounced);

  // Drag and drop for images
  setupDragAndDrop();

  // Check auth state
  await initializeApp();
});

async function initializeApp() {
  const token = await getStorageItem(AUTH_TOKEN_KEY);
  const apiUrl =
    (await getStorageItem(API_CONFIG_KEY)) || "http://localhost:8080";

  if (token) {
    // Validate token
    const isValid = await validateToken(apiUrl, token);

    if (isValid) {
      // User is logged in and token is valid
      showSaveScreen();
      await loadCurrentPageData();
    } else {
      // Token expired, show login
      await handleLogout();
      apiUrlInput.value = apiUrl;
      showLoginScreen();
      showError(loginError, "Session expired. Please login again.");
    }
  } else {
    // Show login
    apiUrlInput.value = apiUrl;
    showLoginScreen();
  }
}

// Validate token by making a test API call
async function validateToken(apiUrl, token) {
  try {
    const response = await fetch(`${apiUrl}/api/notes?limit=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Token validation failed:", error);
    return false;
  }
}

async function loadCurrentPageData() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) return;

    // Set source URL
    sourceUrlInput.value = tab.url;

    // Check if we have a draft for this URL
    const draft = await getStorageItem(DRAFT_NOTE_KEY);
    const hasDraft = draft && draft.sourceUrl === tab.url;

    if (hasDraft) {
      // Restore draft
      titleInput.value = draft.title || "";
      contentInput.value = draft.content || "";
      tagsInput.value = draft.tags || "";

      if (draft.content || draft.title) {
        contentHint.style.display = "block";
        contentHint.textContent = "💾 Draft restored";
        contentHint.style.color = "#0891b2";
        contentHint.classList.add("draft");

        // Show clear draft button
        clearDraftBtn.style.display = "block";
      }

      // Focus title if empty, otherwise focus content
      if (!draft.title) {
        titleInput.focus();
      } else {
        contentInput.focus();
        // Move cursor to end
        contentInput.setSelectionRange(
          contentInput.value.length,
          contentInput.value.length,
        );
      }

      return; // Don't try to get selected text if we have a draft
    }

    // Get selected text from content script
    // Since content script is registered in manifest, it should be injected automatically
    // We just need to wait a bit if the page just loaded
    const getSelectedText = async (retryCount = 0) => {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "getSelectedText",
        });

        if (response && response.selectedText) {
          contentInput.value = response.selectedText;
          contentHint.style.display = "block";
          contentHint.textContent = "✨ Selected text captured!";
          contentHint.style.color = "#059669";

          // Auto-focus title if content is filled
          titleInput.focus();

          // Save as draft immediately
          await saveDraft();
        }
      } catch (error) {
        // Content script might not be ready yet or page doesn't allow scripts
        console.log(
          "Could not get selected text (attempt " + (retryCount + 1) + "):",
          error.message,
        );

        // Retry up to 2 times with increasing delays
        if (retryCount < 2) {
          setTimeout(
            () => {
              getSelectedText(retryCount + 1);
            },
            (retryCount + 1) * 100,
          ); // 100ms, 200ms
        } else {
          // After all retries, silently fail
          // This is normal for restricted pages (chrome://, extensions://, etc.)
          console.log(
            "Content script not available on this page (this is normal for some pages)",
          );
        }
      }
    };

    // Start the attempt
    await getSelectedText();
  } catch (error) {
    console.error("Failed to load page data:", error);
    // Non-critical error, just log it
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const apiUrl = apiUrlInput.value.trim();

  if (!email || !password) {
    showError(loginError, "Email and password are required");
    return;
  }

  setLoading(loginBtn, true);
  hideError(loginError);

  try {
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Save credentials
    await setStorageItem(AUTH_TOKEN_KEY, data.access_token);
    await setStorageItem(API_CONFIG_KEY, apiUrl);
    await setStorageItem(USER_EMAIL_KEY, email);

    // Show save screen
    showSaveScreen();
    await loadCurrentPageData();
  } catch (error) {
    showError(loginError, error.message);
  } finally {
    setLoading(loginBtn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const email = registerEmailInput.value.trim();
  const password = registerPasswordInput.value;
  const passwordConfirm = registerPasswordConfirmInput.value;
  const apiUrl = registerApiUrlInput.value.trim();

  if (!email || !password || !passwordConfirm) {
    showError(registerError, "All fields are required");
    return;
  }

  if (password.length < 6) {
    showError(registerError, "Password must be at least 6 characters");
    return;
  }

  if (password !== passwordConfirm) {
    showError(registerError, "Passwords do not match");
    return;
  }

  setLoading(registerBtn, true);
  hideError(registerError);

  try {
    const response = await fetch(`${apiUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    // Save credentials (registration returns tokens too)
    await setStorageItem(AUTH_TOKEN_KEY, data.access_token);
    await setStorageItem(API_CONFIG_KEY, apiUrl);
    await setStorageItem(USER_EMAIL_KEY, email);

    // Show save screen
    showSaveScreen();
    await loadCurrentPageData();
  } catch (error) {
    showError(registerError, error.message);
  } finally {
    setLoading(registerBtn, false);
  }
}

async function handleSaveNote(e) {
  e.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tagsRaw = tagsInput.value.trim();
  const sourceUrl = sourceUrlInput.value.trim();

  if (!title || !content) {
    showError(saveError, "Title and content are required");
    return;
  }

  // Parse tags
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t)
    : [];

  setLoading(saveBtn, true);
  hideError(saveError);
  hideSuccess(saveSuccess);

  try {
    const apiUrl = await getStorageItem(API_CONFIG_KEY);
    const token = await getStorageItem(AUTH_TOKEN_KEY);

    const response = await fetch(`${apiUrl}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        content_md: content,
        source_url: sourceUrl || null,
        tags: tags.length > 0 ? tags : null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Check for auth error
      if (response.status === 401) {
        await handleLogout();
        throw new Error("Session expired. Please login again.");
      }
      throw new Error(data.message || "Failed to save note");
    }

    // Success!
    showSuccess(saveSuccess, "Note saved successfully!");

    // Clear draft
    await clearDraft();

    // Clear form
    titleInput.value = "";
    contentInput.value = "";
    tagsInput.value = "";
    contentHint.style.display = "none";

    // Auto-close after 1.5 seconds
    setTimeout(() => {
      window.close();
    }, 1500);
  } catch (error) {
    showError(saveError, error.message);
  } finally {
    setLoading(saveBtn, false);
  }
}

async function handleLogout() {
  await chrome.storage.local.remove([AUTH_TOKEN_KEY, USER_EMAIL_KEY]);
  showLoginScreen();

  // Clear forms
  emailInput.value = "";
  passwordInput.value = "";
  registerEmailInput.value = "";
  registerPasswordInput.value = "";
  registerPasswordConfirmInput.value = "";
}

// UI Helpers
function showLoginScreen() {
  loginScreen.style.display = "block";
  registerScreen.style.display = "none";
  saveScreen.style.display = "none";
  hideError(loginError);
  hideError(registerError);
}

function showRegisterScreen() {
  loginScreen.style.display = "none";
  registerScreen.style.display = "block";
  saveScreen.style.display = "none";
  hideError(loginError);
  hideError(registerError);

  // Copy API URL from login screen
  const apiUrl = apiUrlInput.value.trim();
  if (apiUrl) {
    registerApiUrlInput.value = apiUrl;
  }
}

function showSaveScreen() {
  loginScreen.style.display = "none";
  registerScreen.style.display = "none";
  saveScreen.style.display = "block";
}

function setLoading(button, loading) {
  const text = button.querySelector(".btn-text");
  const loader = button.querySelector(".btn-loader");

  if (loading) {
    text.style.display = "none";
    loader.style.display = "inline";
    button.disabled = true;
  } else {
    text.style.display = "inline";
    loader.style.display = "none";
    button.disabled = false;
  }
}

function showError(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

function hideError(element) {
  element.style.display = "none";
}

function showSuccess(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

function hideSuccess(element) {
  element.style.display = "none";
}

// Storage Helpers
async function getStorageItem(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

async function setStorageItem(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// Draft Management
async function saveDraft() {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tags = tagsInput.value.trim();
  const sourceUrl = sourceUrlInput.value.trim();

  // Only save if there's any content
  if (title || content || tags) {
    await setStorageItem(DRAFT_NOTE_KEY, {
      title,
      content,
      tags,
      sourceUrl,
      timestamp: Date.now(),
    });
  }
}

function saveDraftDebounced() {
  // Clear existing timer
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
  }

  // Save after 500ms of no typing
  draftSaveTimer = setTimeout(async () => {
    await saveDraft();
  }, 500);
}

async function clearDraft() {
  await chrome.storage.local.remove(DRAFT_NOTE_KEY);
}

async function handleClearDraft() {
  if (confirm("Clear draft and start fresh?")) {
    await clearDraft();

    // Clear form
    titleInput.value = "";
    contentInput.value = "";
    tagsInput.value = "";
    contentHint.style.display = "none";
    contentHint.classList.remove("draft");
    clearDraftBtn.style.display = "none";

    // Clear preview if active
    if (isPreviewMode) {
      updatePreview();
    }

    // Focus title
    titleInput.focus();
  }
}

// Markdown Preview Functions
function togglePreview() {
  isPreviewMode = !isPreviewMode;

  if (isPreviewMode) {
    // Show preview
    contentInput.style.display = "none";
    contentPreview.style.display = "block";
    togglePreviewBtn.classList.add("active");
    togglePreviewBtn.textContent = "✏️ Edit";
    updatePreview();
  } else {
    // Show editor
    contentInput.style.display = "block";
    contentPreview.style.display = "none";
    togglePreviewBtn.classList.remove("active");
    togglePreviewBtn.textContent = "👁️ Preview";
  }
}

function updatePreview() {
  const markdown = contentInput.value || "*No content yet...*";
  contentPreview.innerHTML = marked.parse(markdown);
}

// Drag and Drop for Images
function setupDragAndDrop() {
  const textarea = contentInput;

  // Prevent default drag behaviors
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    textarea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  // Highlight drop area when item is dragged over it
  ["dragenter", "dragover"].forEach((eventName) => {
    textarea.addEventListener(
      eventName,
      () => {
        textarea.classList.add("drag-over");
        dropIndicator.style.display = "flex";
      },
      false,
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    textarea.addEventListener(
      eventName,
      () => {
        textarea.classList.remove("drag-over");
        dropIndicator.style.display = "none";
      },
      false,
    );
  });

  // Handle dropped files
  textarea.addEventListener("drop", handleDrop, false);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

async function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files.length === 0) return;

  // Process each file
  for (let file of files) {
    if (file.type.startsWith("image/")) {
      await handleImageFile(file);
    }
  }
}

async function handleImageFile(file) {
  try {
    // Convert image to base64
    const base64 = await fileToBase64(file);

    // Insert markdown image syntax at cursor position
    const textarea = contentInput;
    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursorPos);
    const textAfter = textarea.value.substring(cursorPos);

    const imageMarkdown = `![${file.name}](${base64})`;
    textarea.value = textBefore + imageMarkdown + textAfter;

    // Move cursor after inserted image
    textarea.selectionStart = textarea.selectionEnd =
      cursorPos + imageMarkdown.length;

    // Trigger input event to save draft
    textarea.dispatchEvent(new Event("input"));

    // Update preview if in preview mode
    if (isPreviewMode) {
      updatePreview();
    }

    // Show success hint
    contentHint.style.display = "block";
    contentHint.textContent = `📷 Image "${file.name}" added`;
    contentHint.style.color = "#059669";
    setTimeout(() => {
      contentHint.style.display = "none";
    }, 3000);
  } catch (error) {
    console.error("Error handling image:", error);
    showError(saveError, "Failed to process image");
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}
