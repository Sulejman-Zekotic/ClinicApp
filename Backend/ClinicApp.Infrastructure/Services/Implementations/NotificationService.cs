using ClinicApp.Application.DTOs;
using ClinicApp.Application.Interfaces;
using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Data;
using ClinicApp.Infrastructure.Helpers;
using Microsoft.Extensions.Configuration;

namespace ClinicApp.Infrastructure.Services.Implementations
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public NotificationService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public object GetMine(int userId)
        {
            return _context.Notifications
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .Take(50)
                .Select(x => new
                {
                    x.Id,
                    x.Type,
                    x.Title,
                    x.Message,
                    x.IsRead,
                    x.CreatedAt
                })
                .ToList();
        }

        public object GetUnreadCount(int userId)
        {
            var count = _context.Notifications.Count(x => x.UserId == userId && !x.IsRead);
            return new { unreadCount = count };
        }

        public object GetPreferences(int userId)
        {
            var user = _context.Users.FirstOrDefault(x => x.Id == userId);
            if (user == null)
                throw new KeyNotFoundException("User not found.");

            var preference = NotificationHelper.EnsureUserPreference(_context, user);

            return new
            {
                preference.ReceiveLowStockNotifications,
                preference.ReceiveOutOfStockNotifications,
                preference.ReceiveMedicationTakenNotifications,
                preference.ReceiveImportSummaryNotifications
            };
        }

        public object UpdatePreferences(int userId, NotificationPreferenceUpdateDto dto)
        {
            var user = _context.Users.FirstOrDefault(x => x.Id == userId);
            if (user == null)
                throw new KeyNotFoundException("User not found.");

            var preference = NotificationHelper.EnsureUserPreference(_context, user);

            preference.ReceiveLowStockNotifications = dto.ReceiveLowStockNotifications;
            preference.ReceiveOutOfStockNotifications = dto.ReceiveOutOfStockNotifications;
            preference.ReceiveMedicationTakenNotifications = dto.ReceiveMedicationTakenNotifications;
            preference.ReceiveImportSummaryNotifications = dto.ReceiveImportSummaryNotifications;

            _context.SaveChanges();

            return new { message = "Notification preferences updated successfully." };
        }

        public object MarkAsRead(int userId, int notificationId)
        {
            var item = _context.Notifications.FirstOrDefault(x => x.Id == notificationId && x.UserId == userId);
            if (item == null)
                throw new KeyNotFoundException("Notification not found.");

            item.IsRead = true;
            _context.SaveChanges();

            return new { message = "Notification marked as read." };
        }

        public object MarkAllAsRead(int userId)
        {
            var items = _context.Notifications
                .Where(x => x.UserId == userId && !x.IsRead)
                .ToList();

            foreach (var item in items)
            {
                item.IsRead = true;
            }

            _context.SaveChanges();

            return new { message = "All notifications marked as read." };
        }

        public object GetPushPublicKey()
        {
            var publicKey = _configuration["WebPush:PublicKey"];

            if (string.IsNullOrWhiteSpace(publicKey))
                throw new InvalidOperationException("Web push is not configured.");

            return new { publicKey };
        }

        public object SavePushSubscription(int userId, SavePushSubscriptionDto dto)
        {
            var endpoint = dto.Endpoint?.Trim();
            var p256dh = dto.P256dh?.Trim();
            var auth = dto.Auth?.Trim();
            var userAgent = dto.UserAgent?.Trim();

            if (string.IsNullOrWhiteSpace(endpoint) ||
                string.IsNullOrWhiteSpace(p256dh) ||
                string.IsNullOrWhiteSpace(auth))
            {
                throw new ArgumentException("Endpoint, p256dh and auth are required.");
            }

            var existing = _context.BrowserPushSubscriptions.FirstOrDefault(x => x.Endpoint == endpoint);

            if (existing == null)
            {
                existing = new BrowserPushSubscription
                {
                    UserId = userId,
                    Endpoint = endpoint,
                    P256DH = p256dh,
                    Auth = auth,
                    UserAgent = userAgent,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    LastUsedAt = DateTime.UtcNow
                };

                _context.BrowserPushSubscriptions.Add(existing);
            }
            else
            {
                existing.UserId = userId;
                existing.Endpoint = endpoint;
                existing.P256DH = p256dh;
                existing.Auth = auth;
                existing.UserAgent = userAgent;
                existing.IsActive = true;
                existing.LastUsedAt = DateTime.UtcNow;
            }

            _context.SaveChanges();

            return new { message = "Push subscription saved successfully." };
        }

        public object DeletePushSubscription(int userId, DeletePushSubscriptionDto dto)
        {
            var endpoint = dto.Endpoint?.Trim();

            if (string.IsNullOrWhiteSpace(endpoint))
                throw new ArgumentException("Endpoint is required.");

            var existing = _context.BrowserPushSubscriptions
                .FirstOrDefault(x => x.UserId == userId && x.Endpoint == endpoint);

            if (existing == null)
                return new { message = "Push subscription already removed." };

            _context.BrowserPushSubscriptions.Remove(existing);
            _context.SaveChanges();

            return new { message = "Push subscription deleted successfully." };
        }
    }
}