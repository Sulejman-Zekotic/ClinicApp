namespace ClinicApp.Application.DTOs
{
    public class NotificationPreferenceUpdateDto
    {
        public bool ReceiveLowStockNotifications { get; set; }
        public bool ReceiveOutOfStockNotifications { get; set; }
        public bool ReceiveMedicationTakenNotifications { get; set; }
        public bool ReceiveImportSummaryNotifications { get; set; }
    }
}
