namespace ClinicApp.Application.DTOs;

public sealed class ListMedicationsRequestDto : PagedRequestDto
{
    public string? Search { get; set; }

    public string? StockFilter { get; set; }

    public int? CategoryId { get; set; }

    public int? ManufacturerId { get; set; }

    public int? UnitId { get; set; }
}
