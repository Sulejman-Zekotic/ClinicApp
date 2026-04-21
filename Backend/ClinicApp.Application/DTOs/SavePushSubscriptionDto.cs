using System.ComponentModel.DataAnnotations;

namespace ClinicApp.Application.DTOs
{
    public class SavePushSubscriptionDto
    {
        [Required]
        public string Endpoint { get; set; } = string.Empty;

        [Required]
        public string P256dh { get; set; } = string.Empty;

        [Required]
        public string Auth { get; set; } = string.Empty;

        public string? UserAgent { get; set; }
    }
}
