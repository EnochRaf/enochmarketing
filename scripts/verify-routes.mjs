const baseInput = process.argv[2] || process.env.BASE_URL;

if (!baseInput) {
  console.error('Usage: npm run verify:routes -- https://deployment.example.com');
  process.exit(2);
}

const base = new URL(baseInput);
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = bypass ? { 'x-vercel-protection-bypass': bypass } : {};

const checks = [
  { path: '/', status: 200, type: 'text/html', marker: 'Enoch' },
  { path: '/gym-recon', status: 200, type: 'text/html', marker: 'Gym Recon' },
  {
    path: '/the-gym-owners-reckoning',
    status: 308,
    location: '/the-gym-owners-reckoning/'
  },
  {
    path: '/the-gym-owners-reckoning/',
    status: 200,
    type: 'text/html',
    marker: 'The Gym Owner’s Reckoning'
  },
  { path: '/the-gym-owners-reckoning/story.css', status: 200, type: 'text/css' },
  { path: '/the-gym-owners-reckoning/story.js', status: 200, type: 'javascript' },
  { path: '/the-gym-owners-reckoning/assets/joe-story-hero.webp', status: 200, type: 'image/webp' },
  { path: '/the-gym-owners-reckoning/reader/page-004.jpg', status: 200, type: 'image/jpeg' },
  { path: '/the-gym-owners-reckoning/Gym-Recon-The-Gym-Owners-Reckoning.pdf', status: 200, type: 'application/pdf', method: 'HEAD' }
];

let failures = 0;

for (const check of checks) {
  const url = new URL(check.path, base);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url, {
      method: check.method || 'GET',
      headers,
      redirect: 'manual',
      signal: controller.signal
    });

    const problems = [];
    if (response.status !== check.status) {
      problems.push(`expected ${check.status}, received ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (check.type && !contentType.toLowerCase().includes(check.type.toLowerCase())) {
      problems.push(`expected content-type containing ${check.type}, received ${contentType || 'none'}`);
    }

    if (check.location) {
      const location = response.headers.get('location');
      const expected = new URL(check.location, base).href;
      const actual = location ? new URL(location, base).href : '';
      if (actual !== expected) {
        problems.push(`expected redirect ${expected}, received ${actual || 'none'}`);
      }
    }

    if (check.marker) {
      const body = await response.text();
      if (!body.includes(check.marker)) {
        problems.push(`response did not contain marker: ${check.marker}`);
      }
    } else {
      await response.body?.cancel();
    }

    if (problems.length) {
      failures += 1;
      console.error(`FAIL ${check.path}: ${problems.join('; ')}`);
    } else {
      console.log(`PASS ${check.path}: ${response.status} ${contentType || ''}`.trim());
    }
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${check.path}: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

if (failures) {
  console.error(`${failures} release check(s) failed.`);
  process.exit(1);
}

console.log(`All ${checks.length} release checks passed for ${base.origin}.`);
