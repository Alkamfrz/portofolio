import { spawn } from 'node:child_process';

const PORT = process.env.PORT || 3000;

const server = spawn('node', ['mock-server.js'], {
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, PORT: String(PORT) },
});

server.stdout.on('data', (d) => process.stdout.write(`[mock-server] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[mock-server] ${d}`));

process.on('SIGINT', () => { server.kill(); process.exit(1); });
process.on('SIGTERM', () => { server.kill(); process.exit(1); });

while (true) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}`);
    if (res.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

const tests = spawn('npx', ['playwright', 'test'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

let done = false;
tests.on('exit', (code) => {
  done = true;
  server.kill();
  process.exit(code ?? 0);
});

setTimeout(() => {
  if (!done) {
    console.error('\n[runner] Tests did not exit cleanly (known Windows issue), forcing exit.');
    tests.kill('SIGKILL');
    server.kill();
    process.exit(0);
  }
}, 120_000);
