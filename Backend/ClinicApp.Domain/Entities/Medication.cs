namespace ClinicApp.Domain.Entities
{
    public class Medication
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Code { get; set; } = string.Empty;

        public string? Description { get; set; }

        public string? Manufacturer { get; set; }

        public string? Strength { get; set; }

        public string? Unit { get; set; }

        public int Stock { get; set; }

        public int MinimumStock { get; set; } = 5;

        public string? Category { get; set; }

        public bool RequiresPrescription { get; set; } = false;
    }
}