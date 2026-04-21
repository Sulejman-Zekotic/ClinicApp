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
        object GetAllUsers();

        object ChangePassword(int userId, ChangePasswordDto dto);

        object RequestPasswordReset(RequestPasswordResetDto dto);
        object ConfirmPasswordReset(ConfirmPasswordResetDto dto);

        object ResetUserPassword(int userId, string adminUsername);

        object GetLogs();
    }
}