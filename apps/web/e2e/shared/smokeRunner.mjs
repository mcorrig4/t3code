export async function runSmoke(name, body) {
  process.stdout.write(`[${name}] starting...\n`);
  await body();
  process.stdout.write(`[${name}] PASS\n`);
}
