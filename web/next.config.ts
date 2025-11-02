import type { NextConfig } from 'next';

// Load .env from parent directory if present (enables monorepo/shared-env for Next.js)
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';

const parentEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(parentEnvPath)) {
  dotenv.config({ path: parentEnvPath, override: false });
}

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    clientSegmentCache: true,
    nodeMiddleware: true
  }
};

export default nextConfig;
