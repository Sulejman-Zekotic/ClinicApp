namespace ClinicApp.Application.DTOs
{
    public class MedicationImportErrorDto
    {
        public int RowNumber { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}