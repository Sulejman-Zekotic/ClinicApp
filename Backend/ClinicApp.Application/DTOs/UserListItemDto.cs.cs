namespace ClinicApp.Application.DTOs;

public sealed class UserListItemDto
{
    public int Id { get; set; }

    public required string Username { get; set; }

    public string? Email { get; set; }

    public required string Role { get; set; }

    public bool MustChangePassword { get; set; }

    public DateTime? LastSuccessfulLoginAtUtc { get; set; }
}