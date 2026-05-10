namespace ClinicApp.Application.DTOs;

public sealed class LookupItemDto
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string? Symbol { get; set; }
}