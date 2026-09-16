import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));

const fail = message => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};

const hasRule = (rules, source, destination, permanent) =>
  Array.isArray(rules) && rules.some(rule =>
    rule.source === source &&
    rule.destination === destination &&
    (permanent === undefined || rule.permanent === permanent)
  );

if (config.git?.deploymentEnabled?.main !== false) {
  fail('Automatic Vercel deployments from main must remain disabled until source parity is proven.');
}

if (!hasRule(config.redirects, '/the-gym-owners-reckoning', '/the-gym-owners-reckoning/', true)) {
  fail('The permanent graphic-novel trailing-slash redirect is missing.');
}

if (!hasRule(config.rewrites, '/the-gym-owners-reckoning/', 'https://gym-recon-graphic-novel.vercel.app/')) {
  fail('The exact graphic-novel homepage rewrite is missing.');
}

if (!hasRule(config.rewrites, '/the-gym-owners-reckoning/:path*', 'https://gym-recon-graphic-novel.vercel.app/:path*')) {
  fail('The graphic-novel nested-path rewrite is missing.');
}

if (!hasRule(config.rewrites, '/gym-recon', '/gym-recon-software.html')) {
  fail('The existing Gym Recon rewrite is missing.');
}

const requiredFiles = [
  'index.html',
  'gym-recon-software.html',
  'api/gym-recon-early-access.js',
  'api/gym-recon-lead.js',
  'vercel.json'
];

for (const file of requiredFiles) {
  try {
    await access(new URL(file, root));
  } catch {
    fail(`Required production source is missing: ${file}`);
  }
}

if (!process.exitCode) {
  console.log('Release configuration and required production source files are present.');
}
