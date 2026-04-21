using System.ComponentModel.DataAnnotations;

namespace ClinicApp.Application.DTOs
{
    public class ConfirmPasswordResetDto
    {
        [Required]
        public string Token { get; set; } = string.Empty;

        [Required]
        public string NewPassword { get; set; } = string.Empty;
    }
}