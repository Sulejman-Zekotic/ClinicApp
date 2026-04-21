namespace ClinicApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public IActionResult GetMine()
        {
            if (!TryGetCurrentUserId(out var userId))
                return Unauthorized(new { message = "Invalid token." });

            return Ok(_notificationService.GetMine(userId));
        }

        [HttpGet("unread-count")]
        public IActionResult GetUnreadCount()
        {
            if (!TryGetCurrentUserId(out var userId))
                return Unauthorized(new { message = "Invalid token." });

            return Ok(_notificationService.GetUnreadCount(userId));
        }

        [HttpGet("preferences")]
        public IActionResult GetPreferences()
        {
            if (!TryGetCurrentUserId(out var userId))
                return Unauthorized(new { message = "Invalid token." });

            try
            {
                return Ok(_notificationService.GetPreferences(userId));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "User not found." });
            }
        }

        [HttpPut("preferences")]
        public IActionResult UpdatePreferences([FromBody] NotificationPreferenceUpdateDto dto)
        {
            if (!TryGetCurrentUserId(out var userId))
                return Unauthorized(new { message = "Invalid token." });

            try
            {
                return Ok(_notificationService.UpdatePreferences(userId, dto));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "User not found." });
            }
        }

        [HttpPost("{id}/read")]
        public IActionResult MarkAsRead(int id)
        {
            if (!TryGetCurrentUserId(out var userId))
                return Unauthorized(new { message = "Invalid token." });

            try
            {
                return Ok(_notificationService.MarkAsRead(userId, id));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Notification not found." });
            }
        }

        [HttpPost("read-all")]
        public IActionResult MarkAllAsRead()
        {
            if (!TryGetCurrentUserId(out var userId))
                return Unauthorized(new { message = "Invalid token." });

            return Ok(_notificationService.MarkAllAsRead(userId));
        }

        [HttpGet("push-public-key")]
        public IActionResult GetPushPublicKey()
        {
            try
            {
                return Ok(_notificationService.GetPushPublicKey());
            }
            catch (InvalidOperationException)
            {
                return NotFound(new { message = "Web push is not configured." });
            }
        }

        [HttpPost("push-subscription")]
        public IActionResult SavePushSubscription([FromBody] SavePushSubscriptionDto dto)
        {
            if (!TryGetCurrentUserId(out var userId))
                return Unauthorized(new { message = "Invalid token." });

            try
            {
                return Ok(_notificationService.SavePushSubscription(userId, dto));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("push-subscription")]
        public IActionResult DeletePushSubscription([FromBody] DeletePushSubscriptionDto dto)
        {
            if (!TryGetCurrentUserId(out var userId))
                return Unauthorized(new { message = "Invalid token." });

            try
            {
                return Ok(_notificationService.DeletePushSubscription(userId, dto));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private bool TryGetCurrentUserId(out int userId)
        {
            userId = 0;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return !string.IsNullOrWhiteSpace(userIdClaim) && int.TryParse(userIdClaim, out userId);
        }
    }
}