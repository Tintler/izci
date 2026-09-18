// PowerShell uzerinden bagli diskleri tarar (ince kabuk; birim testine girmez).
// Ayristirma mantigi ../core/driveScan.js icindedir ve orada test edilir.

import { execFile } from 'node:child_process';
import { parseDriveScan } from '../core/driveScan.js';

// Get-Partition/Get-Disk/Get-Volume: Windows 8+ Storage modulu.
const POWERSHELL_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$out = @()
foreach ($p in (Get-Partition | Where-Object { $_.DriveLetter })) {
  $vol = Get-Volume -DriveLetter $p.DriveLetter
  $disk = Get-Disk -Number $p.DiskNumber
  $out += [PSCustomObject]@{
    serialNumber = $(if ($disk) { $disk.SerialNumber } else { $null })
    model        = $(if ($disk) { $disk.FriendlyName } else { $null })
    letter       = "$($p.DriveLetter):"
    fsType       = $(if ($vol) { $vol.FileSystem } else { $null })
    volumeLabel  = $(if ($vol) { $vol.FileSystemLabel } else { $null })
    totalBytes   = $(if ($vol) { $vol.Size } else { $null })
    freeBytes    = $(if ($vol) { $vol.SizeRemaining } else { $null })
  }
}
ConvertTo-Json -InputObject @($out) -Depth 4 -Compress
`;

// Bagli diskleri tarar; normalize edilmis surucu dizisi dondurur.
export function scanDrives() {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', POWERSHELL_SCRIPT],
      { windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(new Error(`Disk taramasi basarisiz: ${error.message}`));
          return;
        }
        try {
          resolve(parseDriveScan(stdout));
        } catch (parseError) {
          reject(parseError);
        }
      }
    );
  });
}