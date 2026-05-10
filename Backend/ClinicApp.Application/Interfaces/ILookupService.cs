using ClinicApp.Application.DTOs;

namespace ClinicApp.Application.Interfaces;

public interface ILookupService
{
    Task<IReadOnlyList<LookupItemDto>> GetMedicationCategoriesAsync(CancellationToken ct = default);

    Task<IReadOnlyList<LookupItemDto>> GetMedicationManufacturersAsync(CancellationToken ct = default);

    Task<IReadOnlyList<LookupItemDto>> GetMedicationUnitsAsync(CancellationToken ct = default);

    Task<IReadOnlyList<LookupItemDto>> GetMedicationTakeReasonsAsync(CancellationToken ct = default);
}
