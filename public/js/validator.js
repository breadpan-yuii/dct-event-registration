/**
 * public/js/validator.js — client-side form validation (UX layer).
 * The server (models/) remains the single source of truth; these rules
 * simply mirror it so users get instant feedback.
 */
(function () {
  'use strict';

  var RULES = {
    required: function (value) {
      return value && String(value).trim() ? '' : 'This field is required.';
    },
    name: function (value) {
      var t = String(value).trim();
      if (!t) return 'Full name is required.';
      if (t.split(/\s+/).length < 2) return 'Please provide first and last name.';
      if (!/^[A-Za-z\u00D1\u00F1'.\- ]+$/.test(t)) return 'Name contains invalid characters.';
      return '';
    },
    email: function (value) {
      var t = String(value).trim();
      if (!t) return 'Email address is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return 'Enter a valid email address.';
      return '';
    },
    phone: function (value) {
      var t = String(value).replace(/[\s-]/g, '');
      if (!t) return 'Mobile number is required.';
      if (!/^(\+?63|0)\d{9,10}$/.test(t)) return 'Enter a valid PH mobile number (e.g. 09171234567).';
      return '';
    },
    date: function (value) {
      return value ? '' : 'Date is required.';
    },
    time: function (value) {
      return /^\d{2}:\d{2}$/.test(value || '') ? '' : 'Time is required (HH:mm).';
    },
    capacity: function (value) {
      var n = Number(value);
      return Number.isInteger(n) && n >= 1 ? '' : 'Capacity must be a whole number of at least 1.';
    },
    code: function (value) {
      var t = String(value).trim();
      return /^[A-Z0-9-]{3,16}$/i.test(t) ? '' : 'Code must be 3\u201316 characters: letters, digits, dashes.';
    },
    title: function (value) {
      var t = String(value).trim();
      if (!t) return 'Event title is required.';
      if (t.length < 5) return 'Title must be at least 5 characters.';
      return '';
    }
  };

  function errorFor(input) {
    var name = input.getAttribute('name') || input.id;
    var holder = document.querySelector('[data-error-for="' + CSS.escape(name) + '"]');
    return holder;
  }

  function showMessage(input, message) {
    input.classList.toggle('invalid', !!message);
    var holder = errorFor(input);
    if (holder) holder.textContent = message || '';
  }

  // Validate on submit (capture phase so we run before any other handler).
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.matches('[data-validate]')) return;

    var firstBad = null;
    var inputs = form.querySelectorAll('[data-rule]');
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var rule = RULES[input.getAttribute('data-rule')] || RULES.required;
      var message = rule(input.value || '');
      showMessage(input, message);
      if (message && !firstBad) firstBad = input;
    }

    if (firstBad) {
      event.preventDefault();
      firstBad.focus();
    }
  }, true);

  // Clear errors as the user starts typing again.
  document.addEventListener('input', function (event) {
    var input = event.target;
    if (input && input.getAttribute('data-rule')) showMessage(input, '');
  }, true);

  window.DCTValidator = { showMessage: showMessage };
})();