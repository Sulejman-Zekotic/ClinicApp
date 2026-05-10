using ClinicApp.Application.DTOs;
using ClinicApp.Application.Interfaces;
using ClinicApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicApp.Infrastructure.Services.Implementations;

public sealed class LookupService(AppDbContext db) : ILookupService
{
    public async Task<IReadOnlyList<LookupItemDto>> GetMedicationCategoriesAsync(CancellationToken ct = default)
    {
        return await db.MedicationCategories
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new LookupItemDto
            {
                Id = x.Id,
                Name = x.Name
            })
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<LookupItemDto>> GetMedicationUnitsAsync(CancellationToken ct = default)
    {
        return await db.MedicationUnits
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new LookupItemDto
            {
                Id = x.Id,
                Name = x.Name,
                Symbol = x.Symbol
            })
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<LookupItemDto>> GetMedicationManufacturersAsync(CancellationToken ct = default)
    {
        return await db.MedicationManufacturers
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new LookupItemDto
            {
                Id = x.Id,
                Name = x.Name
            })
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<LookupItemDto>> GetMedicationTakeReasonsAsync(CancellationToken ct = default)
    {
        return await db.MedicationTakeReasons
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .Select(x => new LookupItemDto
            {
                Id = x.Id,
                Name = x.Name
            })
            .ToListAsync(ct);
    }
}
