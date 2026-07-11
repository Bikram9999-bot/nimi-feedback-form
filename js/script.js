document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('nimi-feedback-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnText = document.getElementById('btn-text');
  const successModal = document.getElementById('success-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');

  // Helper function to setup conditional text inputs for "Other" options
  function setupConditionalOther(triggerElement, wrapperElement, textElement) {
    function toggleState(show) {
      if (show) {
        wrapperElement.classList.add('show');
        textElement.setAttribute('required', 'true');
      } else {
        wrapperElement.classList.remove('show');
        textElement.removeAttribute('required');
        textElement.value = ''; // Reset value
      }
    }

    if (triggerElement.type === 'checkbox') {
      // For checkboxes, we listen to change on the checkbox itself
      triggerElement.addEventListener('change', () => {
        toggleState(triggerElement.checked);
      });
    }
  }

  // Setup conditional groups

  // Q8 Offerings "Other"
  setupConditionalOther(
    document.getElementById('q8-checkbox-other'),
    document.getElementById('q8-other-wrapper'),
    document.getElementById('q8-other-text')
  );

  // Input styling feedback on focus out/typing
  const inputs = form.querySelectorAll('.form-control, input[type="radio"], input[type="checkbox"]');
  inputs.forEach(input => {
    const group = input.closest('.form-group');
    if (!group) return;

    // Remove error class when user starts typing or selecting
    input.addEventListener('input', () => {
      group.classList.remove('has-error');
    });
    input.addEventListener('change', () => {
      group.classList.remove('has-error');
    });
  });

  // Client-side Validation Logic
  function validateForm() {
    let isValid = true;
    let firstErrorField = null;

    // Reset all previous error states
    form.querySelectorAll('.form-group').forEach(group => {
      group.classList.remove('has-error');
    });

    // 1. Validate All Required Standard Inputs (text, select, email, date, etc.)
    const requiredInputs = form.querySelectorAll('input[required]:not([type="radio"]):not([type="checkbox"]), textarea[required], select[required]');
    requiredInputs.forEach(input => {
      const group = input.closest('.form-group');
      if (input.value.trim() === '') {
        isValid = false;
        group.classList.add('has-error');
        if (!firstErrorField) firstErrorField = input;
      } else if (input.type === 'email') {
        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value.trim())) {
          isValid = false;
          group.classList.add('has-error');
          // Update message for invalid email
          const errorMsg = group.querySelector('.error-msg');
          if (errorMsg) errorMsg.textContent = 'Please enter a valid Email ID.';
          if (!firstErrorField) firstErrorField = input;
        }
      }
    });

    // 2. Validate Mobile Number format specifically (10 digits)
    const mobileInput = document.getElementById('q2-mobile');
    if (mobileInput) {
      const mobileGroup = mobileInput.closest('.form-group');
      const mobileRegex = /^[0-9]{10}$/;
      if (mobileInput.value.trim() !== '' && !mobileRegex.test(mobileInput.value.trim())) {
        isValid = false;
        mobileGroup.classList.add('has-error');
        if (!firstErrorField) firstErrorField = mobileInput;
      }
    }

    // 3. Validate Required Radio Groups (if any)
    const requiredRadios = form.querySelectorAll('input[type="radio"][required]');
    const radioNames = new Set(Array.from(requiredRadios).map(r => r.name));
    radioNames.forEach(name => {
      const checkedRadio = form.querySelector(`input[name="${name}"]:checked`);
      const group = form.querySelector(`input[name="${name}"]`).closest('.form-group');
      
      if (!checkedRadio) {
        isValid = false;
        group.classList.add('has-error');
        if (!firstErrorField) firstErrorField = group;
      }
    });

    // 4. Validate Conditional Checkbox "Other" text
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    const checkboxNames = new Set(Array.from(checkboxes).map(c => c.name));
    checkboxNames.forEach(name => {
      const otherCheckbox = form.querySelector(`input[name="${name}"][value="__other_option__"]:checked`);
      if (otherCheckbox) {
        const otherText = form.querySelector(`input[name="${name}.other_option_response"]`);
        const group = otherCheckbox.closest('.form-group');
        if (otherText && otherText.value.trim() === '') {
          isValid = false;
          group.classList.add('has-error');
          if (!firstErrorField) firstErrorField = otherText;
        }
      }
    });

    // Scroll to the first invalid field
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof firstErrorField.focus === 'function') {
        firstErrorField.focus();
      }
    }

    return isValid;
  }

  // Handle Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Run validation
    if (!validateForm()) {
      return;
    }

    // Disable submission button & show spinner
    submitBtn.disabled = true;
    btnSpinner.style.display = 'inline-block';
    btnText.textContent = 'Submitting...';

    // Construct form URLSearchParams payload matching Google Form inputs
    const formData = new URLSearchParams();

    // 1. Add standard Google Entry Text/Tel fields (names starting with entry.)
    const textInputs = form.querySelectorAll('input[name^="entry."][type="text"], input[name^="entry."][type="tel"]');
    textInputs.forEach(input => {
      formData.append(input.name, input.value.trim());
    });

    // 2. Add Radio fields (only standard Google entry names)
    const radioNames = new Set(Array.from(form.querySelectorAll('input[name^="entry."][type="radio"]')).map(r => r.name));
    radioNames.forEach(name => {
      const checkedRadio = form.querySelector(`input[name="${name}"]:checked`);
      if (checkedRadio) {
        formData.append(name, checkedRadio.value);
      }
    });

    // 3. Add Checkbox fields (only standard Google entry names)
    const checkboxNames = new Set(Array.from(form.querySelectorAll('input[name^="entry."][type="checkbox"]')).map(c => c.name));
    checkboxNames.forEach(name => {
      const checkedCheckboxes = form.querySelectorAll(`input[name="${name}"]:checked`);
      checkedCheckboxes.forEach(cb => {
        formData.append(name, cb.value);
        if (cb.value === '__other_option__') {
          const otherText = form.querySelector(`input[name="${name}.other_option_response"]`);
          if (otherText) {
            formData.append(`${name}.other_option_response`, otherText.value.trim());
          }
        }
      });
    });

    // 4. Add Comments field (Q13 - entry.1849007445)
    const rawComments = document.getElementById('q13-comments').value.trim();
    // Note: textarea name is already entry.1849007445, but we append explicitly to ensure
    formData.append('entry.1849007445', rawComments);

    const googleFormActionUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSckgVvy9ErYvfrNQN62pxxO0r8fETysIanhpY5Mi7dyciV2bw/formResponse';

    // Send payload to Google Forms using fetch with mode 'no-cors'
    fetch(googleFormActionUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })
    .then(() => {
      // Request sent successfully (opaque response)
      submitBtn.disabled = false;
      btnSpinner.style.display = 'none';
      btnText.textContent = 'Submit Feedback';
      
      // Save submission locally
      try {
        const name = document.getElementById('q1-name').value.trim();
        const mobile = document.getElementById('q2-mobile').value.trim();
        const stateDistrict = document.getElementById('q3-state-district').value.trim();
        const institute = document.getElementById('q4-institute').value.trim();
        const designation = document.getElementById('q5-designation').value.trim();
        const trade = document.getElementById('q6-trade').value.trim();

        const checkedFamiliarity = form.querySelector('input[name="entry.1434337983"]:checked');
        const familiarity = checkedFamiliarity ? checkedFamiliarity.value : '';
        
        const checkedOfferings = [];
        form.querySelectorAll('input[name="entry.582717725"]:checked').forEach(cb => {
          if (cb.value === '__other_option__') {
            const otherVal = document.getElementById('q8-other-text').value.trim();
            if (otherVal) checkedOfferings.push(`Other: ${otherVal}`);
          } else {
            checkedOfferings.push(cb.value);
          }
        });
        
        const checkedValue = form.querySelector('input[name="entry.1185486809"]:checked');
        const valueAddition = checkedValue ? checkedValue.value : '';
        
        const checkedBookQuality = form.querySelector('input[name="entry.366311424"]:checked');
        const bookQuality = checkedBookQuality ? checkedBookQuality.value : '';

        const checkedLikelihood = form.querySelector('input[name="entry.619211593"]:checked');
        const likelihood = checkedLikelihood ? checkedLikelihood.value : '';

        const checkedSatisfaction = form.querySelector('input[name="entry.484827684"]:checked');
        const satisfaction = checkedSatisfaction ? checkedSatisfaction.value : '';
        
        const submission = {
          name,
          mobile,
          stateDistrict,
          institute,
          designation,
          trade,
          familiarity,
          offerings: checkedOfferings,
          valueAddition,
          bookQuality,
          likelihood,
          satisfaction,
          comments: rawComments,
          timestamp: new Date().toISOString()
        };
        
        const submissions = JSON.parse(localStorage.getItem('nimi_submissions') || '[]');
        submissions.push(submission);
        localStorage.setItem('nimi_submissions', JSON.stringify(submissions));
      } catch (err) {
        console.error('Error saving submission locally:', err);
      }

      // Reset form fields
      form.reset();
      
      // Hide all 'other' input wrappers
      form.querySelectorAll('.other-input-wrapper').forEach(wrapper => {
        wrapper.classList.remove('show');
        const textInput = wrapper.querySelector('input');
        if (textInput) textInput.removeAttribute('required');
      });

      // Display the success Modal
      successModal.classList.add('show');
    })
    .catch((error) => {
      console.error('Error submitting form:', error);
      alert('An error occurred during submission. Please try again.');
      submitBtn.disabled = false;
      btnSpinner.style.display = 'none';
      btnText.textContent = 'Submit Feedback';
    });
  });

  // Modal Close Action
  closeModalBtn.addEventListener('click', () => {
    successModal.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
