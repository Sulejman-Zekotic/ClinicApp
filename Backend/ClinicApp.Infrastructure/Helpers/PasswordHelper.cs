using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
namespace ClinicApp.Infrastructure.Helpers
{
    public static class PasswordHelper
    {
        private static readonly Random _random = new Random();

        public static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        public static bool VerifyPassword(string password, string passwordHash)
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }

        public static bool IsPasswordStrong(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                return false;

            if (password.Length < 8)
                return false;

            if (!Regex.IsMatch(password, "[A-Z]"))
                return false;

            if (!Regex.IsMatch(password, "[a-z]"))
                return false;

            if (!Regex.IsMatch(password, "[0-9]"))
                return false;

            return true;
        }

        public static string GenerateTemporaryPassword(int length = 10)
        {
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string lower = "abcdefghijkmnopqrstuvwxyz";
            const string numbers = "23456789";
            const string all = upper + lower + numbers;

            var password = new StringBuilder();

            password.Append(upper[_random.Next(upper.Length)]);
            password.Append(lower[_random.Next(lower.Length)]);
            password.Append(numbers[_random.Next(numbers.Length)]);

            while (password.Length < length)
            {
                password.Append(all[_random.Next(all.Length)]);
            }

            return new string(password
                .ToString()
                .OrderBy(_ => _random.Next())
                .ToArray());
        }
    }
}