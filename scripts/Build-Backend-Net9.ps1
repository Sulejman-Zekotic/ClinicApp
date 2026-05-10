param(
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendSolution = Join-Path $repoRoot "Backend\ClinicApp.sln"
$sdkVersion = "9.0.306"
$sdkSource = "C:\Program Files\dotnet\sdk\$sdkVersion\Sdks"
$localSdkRoot = Join-Path $repoRoot ".local-dotnet-sdks-9"

if (-not (Test-Path $sdkSource)) {
    throw ".NET SDK $sdkVersion was not found at $sdkSource."
}

if (-not (Test-Path $localSdkRoot)) {
    New-Item -ItemType Directory -Path $localSdkRoot | Out-Null

    Get-ChildItem $sdkSource -Directory | ForEach-Object {
        New-Item -ItemType Junction -Path (Join-Path $localSdkRoot $_.Name) -Target $_.FullName | Out-Null
    }

    $auto = Join-Path $localSdkRoot "Microsoft.NET.SDK.WorkloadAutoImportPropsLocator\Sdk"
    $manifest = Join-Path $localSdkRoot "Microsoft.NET.SDK.WorkloadManifestTargetsLocator\Sdk"

    New-Item -ItemType Directory -Path $auto -Force | Out-Null
    New-Item -ItemType Directory -Path $manifest -Force | Out-Null

    Set-Content -LiteralPath (Join-Path $auto "AutoImport.props") -Value '<Project xmlns="http://schemas.microsoft.com/developer/msbuild/2003" />' -Encoding UTF8
    Set-Content -LiteralPath (Join-Path $manifest "WorkloadManifest.targets") -Value '<Project xmlns="http://schemas.microsoft.com/developer/msbuild/2003" />' -Encoding UTF8
}

$env:DOTNET_MSBUILD_SDK_RESOLVER_SDKS_DIR = $localSdkRoot
$env:DOTNET_MSBUILD_SDK_RESOLVER_SDKS_VER = $sdkVersion
$env:DOTNET_MSBUILD_SDK_RESOLVER_CLI_DIR = "C:\Program Files\dotnet"

dotnet build $backendSolution -c $Configuration -m:1 -v minimal
