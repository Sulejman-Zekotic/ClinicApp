using ClinicApp.Application.DTOs;

namespace ClinicApp.Application.Interfaces
{
    public interface IMedicationHistoryService
    {
        object TakeMedication(TakeMedicationDto dto, int userId, string username);
        object GetAll(string? search, DateTime? fromDate, DateTime? toDate, int? userId, int? medicationId, string? reason, int currentUserId, string? userRole);
        byte[] ExportExcel(DateTime? fromDate, DateTime? toDate, int? userId, int? medicationId, string? reason, int currentUserId, string? userRole);
        object GetByUser(int userId);
        object GetStats(int currentUserId, string? userRole);
        object GetAdminDashboardStats();
        byte[] ExportAdminDashboardStatsCsv();
        object GetMedicationTrendChart(string? range, DateTime? fromDate, DateTime? toDate, string? groupBy, int currentUserId, string? userRole);
        object GetTopUsersChart(string? range, DateTime? fromDate, DateTime? toDate, int currentUserId, string? userRole);
        object GetDetailedChart(string? range, DateTime? fromDate, DateTime? toDate, int? userId, int? medicationId, string? groupBy, int currentUserId, string? userRole);
    }
}
