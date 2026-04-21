namespace ClinicApp.Domain.Entities
{
    public class UserNotificationPreference
    {
        public int Id { get; set; }
        public int UserId { get; set; }

        public bool ReceiveLowStockNotifications { get; set; }
        public bool ReceiveOutOfStockNotifications { get; set; }
        public bool ReceiveMedicationTakenNotifications { get; set; }
        public bool ReceiveImportSummaryNotifications { get; set; }

        public User User { get; set; } = null!;
    }
}
