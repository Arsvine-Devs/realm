import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const script = fs.readFileSync(path.join(process.cwd(), 'scripts', 'dev-host-setup.ps1'), 'utf8');

describe('local dev host launcher', () => {
  it('does not shadow the read-only PowerShell PID automatic variable', () => {
    expect(script).not.toMatch(/param\s*\(\s*\[int]\s*\$Pid\s*\)/i);
    expect(script).toMatch(
      /function Get-ProcessNameByPid[\s\S]*param\s*\(\s*\[int]\s*\$ProcessId\s*\)/,
    );
    expect(script).toContain('Get-ProcessNameByPid -ProcessId $preExisting');
  });
});
