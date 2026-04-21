using System.Security.Claims;
using System.Text;
using ClinicApp.Application.DTOs;
using ClinicApp.Application.Interfaces;
using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Data;
using ClinicApp.Infrastructure.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace ClinicApp.Infrastructure.Services.Implementations
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public UserService(AppDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        public object Login(LoginDto dto)
        {
            var username = dto.Username.ToLower();

            var user = _context.Users.FirstOrDefault(x =>
                x.Username.ToLower() == username);

            if (user == null || !PasswordHelper.VerifyPassword(dto.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid username or password.");

            var token = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenCreatedAt = DateTime.UtcNow;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(GetRefreshTokenExpiryDays());

            _context.SaveChanges();

            return new
            {
                token,
                refreshToken,
                user.Id,
                user.Username,
                user.Role,
                user.MustChangePassword
            };
        }

        public object Refresh(RefreshTokenRequestDto dto)
        {
            var user = _context.Users.FirstOrDefault(x =>
                x.Id == dto.UserId &&
                x.RefreshToken == dto.RefreshToken);

            if (user == null || user.RefreshTokenExpiryTime < DateTime.UtcNow)
                throw new UnauthorizedAccessException("Invalid refresh token.");

            var newToken = GenerateJwtToken(user);
            var newRefresh = GenerateRefreshToken();

            user.RefreshToken = newRefresh;
            user.RefreshTokenCreatedAt = DateTime.UtcNow;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(GetRefreshTokenExpiryDays());

            _context.SaveChanges();

            return new
            {
                token = newToken,
                refreshToken = newRefresh,
                user.Id,
                user.Username,
                user.Role,
                user.MustChangePassword
            };
        }

        public void Logout(int userId)
        {
            var user = _context.Users.Find(userId);
            if (user == null) return;

            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;

            _context.SaveChanges();
        }

        public object GetMe(int userId)
        {
            var user = _context.Users.Find(userId);
            if (user == null) throw new Exception("User not found");

            return new
            {
                user.Id,
                user.Username,
                user.Role,
                user.MustChangePassword
            };
        }

        public object GetAllUsers()
        {
            return _context.Users.Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                u.Role
            }).ToList();
        }

        public object AddUser(AddUserDto dto, string adminUsername)
        {
            var tempPassword = PasswordHelper.GenerateTemporaryPassword();

            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                Role = dto.Role,
                PasswordHash = PasswordHelper.HashPassword(tempPassword),
                MustChangePassword = true
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            return new
            {
                user.Id,
                user.Username,
                user.Email,
                user.Role,
                temporaryPassword = tempPassword
            };
        }

        public object ChangePassword(int userId, ChangePasswordDto dto)
        {
            var user = _context.Users.Find(userId);
            if (user == null) throw new Exception("User not found");

            if (!PasswordHelper.VerifyPassword(dto.CurrentPassword, user.PasswordHash))
                throw new Exception("Wrong password");

            user.PasswordHash = PasswordHelper.HashPassword(dto.NewPassword);
            user.MustChangePassword = false;

            _context.SaveChanges();

            return new { message = "Password changed" };
        }

        public object RequestPasswordReset(RequestPasswordResetDto dto)
        {
            var user = _context.Users.FirstOrDefault(x =>
                x.Username == dto.UsernameOrEmail || x.Email == dto.UsernameOrEmail);

            if (user == null)
                return new { message = "If account exists, email sent." };

            var token = Guid.NewGuid().ToString();

            user.PasswordResetTokenHash = PasswordHelper.HashPassword(token);
            user.PasswordResetTokenExpiryTime = DateTime.UtcNow.AddMinutes(30);

            _context.SaveChanges();

            var link = $"{_configuration["App:FrontendBaseUrl"]}/reset-password.html?token={token}";

            _emailService.SendPasswordResetEmailAsync(user.Email, user.Username, link);

            return new { message = "Reset link sent." };
        }

        public object ConfirmPasswordReset(ConfirmPasswordResetDto dto)
        {
            var user = _context.Users.ToList().FirstOrDefault(u =>
                u.PasswordResetTokenHash != null &&
                PasswordHelper.VerifyPassword(dto.Token, u.PasswordResetTokenHash));

            if (user == null || user.PasswordResetTokenExpiryTime < DateTime.UtcNow)
                throw new Exception("Invalid or expired token");

            user.PasswordHash = PasswordHelper.HashPassword(dto.NewPassword);
            user.PasswordResetTokenHash = null;

            _context.SaveChanges();

            return new { message = "Password reset successful" };
        }

        public object ResetUserPassword(int userId, string adminUsername)
        {
            var user = _context.Users.Find(userId);
            if (user == null) throw new Exception("User not found");

            var tempPassword = PasswordHelper.GenerateTemporaryPassword();

            user.PasswordHash = PasswordHelper.HashPassword(tempPassword);
            user.MustChangePassword = true;

            _context.SaveChanges();

            return new
            {
                user.Username,
                temporaryPassword = tempPassword
            };
        }

        public object GetLogs()
        {
            return _context.Logs
                .OrderByDescending(x => x.Timestamp)
                .Take(100)
                .ToList();
        }

        // -----------------------
        // PRIVATE METHODS
        // -----------------------

        private string GenerateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var token = new JwtSecurityToken(
                _configuration["Jwt:Issuer"],
                _configuration["Jwt:Audience"],
                claims,
                expires: DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpiryMinutes"])),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string GenerateRefreshToken()
        {
            return Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        }

        private int GetRefreshTokenExpiryDays()
        {
            return int.Parse(_configuration["Jwt:RefreshTokenExpiryDays"]);
        }
    }
}