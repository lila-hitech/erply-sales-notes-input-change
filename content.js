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
    country: apiData.country.map((item) => ({
      value: item.name, // Use code as value
      label: item.name, // Use name as label
      id: parseInt(item.code), // Use code as id
    })),
    ribbon: apiData.ribbon.map((item) => ({
      value: item.name.toLowerCase(),
      label: item.name,
      id: item.id || item.name.toLowerCase(), // Fallback to lowercase name if no id
    })),
  };
}

// Function to modify inputs to selects
async function modifyInputToSelect() {
  const transformedOptions = transformApiResponse(salesNotesOptionsSW);

  const selectOptions = {
    country: transformedOptions
      ? transformedOptions.country
      : [
          { value: "", label: "Select a Country/Postcode", id: 0 },
          { value: "1", label: "United States 1", id: 1 },
          { value: "2", label: "Canada 2", id: 2 },
        ],
    ribbon: transformedOptions
      ? transformedOptions.ribbon
      : [
          { value: "", label: "Select a Ribbon Color", id: 0 },
          { value: "red", label: "Red", id: 1 },
          { value: "black", label: "Black", id: 2 },
        ],
  };

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
      });

      input.parentNode.insertBefore(select, input);
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
