using System;
namespace ClinicApp.Domain.Entities
{
    public class MedicationHistory
    {
        public int Id { get; set; }
        public int MedicationId { get; set; }
        public int UserId { get; set; }
        public DateTime TakenAt { get; set; }
        public string Reason { get; set; } = string.Empty;
        public int Quantity { get; set; } = 1;

        public Medication Medication { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
