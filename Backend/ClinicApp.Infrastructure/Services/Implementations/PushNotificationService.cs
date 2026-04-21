using ClinicApp.Application.Interfaces;
using ClinicApp.Application.DTOs;
using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
namespace ClinicApp.Infrastructure.Services.Implementations
{
    public class PushNotificationService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public PushNotificationService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task SendToUserAsync(int userId, string title, string message, string type = "general")
        {
            var subscriptions = await _context.BrowserPushSubscriptions
                .Where(x => x.UserId == userId)
                .ToListAsync();

            if (!subscriptions.Any())
                return;

            await SendToSubscriptionsAsync(subscriptions, title, message, type);
        }

        public async Task SendToUsersAsync(IEnumerable<int> userIds, string title, string message, string type = "general")
        {
            var ids = userIds.Distinct().ToList();

            if (!ids.Any())
                return;

            var subscriptions = await _context.BrowserPushSubscriptions
                .Where(x => ids.Contains(x.UserId))
                .ToListAsync();

            if (!subscriptions.Any())
                return;

            await SendToSubscriptionsAsync(subscriptions, title, message, type);
        }

        private async Task SendToSubscriptionsAsync(
            List<BrowserPushSubscription> subscriptions,
            string title,
            string message,
            string type)
        {
            var publicKey = _configuration["WebPush:PublicKey"];
            var privateKey = _configuration["WebPush:PrivateKey"];
            var subject = _configuration["WebPush:Subject"];

            if (string.IsNullOrWhiteSpace(publicKey) ||
                string.IsNullOrWhiteSpace(privateKey) ||
                string.IsNullOrWhiteSpace(subject))
            {
                return;
            }

            var vapidDetails = new VapidDetails(subject, publicKey, privateKey);
            var webPushClient = new WebPushClient();

            var invalidSubscriptions = new List<BrowserPushSubscription>();

            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                title,
                body = message,
                type
            });

            foreach (var sub in subscriptions)
            {
                try
                {
                    var pushSubscription = new PushSubscription(
                        sub.Endpoint,
                        sub.P256DH,
                        sub.Auth
                    );

                    await webPushClient.SendNotificationAsync(pushSubscription, payload, vapidDetails);
                }
                catch (WebPushException ex)
                {
                    if (ex.StatusCode == System.Net.HttpStatusCode.Gone ||
                        ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        invalidSubscriptions.Add(sub);
                    }
                }
                catch
                {
                    // namjerno preskačemo ostale greške da app ne pukne
                }
            }

            if (invalidSubscriptions.Any())
            {
                _context.BrowserPushSubscriptions.RemoveRange(invalidSubscriptions);
                await _context.SaveChangesAsync();
            }
        }
    }
}