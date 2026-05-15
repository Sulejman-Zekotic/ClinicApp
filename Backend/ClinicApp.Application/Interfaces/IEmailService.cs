namespace ClinicApp.Application.Interfaces
{
    public interface IEmailService
    {
        Task SendPasswordResetEmailAsync(string toEmail, string username, string resetLink);
        Task SendPasswordSetupEmailAsync(string toEmail, string username, string setupLink);
    }
}
