// Uses the identical adapter, sanitized environment and overrides as /office.
// Compile first: npm.cmd exec -- tsc -p tsconfig.live-tests.json
// No raw account/config/stderr, credentials, thread or turn are printed/requested.
const { probeCodex } = require('../.live-test-build/lib/office/server/codex.js');
probeCodex().then(result => {
  console.log(JSON.stringify(result, null, 2));
  if (!result.connected || result.authMode !== 'chatgpt') process.exitCode = 1;
}).catch(() => { console.error('Probe failed before a safe result was available'); process.exitCode = 1; });
