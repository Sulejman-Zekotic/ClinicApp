namespace ClinicApp.Domain.Entities
{
    public class User
    {
        public int Id { get; set; }

        public string Username { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public string Role { get; set; } = "user";

        public bool MustChangePassword { get; set; } = true;

        public string? RefreshToken { get; set; }

        public DateTime? RefreshTokenExpiryTime { get; set; }

        public DateTime? RefreshTokenCreatedAt { get; set; }

        public string? PasswordResetTokenHash { get; set; }
        public DateTime? PasswordResetTokenExpiryTime { get; set; }
        public DateTime? PasswordResetRequestedAt { get; set; }
        public DateTime? PasswordResetUsedAt { get; set; }

        public string? PasswordResetCode { get; set; }

        public DateTime? PasswordResetCodeExpiryTime { get; set; }
        public string? Email { get; set; }

        public int FailedLoginAttempts { get; set; } = 0;
        public DateTime? LockoutEndUtc { get; set; }
        public DateTime? LastFailedLoginAtUtc { get; set; }
        public DateTime? LastSuccessfulLoginAtUtc { get; set; }

    }
}
