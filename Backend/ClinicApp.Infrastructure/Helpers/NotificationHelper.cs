using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Data;

namespace ClinicApp.Infrastructure.Helpers
{
    public static class NotificationHelper
    {
        public static UserNotificationPreference EnsureUserPreference(AppDbContext context, User user)
        {
            var preference = context.UserNotificationPreferences.FirstOrDefault(x => x.UserId == user.Id);

            if (preference != null)
                return preference;

            var isAdmin = (user.Role ?? "user").Trim().ToLower() == "admin";

            preference = new UserNotificationPreference
            {
                UserId = user.Id,
                ReceiveLowStockNotifications = isAdmin,
                ReceiveOutOfStockNotifications = isAdmin,
                ReceiveMedicationTakenNotifications = false,
                ReceiveImportSummaryNotifications = isAdmin
            };

            context.UserNotificationPreferences.Add(preference);
            context.SaveChanges();

            return preference;
        }

        public static void EnsureAllUsersHavePreferences(AppDbContext context)
        {
            var users = context.Users.ToList();

            foreach (var user in users)
            {
                EnsureUserPreference(context, user);
            }
        }

        public static void NotifyUsersByPreference(
            AppDbContext context,
            Func<UserNotificationPreference, bool> filter,
            string type,
            string title,
            string message)
        {
            EnsureAllUsersHavePreferences(context);

            var preferences = context.UserNotificationPreferences
                .Where(filter)
                .ToList();

            if (preferences.Count == 0)
                return;

            foreach (var preference in preferences)
            {
                context.Notifications.Add(new Notification
                {
                    UserId = preference.UserId,
                    Type = type,
                    Title = title,
                    Message = message,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            context.SaveChanges();
        }
    }
}