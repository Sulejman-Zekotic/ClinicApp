namespace ClinicApp.Domain.Entities;

public class MedicationTakeReason
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; }
}