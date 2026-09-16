# Production release procedure

Automatic Vercel deployments from `main` are intentionally disabled in `vercel.json`.
This prevents an incomplete Git build from replacing the known-good production artifact.

## Required release sequence

1. Create a feature branch and push it so Vercel creates a preview deployment.
2. Run the source guard locally:

   ```sh
   npm ci
   npm run verify:release-config
   ```

3. Build and deploy a preview from the reviewed source.
4. Run the route smoke test against the preview:

   ```sh
   VERCEL_AUTOMATION_BYPASS_SECRET="..." npm run verify:routes -- https://preview-url.vercel.app
   ```

   Omit `VERCEL_AUTOMATION_BYPASS_SECRET` when the preview is public.

5. Promote only the exact preview deployment that passed the smoke test.
6. Run the smoke test again against production:

   ```sh
   npm run verify:routes -- https://www.enochmarketing.com
   ```

7. Confirm the canonical domain still points to the promoted deployment with `vercel inspect`.

Do not re-enable automatic `main` deployments until a clean build from the tracked source has been compared with the known-good production artifact and all route checks pass.
