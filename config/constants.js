/**
 * config/constants.js
 * ------------------------------------------------------------------
 * Central place for DCT brand + application configuration.
 * Everything pulled from the official site https://dct.edu.ph/
 * ------------------------------------------------------------------
 */
const path = require('path');

module.exports = {
  APP: {
    name: 'DCT Event Registration',
    shortName: 'DCT Events',
    description:
      'Event Registration System for the Dominican College of Tarlac, Inc.',
    port: process.env.PORT || 3000,
    adminPasscode: process.env.DCT_ADMIN_PASSCODE || 'dct@2026',
  },

  SCHOOL: {
    name: 'Dominican College of Tarlac, Inc.',
    shortName: 'DCT',
    motto: 'Patria, Fides, Sapientia',
    mottoEnglish: 'Faith, Country, Wisdom',
    vision:
      'A God-loving educational community with passion for truth and compassion for humanity.',
    mission:
      'We commit ourselves to promote the truth and holistically transform persons for the service of humanity.',
    address: 'Mc Arthur Highway, Poblacion, Capas 2315, Tarlac, Philippines',
    website: 'https://dct.edu.ph',
    colors: ['White', 'Gray', 'Pink', 'Skyblue'],
  },

  // DCT visual identity — official colors extracted from dct.edu.ph theme
  THEME: {
    pink: '#eb58b5',   // brand primary (buttons, links, accents)
    dark: '#1C1D21',   // hero overlay / footer
    ink: '#252525',    // headings / dark text
    greyText: '#494949',
    greyBg: '#FAFAFA',
    white: '#FFFFFF',
  },

  PATHS: {
    dataDir: path.join(__dirname, '..', 'data'),
  },
};