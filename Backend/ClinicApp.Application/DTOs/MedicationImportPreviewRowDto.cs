namespace ClinicApp.Application.DTOs
{
    public class MedicationImportPreviewRowDto
    {
        public int RowNumber { get; set; }
        public string? Name { get; set; }
        public int? CurrentStock { get; set; }
        public int? NewStock { get; set; }
        public string Action { get; set; } = string.Empty; // add, update, skip
        public string Message { get; set; } = string.Empty;
    }
}