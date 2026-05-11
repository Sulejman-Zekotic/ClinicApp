using ClinicApp.Application.DTOs;

namespace ClinicApp.Application.Interfaces
{
    public interface IUserService
    {
        object Login(LoginDto dto);
        object Refresh(RefreshTokenRequestDto dto);
        void Logout(int userId);
        object GetMe(int userId);

        object AddUser(AddUserDto dto, string adminUsername);
        Task<PagedResultDto<UserListItemDto>> GetPagedUsersAsync(
     ListUsersRequestDto request,
     CancellationToken ct = default);
        object ChangePassword(int userId, ChangePasswordDto dto);

        Task<object> RequestPasswordResetAsync(RequestPasswordResetDto dto);

        object ConfirmPasswordReset(ConfirmPasswordResetDto dto);

        object ResetUserPassword(int userId, string adminUsername);

        object GetLogs();
    }
}
