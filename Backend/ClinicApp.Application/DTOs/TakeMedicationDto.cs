using System.ComponentModel.DataAnnotations;
namespace ClinicApp.Application.DTOs
{
    public class TakeMedicationDto
    {
        [Required(ErrorMessage = "Lijek je obavezan.")]
        public int MedicationId { get; set; }

        [Required(ErrorMessage = "Razlog je obavezan.")]
        public string Reason { get; set; } = string.Empty;

        [Range(1, 1000, ErrorMessage = "Količina mora biti između 1 i 1000.")]
        public int Quantity { get; set; } = 1;
    }
}
