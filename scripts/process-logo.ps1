# One-time asset processor: strips the near-white background out of
# public/branding/logo.jpg and emits two transparent PNGs:
#   logo-white.png  - glyphs forced white (for the dark kiosk shell)
#   logo-color.png  - original navy/gold glyphs on transparency
# Uses Windows .NET System.Drawing (no external packages).

Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot "..\public\branding\logo.jpg"
$outDir = Join-Path $PSScriptRoot "..\public\branding"

$bmp = New-Object System.Drawing.Bitmap($src)
$w = $bmp.Width
$h = $bmp.Height
Write-Host "Processing $w x $h"

# background colour sampled from the corners (near-white)
$bg = $bmp.GetPixel(0, 0)
$thresh = 60

function Dist([int]$r, [int]$g, [int]$b) {
  $dr = $r - $bg.R; $dg = $g - $bg.G; $db = $b - $bg.B
  return [math]::Sqrt($dr * $dr + $dg * $dg + $db * $db)
}

$whitePng = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$colorPng = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $p = $bmp.GetPixel($x, $y)
    $d = Dist $p.R $p.G $p.B
    if ($d -lt $thresh) {
      # background -> fully transparent
      $whitePng.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      $colorPng.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    } else {
      $whitePng.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 255, 255, 255))
      $colorPng.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $p.R, $p.G, $p.B))
    }
  }
}

$whitePng.Save((Join-Path $outDir "logo-white.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$colorPng.Save((Join-Path $outDir "logo-color.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose(); $whitePng.Dispose(); $colorPng.Dispose()
Write-Host "Saved logo-white.png and logo-color.png"
