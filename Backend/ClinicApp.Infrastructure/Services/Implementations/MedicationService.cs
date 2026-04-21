using System.Text;
using ClosedXML.Excel;
using ClinicApp.Application.DTOs;
using ClinicApp.Application.Interfaces;
using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Data;
using ClinicApp.Infrastructure.Helpers;
using Microsoft.Extensions.Configuration;

namespace ClinicApp.Infrastructure.Services.Implementations
{
    public class MedicationService : IMedicationService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        private const long MaxExcelFileSizeBytes = 2 * 1024 * 1024; // 2 MB
        private const int MaxImportRows = 2000;
        private const int MaxMedicationNameLength = 150;
        private const int MaxMedicationCodeLength = 50;
        private const int MaxStockValue = 100000;
        private const int DefaultMinimumStock = 5;

        public MedicationService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public object GetAll(string? search, string? stockFilter)
        {
            var query = _context.Medications.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(m =>
                    m.Name.ToLower().Contains(term) ||
                    m.Code.ToLower().Contains(term) ||
                    (m.Manufacturer != null && m.Manufacturer.ToLower().Contains(term)) ||
                    (m.Category != null && m.Category.ToLower().Contains(term)) ||
                    (m.Strength != null && m.Strength.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(stockFilter))
            {
                switch (stockFilter.Trim().ToLower())
                {
                    case "instock":
                        query = query.Where(m => m.Stock > 0);
                        break;

                    case "outofstock":
                        query = query.Where(m => m.Stock == 0);
                        break;

                    case "lowstock":
                        query = query.Where(m => m.Stock > 0 && m.Stock <= m.MinimumStock);
                        break;
                }
            }

            return query
                .OrderBy(m => m.Name)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Code,
                    m.Description,
                    m.Manufacturer,
                    m.Strength,
                    m.Unit,
                    m.Stock,
                    m.MinimumStock,
                    m.Category,
                    m.RequiresPrescription
                })
                .ToList();
        }

        public object? GetById(int id)
        {
            return _context.Medications
                .Where(m => m.Id == id)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Code,
                    m.Description,
                    m.Manufacturer,
                    m.Strength,
                    m.Unit,
                    m.Stock,
                    m.MinimumStock,
                    m.Category,
                    m.RequiresPrescription
                })
                .FirstOrDefault();
        }

        public object GetLowStockAlerts()
        {
            return _context.Medications
                .Where(m => m.Stock <= m.MinimumStock)
                .OrderBy(m => m.Stock)
                .ThenBy(m => m.Name)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Code,
                    m.Stock,
                    m.MinimumStock,
                    m.Category,
                    m.RequiresPrescription,
                    Status = m.Stock == 0 ? "Nema na stanju" : "Pri kraju"
                })
                .ToList();
        }

        public byte[] ExportExcel(string? search, string? stockFilter)
        {
            var query = _context.Medications.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(m =>
                    m.Name.ToLower().Contains(term) ||
                    m.Code.ToLower().Contains(term) ||
                    (m.Manufacturer != null && m.Manufacturer.ToLower().Contains(term)) ||
                    (m.Category != null && m.Category.ToLower().Contains(term)) ||
                    (m.Strength != null && m.Strength.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(stockFilter))
            {
                switch (stockFilter.Trim().ToLower())
                {
                    case "instock":
                        query = query.Where(m => m.Stock > 0);
                        break;

                    case "outofstock":
                        query = query.Where(m => m.Stock == 0);
                        break;

                    case "lowstock":
                        query = query.Where(m => m.Stock > 0 && m.Stock <= m.MinimumStock);
                        break;
                }
            }

            var medications = query
                .OrderBy(m => m.Name)
                .ToList();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Lijekovi");

            worksheet.Cell(1, 1).Value = "Izvoz lijekova";
            worksheet.Range(1, 1, 1, 11).Merge();

            worksheet.Cell(2, 1).Value = "Generisano";
            worksheet.Cell(2, 2).Value = DateTime.Now.ToString("dd.MM.yyyy HH:mm");

            worksheet.Cell(3, 1).Value = "Ukupno stavki";
            worksheet.Cell(3, 2).Value = medications.Count;

            worksheet.Cell(5, 1).Value = "Id";
            worksheet.Cell(5, 2).Value = "Naziv";
            worksheet.Cell(5, 3).Value = "Šifra";
            worksheet.Cell(5, 4).Value = "Opis";
            worksheet.Cell(5, 5).Value = "Proizvođač";
            worksheet.Cell(5, 6).Value = "Jačina";
            worksheet.Cell(5, 7).Value = "Jedinica";
            worksheet.Cell(5, 8).Value = "Stanje";
            worksheet.Cell(5, 9).Value = "Minimalno stanje";
            worksheet.Cell(5, 10).Value = "Kategorija";
            worksheet.Cell(5, 11).Value = "Recept";
            worksheet.Cell(5, 12).Value = "Status";

            var headerRange = worksheet.Range(5, 1, 5, 12);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#EDE9FE");
            headerRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            headerRange.Style.Border.TopBorder = XLBorderStyleValues.Thin;
            headerRange.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
            headerRange.Style.Border.RightBorder = XLBorderStyleValues.Thin;

            worksheet.Cell(1, 1).Style.Font.Bold = true;
            worksheet.Cell(1, 1).Style.Font.FontSize = 16;

            var row = 6;
            foreach (var med in medications)
            {
                var status = med.Stock == 0
                    ? "Nema na stanju"
                    : med.Stock <= med.MinimumStock
                        ? "Pri kraju"
                        : "Na stanju";

                worksheet.Cell(row, 1).Value = med.Id;
                worksheet.Cell(row, 2).Value = med.Name;
                worksheet.Cell(row, 3).Value = med.Code;
                worksheet.Cell(row, 4).Value = med.Description ?? string.Empty;
                worksheet.Cell(row, 5).Value = med.Manufacturer ?? string.Empty;
                worksheet.Cell(row, 6).Value = med.Strength ?? string.Empty;
                worksheet.Cell(row, 7).Value = med.Unit ?? string.Empty;
                worksheet.Cell(row, 8).Value = med.Stock;
                worksheet.Cell(row, 9).Value = med.MinimumStock;
                worksheet.Cell(row, 10).Value = med.Category ?? string.Empty;
                worksheet.Cell(row, 11).Value = med.RequiresPrescription ? "Da" : "Ne";
                worksheet.Cell(row, 12).Value = status;

                var dataRange = worksheet.Range(row, 1, row, 12);
                dataRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
                dataRange.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
                dataRange.Style.Border.RightBorder = XLBorderStyleValues.Thin;

                if (med.Stock == 0)
                {
                    dataRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#FEE2E2");
                }
                else if (med.Stock <= med.MinimumStock)
                {
                    dataRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#FEF3C7");
                }

                row++;
            }

            worksheet.SheetView.FreezeRows(5);
            worksheet.Range(5, 1, Math.Max(5, row - 1), 12).SetAutoFilter();
            worksheet.Columns().AdjustToContents();
            worksheet.Column(2).Width = Math.Max(worksheet.Column(2).Width, 24);
            worksheet.Column(4).Width = Math.Max(worksheet.Column(4).Width, 32);
            worksheet.Column(5).Width = Math.Max(worksheet.Column(5).Width, 20);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        public object Add(AddMedicationDto dto, string adminUsername)
        {
            ValidateMedicationDto(dto.Name, dto.Code, dto.Stock, dto.MinimumStock);

            var normalizedName = dto.Name.Trim().ToLower();
            var normalizedCode = dto.Code.Trim().ToLower();

            var nameExists = _context.Medications.Any(m => m.Name.ToLower() == normalizedName);
            if (nameExists)
                throw new InvalidOperationException("Medication name already exists.");

            var codeExists = _context.Medications.Any(m => m.Code.ToLower() == normalizedCode);
            if (codeExists)
                throw new InvalidOperationException("Medication code already exists.");

            var medication = new Medication
            {
                Name = dto.Name.Trim(),
                Code = dto.Code.Trim(),
                Description = NormalizeOptional(dto.Description),
                Manufacturer = NormalizeOptional(dto.Manufacturer),
                Strength = NormalizeOptional(dto.Strength),
                Unit = NormalizeOptional(dto.Unit),
                Stock = dto.Stock,
                MinimumStock = dto.MinimumStock,
                Category = NormalizeOptional(dto.Category),
                RequiresPrescription = dto.RequiresPrescription
            };

            _context.Medications.Add(medication);
            _context.SaveChanges();

            AddLog(
                "MEDICATION_CREATED",
                adminUsername,
                $"Admin '{adminUsername}' created medication '{medication.Name}' (Code: {medication.Code}) with stock {medication.Stock}, minimum stock {medication.MinimumStock}, category '{medication.Category ?? "-"}', manufacturer '{medication.Manufacturer ?? "-"}', prescription required: {medication.RequiresPrescription}."
            );

            return medication;
        }

        public object? Update(int id, UpdateMedicationDto dto, string adminUsername)
        {
            ValidateMedicationDto(dto.Name, dto.Code, dto.Stock, dto.MinimumStock);

            var medication = _context.Medications.Find(id);
            if (medication == null)
                return null;

            var normalizedName = dto.Name.Trim().ToLower();
            var normalizedCode = dto.Code.Trim().ToLower();

            var nameExists = _context.Medications.Any(m => m.Id != id && m.Name.ToLower() == normalizedName);
            if (nameExists)
                throw new InvalidOperationException("Medication name already exists.");

            var codeExists = _context.Medications.Any(m => m.Id != id && m.Code.ToLower() == normalizedCode);
            if (codeExists)
                throw new InvalidOperationException("Medication code already exists.");

            var oldState = $"Name='{medication.Name}', Code='{medication.Code}', Stock={medication.Stock}, MinimumStock={medication.MinimumStock}, Category='{medication.Category ?? "-"}', Manufacturer='{medication.Manufacturer ?? "-"}', Prescription={medication.RequiresPrescription}";
            var newState = $"Name='{dto.Name.Trim()}', Code='{dto.Code.Trim()}', Stock={dto.Stock}, MinimumStock={dto.MinimumStock}, Category='{NormalizeOptional(dto.Category) ?? "-"}', Manufacturer='{NormalizeOptional(dto.Manufacturer) ?? "-"}', Prescription={dto.RequiresPrescription}";

            medication.Name = dto.Name.Trim();
            medication.Code = dto.Code.Trim();
            medication.Description = NormalizeOptional(dto.Description);
            medication.Manufacturer = NormalizeOptional(dto.Manufacturer);
            medication.Strength = NormalizeOptional(dto.Strength);
            medication.Unit = NormalizeOptional(dto.Unit);
            medication.Stock = dto.Stock;
            medication.MinimumStock = dto.MinimumStock;
            medication.Category = NormalizeOptional(dto.Category);
            medication.RequiresPrescription = dto.RequiresPrescription;

            _context.SaveChanges();

            AddLog(
                "MEDICATION_UPDATED",
                adminUsername,
                $"Admin '{adminUsername}' updated medication ID {medication.Id} from {oldState} to {newState}."
            );

            return medication;
        }

        public bool Delete(int id, string adminUsername)
        {
            var medication = _context.Medications.Find(id);
            if (medication == null)
                return false;

            var medicationName = medication.Name;
            var medicationCode = medication.Code;
            var medicationStock = medication.Stock;

            _context.Medications.Remove(medication);
            _context.SaveChanges();

            AddLog(
                "MEDICATION_DELETED",
                adminUsername,
                $"Admin '{adminUsername}' deleted medication '{medicationName}' (Code: {medicationCode}, ID: {id}) with stock {medicationStock}."
            );

            return true;
        }

        public MedicationImportPreviewResultDto PreviewImport(Stream fileStream, string fileName)
        {
            return BuildImportPreview(fileStream, fileName);
        }

        public MedicationImportResultDto Import(Stream fileStream, string fileName)
        {
            return ImportFromExcel(fileStream, fileName, "system");
        }

        public MedicationImportResultDto ImportFromExcel(Stream fileStream, string fileName, string adminUsername)
        {
            var preview = BuildImportPreview(fileStream, fileName);

            var result = new MedicationImportResultDto
            {
                TotalRows = preview.TotalRows,
                AddedCount = preview.AddCount,
                UpdatedCount = preview.UpdateCount,
                SkippedCount = preview.SkipCount,
                Errors = preview.Rows
                    .Where(r => r.Action == "skip")
                    .Select(r => new MedicationImportErrorDto
                    {
                        RowNumber = r.RowNumber,
                        Message = r.Message
                    })
                    .ToList()
            };

            var rowsToApply = preview.Rows
                .Where(r => r.Action == "add" || r.Action == "update")
                .ToList();

            var existing = _context.Medications.ToList();
            var existingByCode = existing
                .GroupBy(m => m.Code.Trim().ToLower())
                .ToDictionary(g => g.Key, g => g.First());

            foreach (var row in rowsToApply)
            {
                if (string.IsNullOrWhiteSpace(row.Name) || !row.NewStock.HasValue)
                    continue;

                var name = row.Name.Trim();
                var code = ExtractMetadataValue(row.Message, "code");
                var description = ExtractMetadataValue(row.Message, "description");
                var manufacturer = ExtractMetadataValue(row.Message, "manufacturer");
                var strength = ExtractMetadataValue(row.Message, "strength");
                var unit = ExtractMetadataValue(row.Message, "unit");
                var category = ExtractMetadataValue(row.Message, "category");
                var minimumStockText = ExtractMetadataValue(row.Message, "minimumstock");
                var requiresPrescriptionText = ExtractMetadataValue(row.Message, "requiresprescription");

                if (string.IsNullOrWhiteSpace(code))
                    continue;

                var normalizedCode = code.Trim().ToLower();
                var minimumStock = int.TryParse(minimumStockText, out var parsedMinimumStock)
                    ? parsedMinimumStock
                    : DefaultMinimumStock;

                var requiresPrescription = string.Equals(requiresPrescriptionText, "true", StringComparison.OrdinalIgnoreCase);

                if (existingByCode.TryGetValue(normalizedCode, out var medication))
                {
                    medication.Name = name;
                    medication.Code = code.Trim();
                    medication.Description = NormalizeOptional(description);
                    medication.Manufacturer = NormalizeOptional(manufacturer);
                    medication.Strength = NormalizeOptional(strength);
                    medication.Unit = NormalizeOptional(unit);
                    medication.Stock = row.NewStock.Value;
                    medication.MinimumStock = minimumStock;
                    medication.Category = NormalizeOptional(category);
                    medication.RequiresPrescription = requiresPrescription;
                }
                else
                {
                    var newMedication = new Medication
                    {
                        Name = name,
                        Code = code.Trim(),
                        Description = NormalizeOptional(description),
                        Manufacturer = NormalizeOptional(manufacturer),
                        Strength = NormalizeOptional(strength),
                        Unit = NormalizeOptional(unit),
                        Stock = row.NewStock.Value,
                        MinimumStock = minimumStock,
                        Category = NormalizeOptional(category),
                        RequiresPrescription = requiresPrescription
                    };

                    _context.Medications.Add(newMedication);
                    existingByCode[normalizedCode] = newMedication;
                }
            }

            _context.SaveChanges();

            AddLog(
                "MEDICATION_IMPORT_EXCEL",
                adminUsername,
                $"Admin '{adminUsername}' imported Excel. Added: {result.AddedCount}, Updated: {result.UpdatedCount}, Skipped: {result.SkippedCount}."
            );

            var importSummaryMessage = $"Excel import je završen. Dodano: {result.AddedCount}, ažurirano: {result.UpdatedCount}, preskočeno: {result.SkippedCount}.";

            NotificationHelper.NotifyUsersByPreference(
                _context,
                p => p.ReceiveImportSummaryNotifications,
                "import_summary",
                "Završen import lijekova",
                importSummaryMessage
            );

            PushNotificationHelper.SendByPreference(
                _context,
                _configuration,
                p => p.ReceiveImportSummaryNotifications,
                "Završen import lijekova",
                importSummaryMessage,
                "import_summary"
            );

            return result;
        }

        public byte[] GenerateExcelTemplate()
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("LijekoviTemplate");

            worksheet.Cell(1, 1).Value = "Naziv";
            worksheet.Cell(1, 2).Value = "Šifra";
            worksheet.Cell(1, 3).Value = "Opis";
            worksheet.Cell(1, 4).Value = "Proizvođač";
            worksheet.Cell(1, 5).Value = "Jačina";
            worksheet.Cell(1, 6).Value = "Jedinica";
            worksheet.Cell(1, 7).Value = "Stanje";
            worksheet.Cell(1, 8).Value = "Minimalno stanje";
            worksheet.Cell(1, 9).Value = "Kategorija";
            worksheet.Cell(1, 10).Value = "Recept";

            worksheet.Cell(2, 1).Value = "Brufen";
            worksheet.Cell(2, 2).Value = "BRU-400";
            worksheet.Cell(2, 3).Value = "Analgetik i antipiretik";
            worksheet.Cell(2, 4).Value = "Abbott";
            worksheet.Cell(2, 5).Value = "400";
            worksheet.Cell(2, 6).Value = "mg";
            worksheet.Cell(2, 7).Value = 25;
            worksheet.Cell(2, 8).Value = 5;
            worksheet.Cell(2, 9).Value = "Analgetici";
            worksheet.Cell(2, 10).Value = "Ne";

            worksheet.Cell(3, 1).Value = "Paracetamol";
            worksheet.Cell(3, 2).Value = "PAR-500";
            worksheet.Cell(3, 3).Value = "Protiv bolova i temperature";
            worksheet.Cell(3, 4).Value = "Bosnalijek";
            worksheet.Cell(3, 5).Value = "500";
            worksheet.Cell(3, 6).Value = "mg";
            worksheet.Cell(3, 7).Value = 40;
            worksheet.Cell(3, 8).Value = 8;
            worksheet.Cell(3, 9).Value = "Analgetici";
            worksheet.Cell(3, 10).Value = "Ne";

            worksheet.Cell(4, 1).Value = "Kapi za oči";
            worksheet.Cell(4, 2).Value = "KZO-001";
            worksheet.Cell(4, 3).Value = "Sterilne kapi za oči";
            worksheet.Cell(4, 4).Value = "Alcon";
            worksheet.Cell(4, 5).Value = "10";
            worksheet.Cell(4, 6).Value = "ml";
            worksheet.Cell(4, 7).Value = 12;
            worksheet.Cell(4, 8).Value = 3;
            worksheet.Cell(4, 9).Value = "Oftalmologija";
            worksheet.Cell(4, 10).Value = "Da";

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        private MedicationImportPreviewResultDto BuildImportPreview(Stream fileStream, string fileName)
        {
            ValidateImportFile(fileStream, fileName);

            fileStream.Position = 0;
            using var workbook = new XLWorkbook(fileStream);

            if (workbook.Worksheets.Count != 1)
                throw new InvalidOperationException("Excel fajl mora imati tačno jedan worksheet.");

            var worksheet = workbook.Worksheet(1);

            var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;
            var lastColumn = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;

            if (lastRow < 2)
                throw new InvalidOperationException("Excel fajl nema nijedan podatkovni red.");

            if ((lastRow - 1) > MaxImportRows)
                throw new InvalidOperationException($"Excel fajl može imati maksimalno {MaxImportRows} redova.");

            var headerMap = new Dictionary<string, int>();

            for (int col = 1; col <= lastColumn; col++)
            {
                var header = worksheet.Cell(1, col).GetString().Trim().ToLower();
                if (!string.IsNullOrWhiteSpace(header) && !headerMap.ContainsKey(header))
                {
                    headerMap.Add(header, col);
                }
            }

            var requiredHeaders = new[] { "naziv", "šifra", "stanje" };
            foreach (var requiredHeader in requiredHeaders)
            {
                if (!headerMap.ContainsKey(requiredHeader))
                    throw new InvalidOperationException("Excel mora sadržavati kolone 'Naziv', 'Šifra' i 'Stanje'.");
            }

            var nazivCol = headerMap["naziv"];
            var sifraCol = headerMap["šifra"];
            var opisCol = headerMap.ContainsKey("opis") ? headerMap["opis"] : 0;
            var proizvodjacCol = headerMap.ContainsKey("proizvođač") ? headerMap["proizvođač"] : 0;
            var jacinaCol = headerMap.ContainsKey("jačina") ? headerMap["jačina"] : 0;
            var jedinicaCol = headerMap.ContainsKey("jedinica") ? headerMap["jedinica"] : 0;
            var stanjeCol = headerMap["stanje"];
            var minimumStockCol = headerMap.ContainsKey("minimalno stanje") ? headerMap["minimalno stanje"] : 0;
            var kategorijaCol = headerMap.ContainsKey("kategorija") ? headerMap["kategorija"] : 0;
            var receptCol = headerMap.ContainsKey("recept") ? headerMap["recept"] : 0;

            var result = new MedicationImportPreviewResultDto
            {
                TotalRows = lastRow - 1
            };

            var existing = _context.Medications.ToList();
            var existingByCode = existing
                .GroupBy(m => m.Code.Trim().ToLower())
                .ToDictionary(g => g.Key, g => g.First());

            var seenCodesInFile = new HashSet<string>();

            for (int row = 2; row <= lastRow; row++)
            {
                var nazivCell = worksheet.Cell(row, nazivCol);
                var sifraCell = worksheet.Cell(row, sifraCol);
                var stanjeCell = worksheet.Cell(row, stanjeCol);

                var previewRow = new MedicationImportPreviewRowDto
                {
                    RowNumber = row
                };

                if (!string.IsNullOrWhiteSpace(nazivCell.FormulaA1) ||
                    !string.IsNullOrWhiteSpace(sifraCell.FormulaA1) ||
                    !string.IsNullOrWhiteSpace(stanjeCell.FormulaA1))
                {
                    previewRow.Action = "skip";
                    previewRow.Message = "Formule nisu dozvoljene u kolonama Naziv, Šifra i Stanje.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                var name = nazivCell.GetString().Trim();
                var code = sifraCell.GetString().Trim();
                var description = opisCol > 0 ? worksheet.Cell(row, opisCol).GetString().Trim() : null;
                var manufacturer = proizvodjacCol > 0 ? worksheet.Cell(row, proizvodjacCol).GetString().Trim() : null;
                var strength = jacinaCol > 0 ? worksheet.Cell(row, jacinaCol).GetString().Trim() : null;
                var unit = jedinicaCol > 0 ? worksheet.Cell(row, jedinicaCol).GetString().Trim() : null;
                var stockText = stanjeCell.GetValue<string>().Trim();
                var minimumStockText = minimumStockCol > 0 ? worksheet.Cell(row, minimumStockCol).GetValue<string>().Trim() : string.Empty;
                var category = kategorijaCol > 0 ? worksheet.Cell(row, kategorijaCol).GetString().Trim() : null;
                var requiresPrescriptionText = receptCol > 0 ? worksheet.Cell(row, receptCol).GetString().Trim() : "Ne";

                previewRow.Name = name;

                if (string.IsNullOrWhiteSpace(name) && string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(stockText))
                {
                    previewRow.Action = "skip";
                    previewRow.Message = "Red je prazan.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                if (string.IsNullOrWhiteSpace(name))
                {
                    previewRow.Action = "skip";
                    previewRow.Message = "Naziv lijeka je obavezan.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                if (string.IsNullOrWhiteSpace(code))
                {
                    previewRow.Action = "skip";
                    previewRow.Message = "Šifra lijeka je obavezna.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                if (name.Length > MaxMedicationNameLength)
                {
                    previewRow.Action = "skip";
                    previewRow.Message = $"Naziv lijeka ne može biti duži od {MaxMedicationNameLength} karaktera.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                if (code.Length > MaxMedicationCodeLength)
                {
                    previewRow.Action = "skip";
                    previewRow.Message = $"Šifra lijeka ne može biti duža od {MaxMedicationCodeLength} karaktera.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                var normalizedCode = code.ToLower();

                if (seenCodesInFile.Contains(normalizedCode))
                {
                    previewRow.Action = "skip";
                    previewRow.Message = "Duplikat šifre unutar istog Excel fajla.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                seenCodesInFile.Add(normalizedCode);

                if (!int.TryParse(stockText, out int stock))
                {
                    previewRow.Action = "skip";
                    previewRow.Message = "Stanje mora biti cijeli broj.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                if (stock < 1)
                {
                    previewRow.Action = "skip";
                    previewRow.Message = "Stanje mora biti barem 1.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                if (stock > MaxStockValue)
                {
                    previewRow.Action = "skip";
                    previewRow.Message = $"Stanje ne može biti veće od {MaxStockValue}.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                int minimumStock = DefaultMinimumStock;
                if (!string.IsNullOrWhiteSpace(minimumStockText))
                {
                    if (!int.TryParse(minimumStockText, out minimumStock))
                    {
                        previewRow.Action = "skip";
                        previewRow.Message = "Minimalno stanje mora biti cijeli broj.";
                        result.SkipCount++;
                        result.Rows.Add(previewRow);
                        continue;
                    }

                    if (minimumStock < 0 || minimumStock > MaxStockValue)
                    {
                        previewRow.Action = "skip";
                        previewRow.Message = $"Minimalno stanje mora biti između 0 i {MaxStockValue}.";
                        result.SkipCount++;
                        result.Rows.Add(previewRow);
                        continue;
                    }
                }

                var requiresPrescriptionOk = ParseRequiresPrescription(requiresPrescriptionText, out var parsedRequiresPrescription);
                if (!requiresPrescriptionOk)
                {
                    previewRow.Action = "skip";
                    previewRow.Message = "Kolona Recept mora sadržavati Da ili Ne.";
                    result.SkipCount++;
                    result.Rows.Add(previewRow);
                    continue;
                }

                previewRow.NewStock = stock;

                var metadata = BuildMetadataMessage(
                    existingByCode.TryGetValue(normalizedCode, out _)
                        ? "Postojeći lijek će biti ažuriran."
                        : "Novi lijek će biti dodan.",
                    code,
                    description,
                    manufacturer,
                    strength,
                    unit,
                    minimumStock,
                    category,
                    parsedRequiresPrescription
                );

                if (existingByCode.TryGetValue(normalizedCode, out var existingMedication))
                {
                    previewRow.CurrentStock = existingMedication.Stock;
                    previewRow.Action = "update";
                    previewRow.Message = metadata;
                    result.UpdateCount++;
                }
                else
                {
                    previewRow.CurrentStock = null;
                    previewRow.Action = "add";
                    previewRow.Message = metadata;
                    result.AddCount++;
                }

                result.Rows.Add(previewRow);
            }

            return result;
        }

        private static void ValidateImportFile(Stream fileStream, string fileName)
        {
            if (fileStream == null)
                throw new InvalidOperationException("Excel fajl nije poslan.");

            if (fileStream.Length == 0)
                throw new InvalidOperationException("Excel fajl nije poslan ili je prazan.");

            if (fileStream.Length > MaxExcelFileSizeBytes)
                throw new InvalidOperationException("Excel fajl je prevelik. Maksimalna veličina je 2 MB.");

            var extension = Path.GetExtension(fileName);
            if (!string.Equals(extension, ".xlsx", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Dozvoljen je samo .xlsx Excel fajl.");
        }

        private static bool ParseRequiresPrescription(string? value, out bool result)
        {
            result = false;
            var normalized = (value ?? string.Empty).Trim().ToLower();

            if (string.IsNullOrWhiteSpace(normalized) || normalized == "ne" || normalized == "no" || normalized == "false" || normalized == "0")
            {
                result = false;
                return true;
            }

            if (normalized == "da" || normalized == "yes" || normalized == "true" || normalized == "1")
            {
                result = true;
                return true;
            }

            return false;
        }

        private static string BuildMetadataMessage(
            string baseMessage,
            string code,
            string? description,
            string? manufacturer,
            string? strength,
            string? unit,
            int minimumStock,
            string? category,
            bool requiresPrescription)
        {
            return $"{baseMessage} |code={EscapeMetadata(code)}|description={EscapeMetadata(description)}|manufacturer={EscapeMetadata(manufacturer)}|strength={EscapeMetadata(strength)}|unit={EscapeMetadata(unit)}|minimumstock={minimumStock}|category={EscapeMetadata(category)}|requiresprescription={requiresPrescription}";
        }

        private static string? ExtractMetadataValue(string? message, string key)
        {
            if (string.IsNullOrWhiteSpace(message))
                return null;

            var marker = $"|{key}=";
            var start = message.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (start < 0)
                return null;

            start += marker.Length;
            var end = message.IndexOf('|', start);

            var raw = end >= 0
                ? message[start..end]
                : message[start..];

            return UnescapeMetadata(raw);
        }

        private static string EscapeMetadata(string? value)
        {
            return (value ?? string.Empty)
                .Replace("\\", "\\\\")
                .Replace("|", "\\|")
                .Replace("=", "\\=");
        }

        private static string UnescapeMetadata(string? value)
        {
            if (string.IsNullOrEmpty(value))
                return string.Empty;

            return value
                .Replace("\\=", "=")
                .Replace("\\|", "|")
                .Replace("\\\\", "\\");
        }

        private static string? NormalizeOptional(string? value)
        {
            var trimmed = value?.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

        private static void ValidateMedicationDto(string name, string code, int stock, int minimumStock)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new InvalidOperationException("Medication name is required.");

            if (string.IsNullOrWhiteSpace(code))
                throw new InvalidOperationException("Medication code is required.");

            if (stock < 1)
                throw new InvalidOperationException("Medication stock must be at least 1.");

            if (minimumStock < 0)
                throw new InvalidOperationException("Minimum stock cannot be negative.");
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