using ClinicApp.Application.DTOs;

public sealed class ListUsersRequestDto: PagedRequestDto
{
    public string? Search { get; set; }
public string? Role { get; set; }
}