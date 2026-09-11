import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('React Three Fiber timer compatibility patch', () => {
  it('patches the installed Fiber version through pnpm', () => {
    const workspace = readSource('pnpm-workspace.yaml');

    expect(workspace).toContain(
      "'@react-three/fiber@9.7.0': patches/@react-three__fiber@9.7.0.patch",
    );
  });

  it('replaces Fiber clock construction with a Timer-backed compatibility clock', () => {
    const patch = readSource('patches/@react-three__fiber@9.7.0.patch');

    expect(patch).toContain('new THREE.Timer()');
    expect(patch).toContain('new THREE__namespace.Timer()');
    expect(patch).toContain('Timer.prototype.getDelta.call(clock)');
    expect(patch).toContain('-      clock: new THREE.Clock(),');
    expect(patch).toContain('-      clock: new THREE__namespace.Clock(),');
  });

  it('pins Fiber to an exact version so the patch cannot be silently dropped', () => {
    const pkg = readSource('package.json');
    const match = pkg.match(/"@react-three\/fiber":\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    // 精确锁版（无 ^/~ 前缀）：caret 会自动跳到未打补丁的 patch 版本，
    // pnpm 届时只打 warning 不应用补丁，导致 3D 可暂停 clock 静默退回 THREE.Clock()。
    expect(match![1]).toBe('9.7.0');
  });
});
