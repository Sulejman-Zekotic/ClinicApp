using System.ComponentModel.DataAnnotations;

namespace ClinicApp.Application.DTOs
{
    public class ChangePasswordDto
    {
        [Required(ErrorMessage = "Trenutna lozinka je obavezna.")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Nova lozinka je obavezna.")]
        [MinLength(8, ErrorMessage = "Nova lozinka mora imati najmanje 8 karaktera.")]
        public string NewPassword { get; set; } = string.Empty;
    }
}