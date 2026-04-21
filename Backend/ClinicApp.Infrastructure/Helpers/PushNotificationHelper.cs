using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
namespace ClinicApp.Infrastructure.Helpers
{
    public static class PushNotificationHelper
    {
        public static void SendToUsers(
            AppDbContext context,
            IConfiguration configuration,
            IEnumerable<int> userIds,
            string title,
            string body,
            string type)
        {
            if (context == null || configuration == null)
                return;

            var publicKey = configuration["WebPush:PublicKey"];
            var privateKey = configuration["WebPush:PrivateKey"];
            var subject = configuration["WebPush:Subject"];

            if (string.IsNullOrWhiteSpace(publicKey) ||
                string.IsNullOrWhiteSpace(privateKey) ||
                string.IsNullOrWhiteSpace(subject))
            {
                return;
            }

            var ids = userIds
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            if (ids.Count == 0)
                return;

            var subscriptions = context.BrowserPushSubscriptions
                .Where(x => x.IsActive && ids.Contains(x.UserId))
                .ToList();

            if (subscriptions.Count == 0)
                return;

            var client = new WebPushClient();
            var vapidDetails = new VapidDetails(subject, publicKey, privateKey);
            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                title,
                body,
                type,
                timestamp = DateTime.UtcNow
            });

            foreach (var subscription in subscriptions)
            {
                try
                {
                    var pushSubscription = new WebPush.PushSubscription(
                        subscription.Endpoint,
                        subscription.P256DH,
                        subscription.Auth
                    );

                    client.SendNotification(pushSubscription, payload, vapidDetails);
                    subscription.LastUsedAt = DateTime.UtcNow;
                }
                catch (WebPushException ex) when ((int?)ex.StatusCode == 404 || (int?)ex.StatusCode == 410)
                {
                    subscription.IsActive = false;
                }
                catch
                {
                    // intentionally ignored so notification creation flow never breaks
                }
            }

            context.SaveChanges();
        }

        public static void SendByPreference(
            AppDbContext context,
            IConfiguration configuration,
            Func<UserNotificationPreference, bool> predicate,
            string title,
            string body,
            string type)
        {
            var targetUserIds = context.UserNotificationPreferences
                .AsEnumerable()
                .Where(predicate)
                .Select(x => x.UserId)
                .Distinct()
                .ToList();

            SendToUsers(context, configuration, targetUserIds, title, body, type);
        }
    }
}
