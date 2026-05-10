using System.Security.Claims;
using ClinicApp.Application.DTOs;
using ClinicApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto dto)
        {
            var result = _userService.Login(dto);
            return Ok(result);
        }

        [HttpPost("refresh")]
        public IActionResult Refresh([FromBody] RefreshTokenRequestDto dto)
        {
            var result = _userService.Refresh(dto);
            return Ok(result);
        }

        [Authorize]
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            _userService.Logout(userId);
            return Ok(new { message = "Logged out successfully." });
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            return Ok(_userService.GetMe(userId));
        }
        [Authorize(Roles = "admin")]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] ListUsersRequestDto request, CancellationToken ct)
        {
            var result = await _userService.GetPagedUsersAsync(request, ct);
            return Ok(result);
        }
        [Authorize(Roles = "admin")]
        [HttpPost]
        public IActionResult Add([FromBody] AddUserDto dto)
        {
            var adminUsername = User.Identity?.Name ?? "unknown";
            return Ok(_userService.AddUser(dto, adminUsername));
        }

        [Authorize]
        [HttpPost("change-password")]
        public IActionResult ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            return Ok(_userService.ChangePassword(userId, dto));
        }

        [HttpPost("request-password-reset")]
        public IActionResult RequestReset([FromBody] RequestPasswordResetDto dto)
        {
            return Ok(_userService.RequestPasswordReset(dto));
        }

        [HttpPost("confirm-password-reset")]
        public IActionResult ConfirmReset([FromBody] ConfirmPasswordResetDto dto)
        {
            return Ok(_userService.ConfirmPasswordReset(dto));
        }

        [Authorize(Roles = "admin")]
        [HttpPost("{id}/reset-password")]
        public IActionResult ResetUserPassword(int id)
        {
            var adminUsername = User.Identity?.Name ?? "unknown";
            return Ok(_userService.ResetUserPassword(id, adminUsername));
        }

        [Authorize(Roles = "admin")]
        [HttpGet("logs")]
        public IActionResult Logs()
        {
            return Ok(_userService.GetLogs());
        }
    }
}