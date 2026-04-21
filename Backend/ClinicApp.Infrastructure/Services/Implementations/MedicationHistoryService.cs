using ClinicApp.Application.Interfaces;
using ClinicApp.Application.DTOs;
using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
using ClinicApp.Infrastructure.Helpers;
namespace ClinicApp.Infrastructure.Services.Implementations
{
    public class MedicationHistoryService : IMedicationHistoryService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public MedicationHistoryService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        
public object TakeMedication(TakeMedicationDto dto, int userId, string username)
{
    var med = _context.Medications.Find(dto.MedicationId);

    if (med == null)
        throw new KeyNotFoundException("Medication not found.");

    var quantity = dto.Quantity <= 0 ? 1 : dto.Quantity;

    if (med.Stock < quantity)
        throw new InvalidOperationException("Medication out of stock.");

    med.Stock -= quantity;

    var history = new MedicationHistory
    {
        MedicationId = med.Id,
        UserId = userId,
        TakenAt = DateTime.UtcNow,
        Reason = dto.Reason.Trim(),
        Quantity = quantity
    };

    _context.MedicationHistories.Add(history);
    _context.SaveChanges();

    AddLog(
        "MEDICATION_TAKEN",
        username,
        $"User '{username}' took {quantity} unit(s) of medication '{med.Name}' (MedicationId: {med.Id}) for reason '{history.Reason}'. Remaining stock: {med.Stock}."
    );

    var medicationTakenMessage = $"Korisnik '{username}' evidentirao je lijek '{med.Name}' u količini {quantity} kom. Razlog: {history.Reason}.";

    NotificationHelper.NotifyUsersByPreference(
        _context,
        p => p.ReceiveMedicationTakenNotifications,
        "medication_taken",
        "Evidentirano uzimanje lijeka",
        medicationTakenMessage
    );

    PushNotificationHelper.SendByPreference(
        _context,
        _configuration,
        p => p.ReceiveMedicationTakenNotifications,
        "Evidentirano uzimanje lijeka",
        medicationTakenMessage,
        "medication_taken"
    );

    if (med.Stock == 0)
    {
        var outOfStockMessage = $"Lijek '{med.Name}' je ostao bez zalihe nakon posljednjeg evidentiranja.";

        NotificationHelper.NotifyUsersByPreference(
            _context,
            p => p.ReceiveOutOfStockNotifications,
            "out_of_stock",
            "Lijek je ostao bez zalihe",
            outOfStockMessage
        );

        PushNotificationHelper.SendByPreference(
            _context,
            _configuration,
            p => p.ReceiveOutOfStockNotifications,
            "Lijek je ostao bez zalihe",
            outOfStockMessage,
            "out_of_stock"
        );
    }
            else if (med.Stock <= med.MinimumStock)
            {
                var lowStockMessage = $"Lijek '{med.Name}' je pri kraju. Preostalo stanje: {med.Stock} kom. Minimalno stanje: {med.MinimumStock} kom.";

                NotificationHelper.NotifyUsersByPreference(
            _context,
            p => p.ReceiveLowStockNotifications,
            "low_stock",
            "Lijek je pri kraju",
            lowStockMessage
        );

        PushNotificationHelper.SendByPreference(
            _context,
            _configuration,
            p => p.ReceiveLowStockNotifications,
            "Lijek je pri kraju",
            lowStockMessage,
            "low_stock"
        );
    }

    return new
    {
        message = "Medication taken successfully.",
        name = med.Name,
        quantity,
        stock = med.Stock
    };
}

        public object GetAll(
            string? search,
            DateTime? fromDate,
            DateTime? toDate,
            int? userId,
            int? medicationId,
            string? reason,
            int currentUserId,
            string? userRole)
        {
            var query = BuildFilteredHistoryQuery(fromDate, toDate, userId, medicationId, reason, currentUserId, userRole);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(h =>
                    (h.Reason != null && h.Reason.ToLower().Contains(term)) ||
                    h.Medication.Name.ToLower().Contains(term) ||
                    h.User.Username.ToLower().Contains(term));
            }

