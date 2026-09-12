import dotenv from 'dotenv';
import path from 'node:path';

export function loadProjectEnv() {
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
  dotenv.config({ path: path.join(process.cwd(), '.env') });
}
