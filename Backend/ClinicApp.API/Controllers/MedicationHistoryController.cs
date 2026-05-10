
namespace ClinicApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MedicationHistoryController : ControllerBase
    {
        private readonly IMedicationHistoryService _medicationHistoryService;

        public MedicationHistoryController(IMedicationHistoryService medicationHistoryService)
        {
            _medicationHistoryService = medicationHistoryService;
        }

        [HttpPost("take")]
        public IActionResult TakeMedication([FromBody] TakeMedicationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "unknown";

            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return Unauthorized(new { message = "Invalid token." });

            try
            {
                var result = _medicationHistoryService.TakeMedication(dto, userId, username);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Medication not found." });
            }
            catch (InvalidOperationException)
            {
                return BadRequest(new { message = "Medication out of stock." });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] ListMedicationHistoryRequestDto request, CancellationToken ct)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out int currentUserId))
                return Unauthorized(new { message = "Invalid token." });

            var history = await _medicationHistoryService.GetPagedAsync(
                request,
                currentUserId,
                userRole,
                ct);

            return Ok(history);
        }

        [HttpGet("export/excel")]
        public IActionResult ExportExcel(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int? userId,
            [FromQuery] int? medicationId,
            [FromQuery] string? reason)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out int currentUserId))
                return Unauthorized(new { message = "Invalid token." });

            var bytes = _medicationHistoryService.ExportExcel(
                fromDate, toDate, userId, medicationId, reason, currentUserId, userRole);

            return File(
                bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "historija_lijekova.xlsx"
            );
        }

        [Authorize(Roles = "admin")]
        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId)
        {
            var history = _medicationHistoryService.GetByUser(userId);
            return Ok(history);
        }

        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return Unauthorized(new { message = "Invalid token." });

            var stats = _medicationHistoryService.GetStats(userId, userRole);
            return Ok(stats);
        }

        [HttpGet("chart/medication-trend")]
        public IActionResult GetMedicationTrendChart(
            [FromQuery] string? range,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? groupBy)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out int currentUserId))
                return Unauthorized(new { message = "Invalid token." });

            var chart = _medicationHistoryService.GetMedicationTrendChart(range, fromDate, toDate, groupBy, currentUserId, userRole);
            return Ok(chart);
        }

        [HttpGet("chart/top-users")]
        public IActionResult GetTopUsersChart(
            [FromQuery] string? range,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out int currentUserId))
                return Unauthorized(new { message = "Invalid token." });

            var chart = _medicationHistoryService.GetTopUsersChart(range, fromDate, toDate, currentUserId, userRole);
            return Ok(chart);
        }

        [HttpGet("chart/detailed")]
        public IActionResult GetDetailedChart(
            [FromQuery] string? range,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int? userId,
            [FromQuery] int? medicationId,
            [FromQuery] string? groupBy)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out int currentUserId))
                return Unauthorized(new { message = "Invalid token." });

            var chart = _medicationHistoryService.GetDetailedChart(range, fromDate, toDate, userId, medicationId, groupBy, currentUserId, userRole);
            return Ok(chart);
        }

        [Authorize(Roles = "admin")]
        [HttpGet("admin-dashboard-stats")]
        public IActionResult GetAdminDashboardStats()
        {
            var stats = _medicationHistoryService.GetAdminDashboardStats();
            return Ok(stats);
        }

        [Authorize(Roles = "admin")]
        [HttpGet("admin-dashboard-stats/export/csv")]
        public IActionResult ExportAdminDashboardStatsCsv()
        {
            var bytes = _medicationHistoryService.ExportAdminDashboardStatsCsv();
            return File(bytes, "text/csv", "statistika-klinike.csv");
        }
    }
}
