$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $projectRoot "android"
$projectCacheDir = "C:\gradle-serbisure-frontend-cache"

if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\javac.exe"))) {
  $jdkHome = $env:JAVA_HOME
} else {
  $localJdk = Join-Path $projectRoot ".tools\jdk-17.0.19+10"
  $androidStudioJdk = "C:\Program Files\Android\Android Studio\jbr"

  if (Test-Path (Join-Path $localJdk "bin\javac.exe")) {
    $jdkHome = $localJdk
  } elseif (Test-Path (Join-Path $androidStudioJdk "bin\javac.exe")) {
    $jdkHome = $androidStudioJdk
  } else {
    throw "JDK not found. Install Android Studio or JDK 17, then set JAVA_HOME before running this script."
  }
}

$env:JAVA_HOME = $jdkHome
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

New-Item -ItemType Directory -Force -Path $projectCacheDir | Out-Null

Push-Location $androidDir
try {
  & .\gradlew.bat --project-cache-dir $projectCacheDir app:assembleDebug -x lint -x test --no-watch-fs "-PreactNativeDevServerPort=8082" "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
} finally {
  Pop-Location
}
