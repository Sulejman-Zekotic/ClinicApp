using System.ComponentModel.DataAnnotations;

namespace ClinicApp.Application.DTOs
{
    public class AddUserDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string Role { get; set; } = "user";
    }
}