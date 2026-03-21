/**
 * Creates a Firebase custom token for a given UID.
 * Useful for signing in as another user during development.
 *
 * Usage: node src/scripts/create-custom-token.js
 *
 * Then paste this in the browser devtools console (Nuxt dev):
 *
 *   await window.__signInWithToken('<paste-token-here>');
 *   location.reload();
 */

import { admin } from '../config/firebase.js';

const UID = 'xQYX8r9OPWbcuvlfmCZBhCxa5xB3';

const token = await admin.auth().createCustomToken(UID);
console.log('\nCustom token for UID:', UID);
console.log('\n' + token + '\n');
