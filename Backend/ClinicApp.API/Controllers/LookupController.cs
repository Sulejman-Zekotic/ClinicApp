using ClinicApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public sealed class LookupController(ILookupService lookupService) : ControllerBase
{
    [HttpGet("medication-categories")]
    public async Task<IActionResult> GetMedicationCategories(CancellationToken ct)
    {
        var result = await lookupService.GetMedicationCategoriesAsync(ct);
        return Ok(result);
    }

    [HttpGet("medication-units")]
    public async Task<IActionResult> GetMedicationUnits(CancellationToken ct)
    {
        var result = await lookupService.GetMedicationUnitsAsync(ct);
        return Ok(result);
    }

    [HttpGet("medication-manufacturers")]
    public async Task<IActionResult> GetMedicationManufacturers(CancellationToken ct)
    {
        var result = await lookupService.GetMedicationManufacturersAsync(ct);
        return Ok(result);
    }

    [HttpGet("medication-take-reasons")]
    public async Task<IActionResult> GetMedicationTakeReasons(CancellationToken ct)
    {
        var result = await lookupService.GetMedicationTakeReasonsAsync(ct);
        return Ok(result);
    }
}
