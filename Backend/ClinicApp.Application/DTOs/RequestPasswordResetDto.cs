using System.ComponentModel.DataAnnotations;

namespace ClinicApp.Application.DTOs
{
    public class RequestPasswordResetDto
    {
        [Required]
        public string UsernameOrEmail { get; set; } = string.Empty;
    }
}