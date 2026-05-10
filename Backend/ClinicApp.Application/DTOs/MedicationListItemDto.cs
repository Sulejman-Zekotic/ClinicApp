namespace ClinicApp.Application.DTOs;

public sealed class MedicationListItemDto
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public required string Code { get; set; }

    public string? Description { get; set; }

    public string? Manufacturer { get; set; }

    public int? MedicationManufacturerId { get; set; }

    public string? Strength { get; set; }

    public int Stock { get; set; }

    public int MinimumStock { get; set; }

    public bool RequiresPrescription { get; set; }

    public int? MedicationCategoryId { get; set; }

    public string? Category { get; set; }

    public int? MedicationUnitId { get; set; }

    public string? Unit { get; set; }
}
