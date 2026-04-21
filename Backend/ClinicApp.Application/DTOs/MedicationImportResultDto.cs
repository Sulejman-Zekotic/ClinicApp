namespace ClinicApp.Application.DTOs
{
    public class MedicationImportResultDto
    {
        public int TotalRows { get; set; }
        public int AddedCount { get; set; }
        public int UpdatedCount { get; set; }
        public int SkippedCount { get; set; }
        public List<MedicationImportErrorDto> Errors { get; set; } = new();
    }
}