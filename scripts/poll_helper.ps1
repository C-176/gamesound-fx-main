param($VkCodes = "54,56", $IntervalMs = 30)

# Self-contained helper that polls GetAsyncKeyState for given VK codes
# Used as fallback when koffi fails to load in packaged Electron

$code = @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
}
'@

Add-Type -TypeDefinition $code -Language CSharp -ErrorAction SilentlyContinue | Out-Null
if (-not ([System.Management.Automation.PSTypeName]'Win32').Type) {
    # Fallback: use reflection-based P/Invoke
    $t = Add-Type -MemberDefinition @'
[DllImport("user32.dll")]public static extern short GetAsyncKeyState(int vKey);
'@ -Name "Win32" -Namespace "Win32" -PassThru -ErrorAction SilentlyContinue
    if (-not $t) {
        Write-Output "FAIL"
        exit 1
    }
}

$codes = $VkCodes.Split(',') | ForEach-Object { [int]$_ }
$prevStates = @{}
foreach ($c in $codes) { $prevStates[$c] = $false }

while ($true) {
    $output = @()
    foreach ($vk in $codes) {
        $raw = [Win32.Win32]::GetAsyncKeyState($vk)
        $nowDown = ($raw -band 0x8000) -ne 0
        $wasDown = $prevStates[$vk]
        if ($nowDown -and -not $wasDown) {
            $output += "KEY:$vk"
        }
        $prevStates[$vk] = $nowDown
    }
    if ($output.Count -gt 0) {
        Write-Host ($output -join '|')
    }
    Start-Sleep -Milliseconds $IntervalMs
}
