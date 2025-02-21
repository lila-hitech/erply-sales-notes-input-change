// First, read the Choices.js content and inject it directly
async function injectChoicesLibrary() {
  try {
    const response = await fetch(
      chrome.runtime.getURL("assets/choices.min.js")
    );
    const choicesCode = await response.text();

    // Inject Choices.js code directly
    const script = document.createElement("script");
    script.textContent =
      choicesCode +
      `
          // Store Choices in a global variable
          window.ChoicesLibrary = Choices;
      `;
    (document.head || document.documentElement).appendChild(script);

    return true;
  } catch (error) {
    console.error("Failed to inject Choices library:", error);
    return false;
  }
}

// Function to inject CSS
function loadChoicesCSS() {
  if (!document.querySelector('link[href*="choices.min.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("assets/choices.min.css");
    document.head.appendChild(link);
  }
}

function injectCustomStyles() {
  const style = document.createElement("style");
  style.textContent = `
        /* Target the Choices container to ensure full width */
    .choices {
      width: 100%;
      color: black;
    }
      `;
  document.head.appendChild(style);
}

// Call this function when initializing or with your existing initialization logic
injectCustomStyles();

// Function to inject initialization code
function injectInitializationCode() {
  const initScript = document.createElement("script");
  initScript.textContent = `
      function initializeChoices() {
          if (!window.ChoicesLibrary) {
              console.error('Choices library not available');
              return;
          }
  
          const selects = document.querySelectorAll("#modals select.form-control");
          
          selects.forEach((select, index) => {
              try {
                  if (select.choicesInstance) {
                      select.choicesInstance.destroy();
                  }
                  
                  const instance = new window.ChoicesLibrary(select, {
                      searchEnabled: true,
                      searchPlaceholderValue: 'Type to search...',
                      removeItemButton: true,
                      searchFields: ['label'],
                      searchResultLimit: 10,
                      position: 'bottom',
                      shouldSort: false,
                      searchChoices: true,
                      itemSelectText: '',
                      noChoicesText: 'No options available',
                      noResultsText: 'No results found',
                      callbackOnInit: function() {
                          console.log('Choices initialized for:', select.id);
                      },
                      fuseOptions: {
                          threshold: 0.0,  // Exact matching
                          findAllMatches: true,
                          includeMatches: true,
                          ignoreLocation: true,  // Search anywhere in the string
                          useExtendedSearch: true,
                          tokenize: true,  // Split the text into words
                          matchAllTokens: true  // All words in the search must match
                      }
                  });
                  
                  // Override the search function
                  instance.config.choices.forEach(choice => {
                      const originalSearch = choice.customProperties?.search || '';
                      choice.customProperties = {
                          ...choice.customProperties,
                          search: choice.label.toLowerCase()
                      };
                  });
                  
                  select.choicesInstance = instance;
                  
                  // Force a refresh of the dropdown
                  setTimeout(() => {
                      instance.refresh();
                  }, 100);
                  
              } catch (error) {
                  console.error('Error initializing Choices for ' + select.id + ':', error);
              }
          });
      }
  `;
  (document.head || document.documentElement).appendChild(initScript);
}

// Function to fetch data from the API
async function fetchOptions() {
  try {
    // Replace with your actual API endpoint
    const response = await fetch(
      "https://scenicworld.synccare.io/scenicworld/public/get-options?clientCode=610433"
    );
    const data = await response.json();

    // let's name this distinctive. Another extension may have similar functionality.
    // SW - Scenic World
    const salesNotesOptionsSW = data.optionsData;

    sessionStorage.setItem(
      "salesNotesOptionsSW",
      JSON.stringify(salesNotesOptionsSW)
    );

    return salesNotesOptionsSW; // Extract the salesNotesOptionsSW from the response
  } catch (error) {
    console.error("Failed to fetch options:", error);
    return null;
  }
}

function getOptionsFromSessionStorage() {
  const salesNotesOptionsSW = sessionStorage.getItem("salesNotesOptionsSW");

  return salesNotesOptionsSW ? JSON.parse(salesNotesOptionsSW) : null;
}

let salesNotesOptionsSW = null;

// Fetch options when the content script is injected
(async () => {
  // first check for options in session storage
  salesNotesOptionsSW = getOptionsFromSessionStorage();

  if (!salesNotesOptionsSW) {
    // fetch from api if not available in session storage
    salesNotesOptionsSW = await fetchOptions();
  }
})();

// Function to transform API response into the format needed for dropdowns
function transformApiResponse(apiData) {
  if (!apiData) return null;

  return {
    country: apiData.country.map((item, index) => ({
      value: item.name, // Use code as value
      label: item.name, // Use name as label
      id: index + 1, // Use code as id
    })),
    postcode: apiData.postcode.map((item, index) => ({
      value: item.name.toLowerCase(),
      label: item.name,
      id: index + 1,
    })),
    fog: apiData.ribbon.map((item, index) => ({
      value: item.name.toLowerCase(),
      label: item.name,
      id: index + 1,
    })),
  };
}

// Function to modify inputs to selects
async function modifyInputToSelect() {
  const transformedOptions = transformApiResponse(salesNotesOptionsSW);

  const selectOptions = {
    country: transformedOptions ? transformedOptions.country : [],
    postcode: transformedOptions ? transformedOptions.postcode : [],
    fog: transformedOptions ? transformedOptions.fog : [],
  };

  // Helper function to toggle postcode section visibility
  function togglePostcodeVisibility(show) {
    const postcodeSelect = document.querySelector(
      "#modals select[id^='choice-select-'][id$='1']"
    );
    const postcodeLabel = document.querySelector(
      "#modals label:nth-of-type(2)"
    );

    if (postcodeSelect && postcodeLabel) {
      // Get the container div and surrounding br tags
      const containerDiv = postcodeLabel.nextElementSibling;
      const precedingBr = postcodeLabel.previousElementSibling;
      const followingBr = containerDiv.nextElementSibling;

      const elements = [
        postcodeSelect.closest(".input-group"),
        postcodeLabel,
        containerDiv,
        precedingBr,
        followingBr,
      ];

      elements.forEach((element) => {
        if (element) {
          element.style.display = show ? "block" : "none";
        }
      });

      // Special handling for br tags
      precedingBr.style.display = "none";
      followingBr.style.display = "none";
    }
  }

  document
    .querySelectorAll("#modals .input-group input")
    .forEach((input, index) => {
      if (input.dataset.processed) return;

      const select = document.createElement("select");
      select.className = "form-control";
      select.id = `choice-select-${index}`;

      // Hide the input field
      input.style.display = "none";

      // Get labels and find matching label
      const labels = input.closest(".modal-body").querySelectorAll("label");
      const matchingLabel = Array.from(labels).find(
        (label) =>
          label.nextElementSibling && label.nextElementSibling.contains(input)
      );

      const label = matchingLabel
        ? matchingLabel.textContent.toLowerCase().replace("*", "").trim()
        : "country";

      const options = selectOptions[label] || selectOptions["country"];

      // Add a default "Select an option" as the first option
      if (options.length > 0 && options[0].value !== "") {
        options.unshift({ value: "", label: `Select a ${label}`, id: 0 });
      }

      options.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        optionElement.dataset.id = option.id;
        select.appendChild(optionElement);
      });

      // Set the initial value of the select field to match the input field's value
      select.value = input.value;

      // Add event listener to sync select value with hidden input
      select.addEventListener("change", (event) => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        ).set.call(input, select.value);

        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        // Show/hide postcode select and label based on country selection
        if (label === "country") {
          togglePostcodeVisibility(select.value === "Australia");
        }
      });

      input.parentNode.insertBefore(select, input);

      // Hide the postcode section initially if it's the postcode field
      if (label === "postcode") {
        togglePostcodeVisibility(false);
      }
    });

  // Ensure Choices.js is reinitialized
  const initScript = document.createElement("script");
  initScript.textContent = `
    if (typeof initializeChoices === 'function') {
      console.log('Reinitializing Choices...');
      initializeChoices();
    }
  `;
  (document.head || document.documentElement).appendChild(initScript);
}

// Modal handling
let isModalModified = false;
const modalId = "#modals";
const openClass = "modal-open";

async function checkIfModalIsOpen() {
  const modalElement = document.querySelector(modalId);
  if (
    modalElement &&
    modalElement.classList.contains(openClass) &&
    !isModalModified
  ) {
    // Load CSS
    loadChoicesCSS();

    // Inject Choices library
    const libraryInjected = await injectChoicesLibrary();
    if (libraryInjected) {
      // Inject initialization code
      injectInitializationCode();

      // Small delay to ensure everything is loaded
      setTimeout(() => {
        modifyInputToSelect();
      }, 100);

      isModalModified = true;
    }
  } else if (modalElement && !modalElement.classList.contains(openClass)) {
    isModalModified = false;
  }
}

// Enhanced observer setup
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (
      mutation.target.id === "modals" ||
      mutation.target.classList.contains("modal-open")
    ) {
      checkIfModalIsOpen();
      break;
    }
  }
});

observer.observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
  childList: true,
  subtree: true,
});

// Initial check
checkIfModalIsOpen();
