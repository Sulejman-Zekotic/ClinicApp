using ClinicApp.Application.DTOs;

namespace ClinicApp.Application.Interfaces
{
    public interface INotificationService
    {
        object GetMine(int userId);
        object GetUnreadCount(int userId);
        object GetPreferences(int userId);
        object UpdatePreferences(int userId, NotificationPreferenceUpdateDto dto);
        object MarkAsRead(int userId, int notificationId);
        object MarkAllAsRead(int userId);
        object GetPushPublicKey();
        object SavePushSubscription(int userId, SavePushSubscriptionDto dto);
        object DeletePushSubscription(int userId, DeletePushSubscriptionDto dto);
    }
}