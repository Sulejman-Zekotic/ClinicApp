namespace ClinicApp.Domain.Entities
{
    public class BrowserPushSubscription
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        public string Endpoint { get; set; } = string.Empty;

        public string P256DH { get; set; } = string.Empty;

        public string Auth { get; set; } = string.Empty;

        public string? UserAgent { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastUsedAt { get; set; }

        public User User { get; set; } = null!;
    }
}
