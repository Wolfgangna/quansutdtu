$root = $PSScriptRoot
$listener = New-Object Net.HttpListener
$listener.Prefixes.Add("http://localhost:3010/")
$listener.Start()
Write-Output "Goc Tam Thu: http://localhost:3010"
while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  try {
    $path = $request.Url.AbsolutePath
    if ($path -eq "/api/letters" -and $request.HttpMethod -eq "GET") {
      $file = Join-Path $root "letters.json"
      $bytes = if (Test-Path $file) { [IO.File]::ReadAllBytes($file) } else { [Text.Encoding]::UTF8.GetBytes("[]") }
      $response.ContentType = "application/json; charset=utf-8"
    } else {
      $relative = $path.TrimStart("/")
      if (!$relative) { $relative = "index.html" }
      $file = Join-Path $root $relative
      if (!(Test-Path $file -PathType Leaf)) {
        $response.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
      } else {
        $bytes = [IO.File]::ReadAllBytes($file)
        $response.ContentType = switch ([IO.Path]::GetExtension($file).ToLower()) {
          ".html" { "text/html; charset=utf-8" }
          ".js" { "text/javascript; charset=utf-8" }
          ".css" { "text/css; charset=utf-8" }
          ".mp3" { "audio/mpeg" }
          default { "application/octet-stream" }
        }
      }
    }
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } finally {
    $response.Close()
  }
}
