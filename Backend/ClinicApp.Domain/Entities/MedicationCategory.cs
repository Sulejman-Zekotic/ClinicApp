namespace ClinicApp.Domain.Entities;

public class MedicationCategory
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Medication> Medications { get; set; } = new List<Medication>();
}