namespace ClinicApp.Domain.Entities
{
    public class Log
    {
        public int Id { get; set; }

        public string Action { get; set; } = string.Empty;

        public string Username { get; set; } = string.Empty;

        public string Details { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}