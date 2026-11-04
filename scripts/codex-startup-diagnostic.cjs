// Initialization only. Compare startup conditions; never request account/config,
// create threads/turns, change stored configuration or print raw child output.
const { spawn } = require('node:child_process');
const { codexBinary, codexEnvironment, safeOverrides } = require('../.live-test-build/lib/office/server/codex.js');
const overrideArgs = safeOverrides.flatMap(value => ['-c', value]);
const cases = [
  ['baseline', [], { ...process.env, CODEX_HOME: codexEnvironment().CODEX_HOME }],
  ['clean_environment', [], codexEnvironment()],
  ['explicit_stdio', ['--listen', 'stdio://'], codexEnvironment()],
  ['app_settings', ['--listen', 'stdio://', ...overrideArgs], codexEnvironment()],
];
async function check([name, args, env]) {
  return new Promise(resolve => {
    let output = '', stderr = '', stderrBytes = 0, initialized = false, timedOut = false;
    const child = spawn(codexBinary(), ['app-server', ...args], { env, windowsHide: true, shell: false, stdio: 'pipe' });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 15000);
    child.stdin.on('error', () => {});
    child.on('error', () => {});
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stderr.on('data', text => { stderrBytes += Buffer.byteLength(text); stderr = (stderr + text).slice(-32768); });
    child.stdout.on('data', text => {
      output += text;
      if (output.length > 2000000) { child.kill(); return; }
      let end;
      while ((end = output.indexOf('\n')) >= 0) {
        const line = output.slice(0, end); output = output.slice(end + 1);
        try {
          const message = JSON.parse(line);
          if (message.method && message.id !== undefined) {
            child.stdin.write(JSON.stringify({ id: message.id, error: { code: -32601, message: 'Diagnostic denies server requests' } }) + '\n');
          } else if (message.id === 1) {
            initialized = !message.error && Object.hasOwn(message, 'result');
            // Initialization response is sufficient for this differential test.
            child.kill();
          }
        } catch { /* Never print protocol text. */ }
      }
    });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      const markers = [];
      for (const [label, pattern] of [
        ['argument_error', /unexpected argument|unrecognized (?:option|argument)|invalid value|usage:/i],
        ['configuration_error', /error.*config|invalid type|unknown variant|unknown field|failed to parse/i],
        ['permission_error', /os error 5|access is denied|액세스가 거부/i],
        ['sqlite_error', /sqlite/i],
        ['panic', /panicked|panic/i],
      ]) if (pattern.test(stderr)) markers.push(label);
      const mentionedSettings = safeOverrides.map(value => value.split('=')[0]).filter(key => stderr.includes(key));
      resolve({ name, initialized, exitCode, signal, timedOut, stderrBytes, markers, mentionedSettings,
        safeTerms: stderr.match(/approval_policy|untrusted|on-request|on-failure|never|read-only|requirements|지원되지|허용되지|사용할 수 없|잘못|유효하지|인식|구문|필수|설정|사용|invalid|parse|deprecated|value|option|setting|restricted|allowed|must|use|always|ask|prompt|policy|config|deny|not|available|accept|security|unsupported|not supported|not allowed|expected|invalid|requires|cannot|denied|failed|Error|error|os error 5/gi) || [], listenArgumentRejected: /unexpected argument\s+['"]--listen['"]/i.test(stderr) });
      stderr = '';
    });
    child.stdin.write(JSON.stringify({ id: 1, method: 'initialize', params: {
      clientInfo: { name: 'ai_office_local', title: 'AI OFFICE', version: '0.6.1' },
    } }) + '\n');
  });
}
(async () => { for (const entry of cases) console.log(JSON.stringify(await check(entry))); })()
  .catch(() => { console.error('Diagnostic setup failed; no raw error was printed'); process.exitCode = 1; });



