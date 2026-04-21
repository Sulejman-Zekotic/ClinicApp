using ClinicApp.Application.DTOs;

namespace ClinicApp.Application.Interfaces
{
    public interface IMedicationService
    {
        object GetAll(string? search, string? stockFilter);
        object? GetById(int id);
        byte[] ExportExcel(string? search, string? stockFilter);
        object Add(AddMedicationDto dto, string adminUsername);
        object? Update(int id, UpdateMedicationDto dto, string adminUsername);
        object GetLowStockAlerts();
        bool Delete(int id, string adminUsername);

        MedicationImportPreviewResultDto PreviewImport(Stream fileStream, string fileName);
        MedicationImportResultDto Import(Stream fileStream, string fileName);

        byte[] GenerateExcelTemplate();
    }
}