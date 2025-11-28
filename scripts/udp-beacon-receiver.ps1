# ============================================================================
# UDP Beacon Receiver - Receives UDP broadcasts from Windows (for WSL clients)
# ============================================================================
# Usage: powershell.exe -File udp-beacon-receiver.ps1 -Port 9999

param(
    [int]$Port = 9999
)

try {
    # Create UDP client
    $udpClient = New-Object System.Net.Sockets.UdpClient($Port)
    $remoteEndpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)

    Write-Host "[PowerShell Receiver] Listening for beacons on port $Port"

    # Receive beacons and output as JSON (one per line)
    while ($true) {
        try {
            $receivedBytes = $udpClient.Receive([ref]$remoteEndpoint)
            $receivedText = [System.Text.Encoding]::UTF8.GetString($receivedBytes)

            # Validate it's JSON
            $beacon = $receivedText | ConvertFrom-Json

            # Output beacon as single-line JSON (for WSL to parse)
            Write-Output $receivedText
        }
        catch {
            # Ignore invalid messages
        }
    }
}
catch {
    Write-Host "[PowerShell Receiver] Fatal error: $_"
    exit 1
}
finally {
    if ($udpClient) {
        $udpClient.Close()
    }
}
