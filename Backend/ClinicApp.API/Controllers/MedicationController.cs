namespace ClinicApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MedicationController : ControllerBase
{
    private readonly IMedicationService _medicationService;

    public MedicationController(IMedicationService medicationService)
    {
        _medicationService = medicationService;
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] string? search, [FromQuery] string? stockFilter)
    {
        var medications = _medicationService.GetAll(search, stockFilter);
        return Ok(medications);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var medication = _medicationService.GetById(id);

        if (medication == null)
            return NotFound(new { message = "Medication not found." });

        return Ok(medication);
    }

    [Authorize(Roles = "admin")]
    [HttpGet("export/excel")]
    public IActionResult ExportExcel([FromQuery] string? search, [FromQuery] string? stockFilter)
    {
        var bytes = _medicationService.ExportExcel(search, stockFilter);

        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "lijekovi.xlsx"
        );
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public IActionResult Add([FromBody] AddMedicationDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var adminUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? "unknown";
        var medication = _medicationService.Add(dto, adminUsername);

        return Ok(medication);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] UpdateMedicationDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var adminUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? "unknown";
        var medication = _medicationService.Update(id, dto, adminUsername);

        if (medication == null)
            return NotFound(new { message = "Medication not found." });

        return Ok(medication);
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var adminUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? "unknown";
        var deleted = _medicationService.Delete(id, adminUsername);

        if (!deleted)
            return NotFound(new { message = "Medication not found." });

        return Ok(new { message = "Medication deleted successfully." });
    }

    [Authorize(Roles = "admin")]
    [EnableRateLimiting("excelImportPolicy")]
    [HttpPost("import/excel/preview")]
    public IActionResult PreviewExcel(IFormFile file)
    {
        try
        {
            using var stream = file.OpenReadStream();
            var result = _medicationService.PreviewImport(stream, file.FileName);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "admin")]
    [EnableRateLimiting("excelImportPolicy")]
    [HttpPost("import/excel")]
    public IActionResult ImportExcel(IFormFile file)
    {
        try
        {
            using var stream = file.OpenReadStream();
            var result = _medicationService.Import(stream, file.FileName);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "admin")]
    [HttpGet("import/template")]
    public IActionResult DownloadExcelTemplate()
    {
        var bytes = _medicationService.GenerateExcelTemplate();

        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "lijekovi-template.xlsx"
        );
    }

    [HttpGet("alerts")]
    public IActionResult GetAlerts()
    {
        var data = _medicationService.GetLowStockAlerts();
        return Ok(data);
    }
}