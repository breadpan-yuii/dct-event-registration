/**
 * public/js/main.js — light client interactions.
 * (Autohiding flash, mobile nav, transparent-header scroll state.)
 */
(function () {
  'use strict';

  // Mobile nav toggle
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Transparent header turns solid on scroll (mirrors dct.edu.ph behavior)
  var header = document.querySelector('.site-header.nav-transparent');
  if (header) {
    function onScroll() {
      header.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Auto-hide flash after a few seconds
  var flash = document.getElementById('flashMessage');
  if (flash) {
    setTimeout(function () {
      flash.classList.add('flash-hide');
      setTimeout(function () {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, 600);
    }, 6000);
  }
})();

window.dismissFlash = function () {
  var flash = document.getElementById('flashMessage');
  if (flash && flash.parentNode) flash.parentNode.removeChild(flash);
};