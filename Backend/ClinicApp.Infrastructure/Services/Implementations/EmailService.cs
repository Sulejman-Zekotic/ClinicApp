using ClinicApp.Application.Interfaces;
using ClinicApp.Application.DTOs;
using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
namespace ClinicApp.Infrastructure.Services.Implementations
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string username, string resetLink)
        {
            var host = _configuration["Email:SmtpHost"];
            var portText = _configuration["Email:SmtpPort"];
            var enableSslText = _configuration["Email:EnableSsl"];
            var fromEmail = _configuration["Email:FromEmail"];
            var fromName = _configuration["Email:FromName"];
            var usernameSmtp = _configuration["Email:Username"];
            var passwordSmtp = _configuration["Email:Password"];

            if (string.IsNullOrWhiteSpace(toEmail))
            {
                throw new InvalidOperationException("Korisnik nema email adresu za slanje reset linka.");
            }

            if (string.IsNullOrWhiteSpace(host) ||
                string.IsNullOrWhiteSpace(portText) ||
                string.IsNullOrWhiteSpace(fromEmail) ||
                string.IsNullOrWhiteSpace(usernameSmtp) ||
                string.IsNullOrWhiteSpace(passwordSmtp))
            {
                throw new InvalidOperationException("SMTP postavke za email nisu ispravno podesene.");
            }

            if (!int.TryParse(portText, out int port))
            {
                throw new InvalidOperationException("SMTP port nije ispravan.");
            }

            bool enableSsl = true;
            if (!string.IsNullOrWhiteSpace(enableSslText))
            {
                bool.TryParse(enableSslText, out enableSsl);
            }

            var subject = "Reset lozinke - ClinicApp";

            var body = $@"
<html>
<head>
    <meta charset='utf-8' />
</head>
<body style='font-family: Arial, sans-serif; color: #1f2937;'>
    <h2>Reset lozinke</h2>
    <p>Pozdrav <strong>{WebUtility.HtmlEncode(username)}</strong>,</p>
    <p>Primili smo zahtjev za reset lozinke za vaš račun.</p>
    <p>Kliknite na dugme ispod kako biste postavili novu lozinku:</p>
    <p>
        <a href='{WebUtility.HtmlEncode(resetLink)}'
           style='display:inline-block;padding:12px 18px;background:#243b63;color:#ffffff;text-decoration:none;border-radius:8px;'>
           Resetuj lozinku
        </a>
    </p>
    <p>Ako dugme ne radi, kopirajte ovaj link u browser:</p>
    <p>{WebUtility.HtmlEncode(resetLink)}</p>
   <p>Link važi 30 minuta i može se iskoristiti samo jednom.</p>
    <p>Ako niste vi tražili reset, slobodno zanemarite ovu poruku.</p>
</body>
</html>";

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName ?? "ClinicApp"),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            message.To.Add(toEmail);

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
            };

            if (!string.IsNullOrWhiteSpace(usernameSmtp))
            {
                client.Credentials = new NetworkCredential(usernameSmtp, passwordSmtp);
            }

            try
            {
                await client.SendMailAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Slanje reset emaila nije uspjelo za korisnika {Username} na adresu {Email}.",
                    username,
                    toEmail
                );

                throw new InvalidOperationException("Slanje reset linka nije uspjelo. Provjeri email postavke.");
            }
        }
    }
}
