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

  it('preserves a read-only hosts file while editing it', () => {
    expect(script).toContain('function Write-HostsLines');
    expect(script).toContain('[AllowEmptyString()]');
    expect(script).toContain('[System.IO.FileAttributes]::ReadOnly');
    expect(script).toContain('[System.IO.File]::SetAttributes($HostsPath, $originalAttributes)');
    expect(script.match(/Write-HostsLines -Lines \$newLines/g)).toHaveLength(2);
  });

  it('surfaces failures from the elevated child process', () => {
    expect(script).toContain('[string]$ElevatedHostsLogPath');
    expect(script).toContain('function Write-ElevatedDiagnostic');
    expect(script).toContain('Elevated process diagnostic:');
    expect(script).toContain("'-ElevatedHostsLogPath'");
    expect(script).toContain('-Verb RunAs -WindowStyle Hidden -PassThru -Wait');
  });
});
