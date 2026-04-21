using System.ComponentModel.DataAnnotations;

namespace ClinicApp.Application.DTOs
{
    public class DeletePushSubscriptionDto
    {
        [Required]
        public string Endpoint { get; set; } = string.Empty;
    }
}
