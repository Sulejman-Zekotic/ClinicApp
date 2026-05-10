namespace ClinicApp.Application.DTOs;

public sealed class MedicationHistoryListItemDto
{
    public int Id { get; set; }

    public int MedicationId { get; set; }

    public required string MedicationName { get; set; }

    public int UserId { get; set; }

    public required string Username { get; set; }

    public string? Reason { get; set; }

    public int? MedicationTakeReasonId { get; set; }

    public string? MedicationTakeReasonName { get; set; }

    public int Quantity { get; set; }

    public DateTime TakenAt { get; set; }
}