            return query
                .OrderByDescending(h => h.TakenAt)
                .Select(h => new
                {
                    h.Id,
                    h.MedicationId,
                    MedicationName = h.Medication.Name,
                    h.UserId,
                    Username = h.User.Username,
                    h.Reason,
                    h.Quantity,
                    h.TakenAt
                })
                .ToList();
        }

        public byte[] ExportExcel(
            DateTime? fromDate,
            DateTime? toDate,
            int? userId,
            int? medicationId,
            string? reason,
            int currentUserId,
            string? userRole)
        {
            var history = BuildFilteredHistoryQuery(fromDate, toDate, userId, medicationId, reason, currentUserId, userRole)
                .OrderByDescending(h => h.TakenAt)
                .Select(h => new
                {
                    User = h.User.Username,
                    Medication = h.Medication.Name,
                    Reason = h.Reason,
                    Quantity = h.Quantity,
                    TakenAt = h.TakenAt
                })
                .ToList();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Historija");

            worksheet.Cell(1, 1).Value = "Izvoz historije lijekova";
            worksheet.Range(1, 1, 1, 5).Merge();
            worksheet.Cell(2, 1).Value = "Generisano";
            worksheet.Cell(2, 2).Value = DateTime.Now.ToString("dd.MM.yyyy HH:mm");
            worksheet.Cell(3, 1).Value = "Ukupno stavki";
            worksheet.Cell(3, 2).Value = history.Count;

            worksheet.Cell(5, 1).Value = "Korisnik";
            worksheet.Cell(5, 2).Value = "Lijek";
            worksheet.Cell(5, 3).Value = "Razlog";
            worksheet.Cell(5, 4).Value = "Količina";
            worksheet.Cell(5, 5).Value = "Datum";

            worksheet.Cell(1, 1).Style.Font.Bold = true;
            worksheet.Cell(1, 1).Style.Font.FontSize = 16;

            var headerRange = worksheet.Range(5, 1, 5, 5);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#EDE9FE");
            headerRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            headerRange.Style.Border.TopBorder = XLBorderStyleValues.Thin;
            headerRange.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
            headerRange.Style.Border.RightBorder = XLBorderStyleValues.Thin;

            var row = 6;
            foreach (var item in history)
            {
                worksheet.Cell(row, 1).Value = item.User;
                worksheet.Cell(row, 2).Value = item.Medication;
                worksheet.Cell(row, 3).Value = item.Reason ?? string.Empty;
                worksheet.Cell(row, 4).Value = item.Quantity;
                worksheet.Cell(row, 5).Value = item.TakenAt.ToLocalTime().ToString("dd.MM.yyyy HH:mm:ss");

                var dataRange = worksheet.Range(row, 1, row, 5);
                dataRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
                dataRange.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
                dataRange.Style.Border.RightBorder = XLBorderStyleValues.Thin;
                row++;
            }

            worksheet.SheetView.FreezeRows(5);
            worksheet.Range(5, 1, Math.Max(5, row - 1), 5).SetAutoFilter();
            worksheet.Columns().AdjustToContents();
            worksheet.Column(3).Width = Math.Max(worksheet.Column(3).Width, 28);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        public object GetByUser(int userId)
        {
            return _context.MedicationHistories
                .Where(h => h.UserId == userId)
                .Include(h => h.Medication)
                .Include(h => h.User)
                .OrderByDescending(h => h.TakenAt)
                .Select(h => new
                {
                    h.Id,
                    h.MedicationId,
                    MedicationName = h.Medication.Name,
                    h.UserId,
                    Username = h.User.Username,
                    h.Reason,
                    h.Quantity,
                    h.TakenAt
                })
                .ToList();
        }

        public object GetStats(int currentUserId, string? userRole)
        {
            var query = _context.MedicationHistories
                .Include(h => h.Medication)
                .AsQueryable();

            if (userRole != "admin")
            {
                query = query.Where(h => h.UserId == currentUserId);
            }

            return query
                .GroupBy(h => h.Medication.Name)
                .Select(g => new
                {
                    Medication = g.Key,
                    TakenCount = g.Count()
                })
                .OrderByDescending(x => x.TakenCount)
                .ToList();
        }

        public object GetMedicationTrendChart(
            string? range,
            DateTime? fromDate,
            DateTime? toDate,
            string? groupBy,
            int currentUserId,
            string? userRole)
        {
            var (start, end) = ResolveDateRange(range, fromDate, toDate);
            var resolvedGroupBy = ResolveGroupBy(groupBy, start, end);

            var histories = BuildFilteredHistoryQuery(start, end, null, null, null, currentUserId, userRole)
                .Select(h => new
                {
                    h.TakenAt,
                    MedicationName = h.Medication.Name
                })
                .ToList();

            var topMedicationNames = histories
                .GroupBy(h => h.MedicationName)
                .Select(g => new { Name = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Name)
                .Take(5)
                .ToList();

            var buckets = GenerateBuckets(start, end, resolvedGroupBy);

            var datasets = topMedicationNames
                .Select(item => new
                {
                    label = item.Name,
                    values = buckets.Select(bucket =>
                        histories.Count(h =>
                            h.MedicationName == item.Name &&
                            GetBucketStart(h.TakenAt, resolvedGroupBy) == bucket))
                        .ToList(),
                    totalCount = item.Count
                })
                .ToList();

            return new
            {
                title = userRole == "admin"
                    ? "Najkorišteniji lijekovi kroz vrijeme"
                    : "Moji najkorišteniji lijekovi kroz vrijeme",
                groupBy = resolvedGroupBy,
                labels = buckets.Select(bucket => FormatBucketLabel(bucket, resolvedGroupBy)).ToList(),
                datasets,
                totalCount = histories.Count,
                topMedication = topMedicationNames.FirstOrDefault()?.Name ?? "-",
                topMedicationCount = topMedicationNames.FirstOrDefault()?.Count ?? 0,
                range = NormalizeRange(range),
                fromDate = start,
                toDate = end
            };
        }

        public object GetTopUsersChart(
            string? range,
            DateTime? fromDate,
            DateTime? toDate,
            int currentUserId,
            string? userRole)
        {
            var (start, end) = ResolveDateRange(range, fromDate, toDate);

            var data = BuildFilteredHistoryQuery(start, end, null, null, null, currentUserId, userRole)
                .GroupBy(h => h.User.Username)
                .Select(g => new
                {
                    Username = g.Key,
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Username)
                .Take(10)
                .ToList();

            return new
            {
                title = userRole == "admin"
                    ? "Najaktivniji korisnici"
                    : "Moja aktivnost",
                labels = data.Select(x => x.Username).ToList(),
                values = data.Select(x => x.Count).ToList(),
                totalCount = data.Sum(x => x.Count),
                topUsername = data.FirstOrDefault()?.Username ?? "-",
                topCount = data.FirstOrDefault()?.Count ?? 0,
                range = NormalizeRange(range),
                fromDate = start,
                toDate = end,
                groupBy = "range"
            };
        }

        public object GetDetailedChart(
            string? range,
            DateTime? fromDate,
            DateTime? toDate,
            int? userId,
            int? medicationId,
            string? groupBy,
            int currentUserId,
            string? userRole)
        {
            var (start, end) = ResolveDateRange(range, fromDate, toDate);
            var resolvedGroupBy = ResolveGroupBy(groupBy, start, end);

            if (userRole != "admin")
            {
                userId = currentUserId;
            }

            var histories = BuildFilteredHistoryQuery(start, end, userId, medicationId, null, currentUserId, userRole)
                .Select(h => new
                {
                    h.TakenAt,
                    Username = h.User.Username,
                    MedicationName = h.Medication.Name
                })
                .ToList();

            var buckets = GenerateBuckets(start, end, resolvedGroupBy);
            var groupedCounts = histories
                .GroupBy(h => GetBucketStart(h.TakenAt, resolvedGroupBy))
                .ToDictionary(g => g.Key, g => g.Count());

            var values = buckets
                .Select(bucket => groupedCounts.TryGetValue(bucket, out var value) ? value : 0)
                .ToList();

            var peakValue = values.Any() ? values.Max() : 0;
            var peakIndex = peakValue > 0 ? values.IndexOf(peakValue) : -1;
            var peakLabel = peakIndex >= 0 ? FormatBucketLabel(buckets[peakIndex], resolvedGroupBy) : string.Empty;
            var peakLabelHuman = peakIndex >= 0 ? FormatBucketLabelForPeople(buckets[peakIndex], resolvedGroupBy) : string.Empty;

            string chartTitle;
            if (userId.HasValue && medicationId.HasValue)
            {
                var username = _context.Users.Where(u => u.Id == userId.Value).Select(u => u.Username).FirstOrDefault() ?? "Korisnik";
                var medicationName = _context.Medications.Where(m => m.Id == medicationId.Value).Select(m => m.Name).FirstOrDefault() ?? "Lijek";
                chartTitle = $"{username} / {medicationName}";
            }
            else if (userId.HasValue)
            {
                chartTitle = _context.Users.Where(u => u.Id == userId.Value).Select(u => u.Username).FirstOrDefault() ?? "Odabrani korisnik";
            }
            else if (medicationId.HasValue)
            {
                chartTitle = _context.Medications.Where(m => m.Id == medicationId.Value).Select(m => m.Name).FirstOrDefault() ?? "Odabrani lijek";
            }
            else
            {
                chartTitle = userRole == "admin" ? "Detaljni pregled svih uzimanja" : "Moj detaljni pregled";
            }

            return new
            {
                title = chartTitle,
                groupBy = resolvedGroupBy,
                labels = buckets.Select(bucket => FormatBucketLabel(bucket, resolvedGroupBy)).ToList(),
                values,
                totalCount = histories.Count,
                peakValue,
                peakLabel,
                peakLabelHuman,
                range = NormalizeRange(range),
                fromDate = start,
                toDate = end
            };
        }

        public object GetAdminDashboardStats()
        {
            var now = DateTime.UtcNow;
            var todayStart = now.Date;
            var weekStart = todayStart.DayOfWeek == DayOfWeek.Sunday
                ? todayStart.AddDays(-6)
                : todayStart.AddDays(-(int)todayStart.DayOfWeek + 1);

            var monthStart = new DateTime(now.Year, now.Month, 1);

            var histories = _context.MedicationHistories
                .Include(h => h.Medication)
                .Include(h => h.User)
                .ToList();

            var medications = _context.Medications.ToList();

            var todayCount = histories.Count(h => h.TakenAt >= todayStart);
            var weekCount = histories.Count(h => h.TakenAt >= weekStart);
            var monthCount = histories.Count(h => h.TakenAt >= monthStart);

            var lowStockCount = medications.Count(m => m.Stock > 0 && m.Stock <= m.MinimumStock); var outOfStockCount = medications.Count(m => m.Stock == 0);

            var mostUsedMedication = histories
                .GroupBy(h => h.Medication.Name)
                .Select(g => new { Name = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .FirstOrDefault();

            var mostCommonReason = histories
                .Where(h => !string.IsNullOrWhiteSpace(h.Reason))
                .GroupBy(h => h.Reason)
                .Select(g => new { Reason = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .FirstOrDefault();

            var topMedications = histories
                .GroupBy(h => h.Medication.Name)
                .Select(g => new { Medication = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Medication)
                .Take(5)
                .ToList();

            var topUsers = histories
                .GroupBy(h => h.User.Username)
                .Select(g => new { Username = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Username)
                .Take(5)
                .ToList();

            var topReasons = histories
                .Where(h => !string.IsNullOrWhiteSpace(h.Reason))
                .GroupBy(h => h.Reason)
                .Select(g => new { Reason = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Reason)
                .Take(5)
                .ToList();

            var last7Days = Enumerable.Range(0, 7)
                .Select(offset => todayStart.AddDays(-6 + offset))
                .Select(day => new
                {
                    Date = day.ToString("yyyy-MM-dd"),
                    Count = histories.Count(h => h.TakenAt >= day && h.TakenAt < day.AddDays(1))
                })
                .ToList();

            return new
            {
                todayCount,
                weekCount,
                monthCount,
                lowStockCount,
                outOfStockCount,
                mostUsedMedication = mostUsedMedication?.Name ?? "-",
                mostUsedMedicationCount = mostUsedMedication?.Count ?? 0,
                mostCommonReason = mostCommonReason?.Reason ?? "-",
                mostCommonReasonCount = mostCommonReason?.Count ?? 0,
                topMedications,
                topUsers,
                topReasons,
                last7Days
            };
        }

        public byte[] ExportAdminDashboardStatsCsv()
        {
            var now = DateTime.UtcNow;
            var todayStart = now.Date;
            var weekStart = todayStart.DayOfWeek == DayOfWeek.Sunday
                ? todayStart.AddDays(-6)
                : todayStart.AddDays(-(int)todayStart.DayOfWeek + 1);

            var monthStart = new DateTime(now.Year, now.Month, 1);

            var histories = _context.MedicationHistories
                .Include(h => h.Medication)
                .Include(h => h.User)
                .ToList();

            var medications = _context.Medications.ToList();

            var todayCount = histories.Count(h => h.TakenAt >= todayStart);
            var weekCount = histories.Count(h => h.TakenAt >= weekStart);
            var monthCount = histories.Count(h => h.TakenAt >= monthStart);

            var lowStockCount = medications.Count(m => m.Stock > 0 && m.Stock <= m.MinimumStock);
            var outOfStockCount = medications.Count(m => m.Stock == 0);

            var mostUsedMedication = histories
                .GroupBy(h => h.Medication.Name)
                .Select(g => new { Name = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .FirstOrDefault();

            var mostCommonReason = histories
                .Where(h => !string.IsNullOrWhiteSpace(h.Reason))
                .GroupBy(h => h.Reason)
                .Select(g => new { Reason = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .FirstOrDefault();

            var sb = new StringBuilder();
            sb.AppendLine("Sekcija,Naziv,Vrijednost");
            sb.AppendLine($"Sažetak,Uzimanja danas,{todayCount}");
            sb.AppendLine($"Sažetak,Uzimanja ove sedmice,{weekCount}");
            sb.AppendLine($"Sažetak,Uzimanja ovog mjeseca,{monthCount}");
            sb.AppendLine($"Sažetak,Lijekovi pri kraju,{lowStockCount}");
            sb.AppendLine($"Sažetak,Lijekovi bez stanja,{outOfStockCount}");
            sb.AppendLine($"Sažetak,Najčešći lijek,\"{EscapeCsv(mostUsedMedication?.Name ?? "-")}\"");
            sb.AppendLine($"Sažetak,Broj uzimanja najčešćeg lijeka,{mostUsedMedication?.Count ?? 0}");
            sb.AppendLine($"Sažetak,Najčešći razlog,\"{EscapeCsv(mostCommonReason?.Reason ?? "-")}\"");
            sb.AppendLine($"Sažetak,Broj pojavljivanja najčešćeg razloga,{mostCommonReason?.Count ?? 0}");

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        private IQueryable<MedicationHistory> BuildFilteredHistoryQuery(
            DateTime? fromDate,
            DateTime? toDate,
            int? userId,
            int? medicationId,
            string? reason,
            int currentUserId,
            string? userRole)
        {
            var query = _context.MedicationHistories
                .Include(h => h.Medication)
                .Include(h => h.User)
                .AsQueryable();

            if (userRole != "admin")
            {
                query = query.Where(h => h.UserId == currentUserId);
            }
            else if (userId.HasValue)
            {
                query = query.Where(h => h.UserId == userId.Value);
            }

            if (medicationId.HasValue)
            {
                query = query.Where(h => h.MedicationId == medicationId.Value);
            }

            if (!string.IsNullOrWhiteSpace(reason))
            {
                var reasonTerm = reason.Trim().ToLower();
                query = query.Where(h => h.Reason != null && h.Reason.ToLower() == reasonTerm);
            }

            if (fromDate.HasValue)
            {
                var from = DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Utc);
                query = query.Where(h => h.TakenAt >= from);
            }

            if (toDate.HasValue)
            {
                var to = DateTime.SpecifyKind(toDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                query = query.Where(h => h.TakenAt <= to);
            }

            return query;
        }

        private (DateTime Start, DateTime End) ResolveDateRange(string? range, DateTime? fromDate, DateTime? toDate)
        {
            var normalizedRange = NormalizeRange(range);
            var now = DateTime.UtcNow;
            var today = now.Date;
            DateTime start;
            DateTime end;

            switch (normalizedRange)
            {
                case "today":
                    start = today;
                    end = now;
                    break;
                case "7d":
                    start = today.AddDays(-6);
                    end = now;
                    break;
                case "30d":
                    start = today.AddDays(-29);
                    end = now;
                    break;
                case "90d":
                    start = today.AddDays(-89);
                    end = now;
                    break;
                case "365d":
                    start = today.AddDays(-364);
                    end = now;
                    break;
                case "custom":
                    start = fromDate?.Date
                        ?? _context.MedicationHistories.OrderBy(h => h.TakenAt).Select(h => h.TakenAt.Date).FirstOrDefault();

                    if (start == default)
                        start = today;

                    end = toDate?.Date.AddDays(1).AddTicks(-1) ?? now;
                    break;
                case "all":
                default:
                    start = _context.MedicationHistories.OrderBy(h => h.TakenAt).Select(h => h.TakenAt.Date).FirstOrDefault();

                    if (start == default)
                        start = today;

                    end = now;
                    break;
            }

            if (end < start)
            {
                (start, end) = (end.Date, start.Date.AddDays(1).AddTicks(-1));
            }

            return (
                DateTime.SpecifyKind(start, DateTimeKind.Utc),
                DateTime.SpecifyKind(end, DateTimeKind.Utc)
            );
        }

        private static string NormalizeRange(string? range)
        {
            var value = range?.Trim().ToLower();

            return value switch
            {
                "today" => "today",
                "7d" => "7d",
                "30d" => "30d",
                "90d" => "90d",
                "365d" => "365d",
                "custom" => "custom",
                _ => "all"
            };
        }

        private static string ResolveGroupBy(string? groupBy, DateTime start, DateTime end)
        {
            var normalized = groupBy?.Trim().ToLower();

            if (normalized == "day" || normalized == "week" || normalized == "month")
                return normalized;

            var totalDays = Math.Max(1, (end.Date - start.Date).TotalDays + 1);

            if (totalDays <= 31)
                return "day";

            if (totalDays <= 180)
                return "week";

            return "month";
        }

        private static DateTime GetBucketStart(DateTime date, string groupBy)
        {
            var day = date.Date;

            return groupBy switch
            {
                "month" => new DateTime(day.Year, day.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                "week" => StartOfWeek(day),
                _ => new DateTime(day.Year, day.Month, day.Day, 0, 0, 0, DateTimeKind.Utc)
            };
        }

        private static List<DateTime> GenerateBuckets(DateTime start, DateTime end, string groupBy)
        {
            var buckets = new List<DateTime>();
            var current = GetBucketStart(start, groupBy);
            var limit = GetBucketStart(end, groupBy);

            while (current <= limit)
            {
                buckets.Add(current);
                current = groupBy switch
                {
                    "month" => current.AddMonths(1),
                    "week" => current.AddDays(7),
                    _ => current.AddDays(1)
                };
            }

            return buckets;
        }

        private static DateTime StartOfWeek(DateTime day)
        {
            var diff = day.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)day.DayOfWeek - 1;
            var monday = day.AddDays(-diff).Date;
            return new DateTime(monday.Year, monday.Month, monday.Day, 0, 0, 0, DateTimeKind.Utc);
        }

        private static string FormatBucketLabel(DateTime bucket, string groupBy)
        {
            return groupBy switch
            {
                "month" => bucket.ToString("MM.yyyy"),
                "week" => $"Sedmica {bucket:dd.MM}",
                _ => bucket.ToString("dd.MM.yyyy")
            };
        }

        private static string FormatBucketLabelForPeople(DateTime bucket, string groupBy)
        {
            return groupBy switch
            {
                "month" => $"u mjesecu {bucket:MM.yyyy}",
                "week" => $"u sedmici od {bucket:dd.MM.yyyy}",
                _ => bucket.ToString("dddd, dd.MM.yyyy")
            };
        }

        private static string EscapeCsv(string value)
        {
            if (string.IsNullOrEmpty(value))
                return string.Empty;

            return value.Replace("\"", "\"\"");
        }

        private void AddLog(string action, string username, string details)
        {
            _context.Logs.Add(new Log
            {
                Action = action,
                Username = username,
                Details = details,
                Timestamp = DateTime.UtcNow
            });

            _context.SaveChanges();
        }
    }
}
