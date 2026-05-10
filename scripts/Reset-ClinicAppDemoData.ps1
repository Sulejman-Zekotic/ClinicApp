$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:SeedData__Enabled = "true"
$env:SeedData__ResetDataOnStartup = "true"
$env:SeedData__ExitAfterSeeding = "true"

dotnet run --project "C:\Users\sulej\Desktop\ClinicApp\Backend\ClinicApp.API\ClinicApp.API.csproj"

$env:SeedData__Enabled = $null
$env:SeedData__ResetDataOnStartup = $null
$env:SeedData__ExitAfterSeeding = $null
