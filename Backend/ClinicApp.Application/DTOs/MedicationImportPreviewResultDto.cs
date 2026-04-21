namespace ClinicApp.Application.DTOs
{
    public class MedicationImportPreviewResultDto
    {
        public int TotalRows { get; set; }
        public int AddCount { get; set; }
        public int UpdateCount { get; set; }
        public int SkipCount { get; set; }
        public List<MedicationImportPreviewRowDto> Rows { get; set; } = new();
    }
}