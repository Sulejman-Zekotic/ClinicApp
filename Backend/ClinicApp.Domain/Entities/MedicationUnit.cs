namespace ClinicApp.Domain.Entities;

public class MedicationUnit
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public required string Symbol { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Medication> Medications { get; set; } = new List<Medication>();
}