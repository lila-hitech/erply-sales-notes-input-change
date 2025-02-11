# Scenic World Sales Notes

## Description

POS Sales Note modal by default contains text input fields.
For all the input fields, this project converts them into select fields.
For all the select input fields, options are also added.
Since some select fields may contain thousands of options, added functionality to search and select option
using Choices.js JavaScript select library.
We don't need to manually enable the DONE button.
Once all the text input fields have value, DONE button will be automatically enabled.
To do this, the logic is:

Before modifying input to select, all the fields were text input. Here is the markup before modifying. I have included only two for now.

```
<div id="modals" class="modal-open" style="overflow: hidden">
  <div class="fade modal-backdrop show"></div>
  <div
    role="dialog"
    aria-modal="true"
    class="fade modal show"
    tabindex="-1"
    style="display: block"
  >
    <div role="document" class="modal-dialog saleNotes">
      <div class="modal-content">
        <div class="modal-header">
          <h3 style="font-weight: bold">Sale notes</h3>
          <span style="flex-grow: 1"></span
          ><button
            shortcut="Enter"
            type="button"
            class="btn btn-POS"
            disabled=""
          >
            DONE
          </button>
        </div>
        <div class="modal-body">
          <label>country*</label>
          <div class="">
            <div class="input-group input-group-lg">
              <input
                type="text"
                class="form-control"
                value=""
                style="height: auto"
              />
            </div>
            <div
              class="invalid-feedback"
              style="min-height: 1em; display: block; margin-bottom: -1em"
            ></div>
          </div>
          <br /><label>postcode*</label>
          <div class="">
            <div class="input-group input-group-lg">
              <input
                type="text"
                class="form-control"
                value=""
                style="height: auto"
              />
            </div>
            <div
              class="invalid-feedback"
              style="min-height: 1em; display: block; margin-bottom: -1em"
            ></div>
          </div>
          <br />
        </div>
      </div>
    </div>
  </div>
</div>
```

1. If there were value in all the fields, DONE button with class .btn btn-POS would be enabled automatically.
2. Now, we have modified those text input to select, for each select input that we converted from the text input, we need to store the selected option from the select as value of the corresponding text input.
3. For example, if we select 'Nepal' as selected option for Country select, we need to store Nepal as value for the corresponding text input type that we are not showing.
4. In this way, all the text input fields will not be visible in DOM but will have value from the respective select input.
5. Once all the select have selected options, its seems as if all the text input have value which automatically will enable the DONE button.

## Tech stack

- Choices.js for searchable select

## Installation

Follow these steps to set up the project on your local machine:

1. **Clone the repository**

   ```
   git clone https://github.com/lila-hitech/erply-sales-notes-input-change
   cd erply-sales-notes-input-change
   ```

2. **How to run**

   - Go to chrome://extensions
   - Enable `Developer mode`
   - Choose `Load unpacked`
   - Select the project
   - Enable the extension
   - Go to `https://epos.erply.com/`
