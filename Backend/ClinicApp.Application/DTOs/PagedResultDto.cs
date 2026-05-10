namespace ClinicApp.Application.DTOs;

public sealed class PagedResultDto<T>
{
    public required IReadOnlyList<T> Items { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }

    public int TotalCount { get; set; }

    public int TotalPages => PageSize <= 0
        ? 0
        : (int)Math.Ceiling(TotalCount / (double)PageSize);
}