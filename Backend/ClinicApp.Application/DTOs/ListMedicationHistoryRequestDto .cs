namespace ClinicApp.Application.DTOs;

public sealed class ListMedicationHistoryRequestDto : PagedRequestDto
{
    public string? Search { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int? UserId { get; set; }

    public int? MedicationId { get; set; }

    public int? MedicationTakeReasonId { get; set; }

    public string? Reason { get; set; }
}