using System.ComponentModel.DataAnnotations;    
namespace ClinicApp.Application.DTOs
{
    public class AddMedicationDto
    {
        public int? MedicationCategoryId { get; set; }

        public int? MedicationManufacturerId { get; set; }

        public int? MedicationUnitId { get; set; }
        [Required(ErrorMessage = "Naziv lijeka je obavezan.")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Naziv lijeka mora imati između 2 i 100 karaktera.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Šifra lijeka je obavezna.")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Šifra lijeka mora imati između 2 i 50 karaktera.")]
        public string Code { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Opis lijeka ne može biti duži od 500 karaktera.")]
        public string? Description { get; set; }

        [StringLength(100, ErrorMessage = "Naziv proizvođača ne može biti duži od 100 karaktera.")]
        public string? Manufacturer { get; set; }

        [StringLength(50, ErrorMessage = "Jačina lijeka ne može biti duža od 50 karaktera.")]
        public string? Strength { get; set; }

        [StringLength(30, ErrorMessage = "Jedinica ne može biti duža od 30 karaktera.")]
        public string? Unit { get; set; }

        [Range(1, 100000, ErrorMessage = "Količina mora biti između 1 i 100000.")]
        public int Stock { get; set; }

        [Range(0, 100000, ErrorMessage = "Minimalna količina mora biti između 0 i 100000.")]
        public int MinimumStock { get; set; } = 5;

        [StringLength(100, ErrorMessage = "Kategorija ne može biti duža od 100 karaktera.")]
        public string? Category { get; set; }

        public bool RequiresPrescription { get; set; } = false;
    }
}
