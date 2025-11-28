# ============================================================================
# UDP Beacon Sender - Sends UDP broadcasts from Windows (for WSL servers)
# ============================================================================
# Usage: powershell.exe -File udp-beacon-sender.ps1 -BeaconJson "..." -Port 9999

param(
    [string]$BeaconJson,
    [int]$Port = 9999
)

try {
    # Parse beacon data
    $beacon = $BeaconJson | ConvertFrom-Json

    # Create UDP client
    $udpClient = New-Object System.Net.Sockets.UdpClient
    $udpClient.EnableBroadcast = $true

    # Broadcast endpoint
    $broadcastEndpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Broadcast, $Port)

    Write-Host "[PowerShell Beacon] Starting UDP broadcast to port $Port"
    Write-Host "[PowerShell Beacon] Lobby: $($beacon.code) @ $($beacon.host):$($beacon.port)"

    # Send beacons every 2 seconds
    while ($true) {
        try {
            $beaconBytes = [System.Text.Encoding]::UTF8.GetBytes($BeaconJson)
            $udpClient.Send($beaconBytes, $beaconBytes.Length, $broadcastEndpoint) | Out-Null
            Write-Host "[PowerShell Beacon] Sent beacon at $(Get-Date -Format 'HH:mm:ss')"
            Start-Sleep -Seconds 2
        }
        catch {
            Write-Host "[PowerShell Beacon] Error sending: $_"
            Start-Sleep -Seconds 2
        }
    }
}
catch {
    Write-Host "[PowerShell Beacon] Fatal error: $_"
    exit 1
}
finally {
    if ($udpClient) {
        $udpClient.Close()
    }
}
