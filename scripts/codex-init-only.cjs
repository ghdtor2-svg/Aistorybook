// Local protocol initialization only; never creates a thread or starts a turn.
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const home = process.env.USERPROFILE;
if (!home) throw new Error('USERPROFILE is missing');
const exe = path.join(process.env.APPDATA, 'npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe');
if (!fs.existsSync(exe)) throw new Error('Expected installed codex.exe not found: ' + exe);
const child = spawn(exe, ['app-server'], {
  env: { ...process.env, CODEX_HOME: path.join(home, '.codex') },
  windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], shell: false,
});
let buffer = '', initialized = false, failed = false;
const timer = setTimeout(() => {
  failed = true;
  console.error('FAIL: initialize timed out (15 seconds)');
  child.kill();
}, 15000);
child.on('error', error => {
  clearTimeout(timer); failed = true;
  console.error('FAIL: ' + error.message); process.exitCode = 1;
});
child.stdin.on('error', () => {});
child.stderr.on('data', data => process.stderr.write(data));
child.stdout.on('data', data => {
  buffer += data.toString();
  let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    let message;
    try { message = JSON.parse(line); } catch { continue; }
    if (message.id !== 1 || initialized || failed) continue;
    if (message.error || !Object.hasOwn(message, 'result')) {
      failed = true; console.error('FAIL: initialize RPC rejected'); child.kill();
      continue;
    }
    initialized = true;
    child.stdin.write(JSON.stringify({ method: 'initialized', params: {} }) + '\n', () => {
      console.log('PASS: initialize response received; initialized sent; no inference requested');
      clearTimeout(timer); child.kill();
    });
  }
});
child.on('close', code => {
  clearTimeout(timer);
  if (!initialized || failed) {
    console.error('FAIL: app-server initialization incomplete; exit=' + code);
    process.exitCode = 1;
  }
});
child.stdin.write(JSON.stringify({ id: 1, method: 'initialize', params: {
  clientInfo: { name: 'ai_office_init_check', title: 'AI OFFICE initialization check', version: '0.6.1' },
} }) + '\n');
