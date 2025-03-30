chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchOptions") {
    fetch(
      "https://sceniclive.synccare.io/scenicworld/public/get-options?clientCode=610433"
    )
      .then((response) => response.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});
