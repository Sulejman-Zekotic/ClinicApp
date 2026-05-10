using ClinicApp.Domain.Entities;
using ClinicApp.Infrastructure.Helpers;
using Microsoft.Extensions.Configuration;

namespace ClinicApp.Infrastructure.Data
{
    public static class AppDbSeeder
    {
        public static void Seed(AppDbContext db, IConfiguration configuration)
        {
            var enabled = ReadBooleanFlag(configuration, "SeedData:Enabled");
            if (!enabled)
                return;

            var resetData = ReadBooleanFlag(configuration, "SeedData:ResetDataOnStartup");
            if (resetData)
            {
                ResetData(db);
            }

            SeedMedicationLookups(db);

            if (db.Users.Any() || db.Medications.Any())
                return;

            var users = new[]
            {
                new User
                {
                    Username = "admin",
                    Email = "admin@clinicapp.local",
                    PasswordHash = PasswordHelper.HashPassword("Admin123!"),
                    Role = "admin",
                    MustChangePassword = false,
                    LastSuccessfulLoginAtUtc = DateTime.UtcNow.AddDays(-1)
                },
                new User
                {
                    Username = "pharma.lana",
                    Email = "lana@clinicapp.local",
                    PasswordHash = PasswordHelper.HashPassword("Clinic123!"),
                    Role = "user",
                    MustChangePassword = false,
                    LastSuccessfulLoginAtUtc = DateTime.UtcNow.AddDays(-2)
                },
                new User
                {
                    Username = "nurse.amar",
                    Email = "amar@clinicapp.local",
                    PasswordHash = PasswordHelper.HashPassword("Clinic123!"),
                    Role = "user",
                    MustChangePassword = false,
                    LastSuccessfulLoginAtUtc = DateTime.UtcNow.AddHours(-10)
                },
                new User
                {
                    Username = "doctor.iva",
                    Email = "iva@clinicapp.local",
                    PasswordHash = PasswordHelper.HashPassword("Clinic123!"),
                    Role = "user",
                    MustChangePassword = false,
                    LastSuccessfulLoginAtUtc = DateTime.UtcNow.AddHours(-6)
                },
                new User
                {
                    Username = "tech.mina",
                    Email = "mina@clinicapp.local",
                    PasswordHash = PasswordHelper.HashPassword("Clinic123!"),
                    Role = "user",
                    MustChangePassword = false,
                    LastSuccessfulLoginAtUtc = DateTime.UtcNow.AddDays(-4)
                }
            };

            db.Users.AddRange(users);
            db.SaveChanges();

            var preferences = users.Select(user => new UserNotificationPreference
            {
                UserId = user.Id,
                ReceiveLowStockNotifications = true,
                ReceiveOutOfStockNotifications = true,
                ReceiveMedicationTakenNotifications = user.Role == "admin",
                ReceiveImportSummaryNotifications = user.Role == "admin" || user.Username == "pharma.lana"
            });

            db.UserNotificationPreferences.AddRange(preferences);

            var categoryMap = db.MedicationCategories.ToDictionary(x => x.Name, x => x.Id);
            var manufacturerMap = db.MedicationManufacturers.ToDictionary(x => x.Name, x => x.Id);
            var unitMap = db.MedicationUnits.ToDictionary(x => x.Symbol, x => x.Id);

            var medications = new[]
            {
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Paracetamol", "PAR-500", "Analgetici", "Bosnalijek", "500", "mg", 42, 10, false, "Pain and fever control."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Ibuprofen", "IBU-400", "Analgetici", "Abbott", "400", "mg", 18, 8, false, "Anti-inflammatory support."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Cefalexin", "CEF-500", "Antibiotici", "Sandoz", "500", "mg", 11, 7, true, "Broad spectrum oral antibiotic."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Amoxiclav", "AMX-625", "Antibiotici", "Lek", "625", "mg", 7, 7, true, "Post-op and infection support."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Diazepam", "DIA-005", "Neurologija", "Galenika", "5", "mg", 4, 6, true, "Sedation and seizure support."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Salbutamol", "SAL-100", "Respiratorno", "GlaxoSmithKline", "100", "mcg", 14, 5, true, "Inhalation therapy."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Tobrex", "TOB-005", "Oftalmologija", "Alcon", "5", "ml", 0, 4, true, "Antibiotic eye drops."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Heparin", "HEP-5000", "Intenzivna njega", "Hemofarm", "5000", "IU", 8, 5, true, "Anticoagulant support."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Omeprazol", "OME-020", "Gastroenterologija", "Teva", "20", "mg", 25, 6, false, "Acid suppression therapy."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Metformin", "MET-850", "Endokrinologija", "Krka", "850", "mg", 19, 6, true, "Glucose control support."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Voltaren Gel", "VOL-150", "Topikalno", "Novartis", "150", "g", 9, 4, false, "Topical pain relief."),
                CreateMedication(categoryMap, manufacturerMap, unitMap, "Vitamin C Infusion", "VIT-C1000", "Infuzije", "Bayer", "1000", "mg", 5, 5, false, "Recovery and hydration support.")
            };

            db.Medications.AddRange(medications);
            db.SaveChanges();

            var reasonMap = db.MedicationTakeReasons.ToDictionary(x => x.Name, x => x.Id);

            var histories = new[]
            {
                CreateHistory("doctor.iva", "Paracetamol", 2, "Post-op pain management", 1),
                CreateHistory("nurse.amar", "Ibuprofen", 1, "Headache relief", 2),
                CreateHistory("doctor.iva", "Cefalexin", 1, "Infection prevention", 3),
                CreateHistory("nurse.amar", "Amoxiclav", 1, "Surgical ward follow-up", 4),
                CreateHistory("tech.mina", "Salbutamol", 1, "Asthma support", 5),
                CreateHistory("doctor.iva", "Diazepam", 1, "Procedure calming", 6),
                CreateHistory("pharma.lana", "Omeprazol", 2, "Gastric protection", 7),
                CreateHistory("doctor.iva", "Metformin", 1, "Diabetes checkup", 8),
                CreateHistory("nurse.amar", "Paracetamol", 1, "Temperature control", 9),
                CreateHistory("doctor.iva", "Heparin", 1, "Post-op anticoagulation", 10),
                CreateHistory("tech.mina", "Vitamin C Infusion", 1, "Recovery support", 11),
                CreateHistory("nurse.amar", "Voltaren Gel", 1, "Muscle strain", 12),
                CreateHistory("doctor.iva", "Paracetamol", 2, "Emergency room pain relief", 13),
                CreateHistory("pharma.lana", "Ibuprofen", 1, "Quick relief pack", 14),
                CreateHistory("doctor.iva", "Heparin", 1, "ICU protocol", 16),
                CreateHistory("nurse.amar", "Amoxiclav", 1, "Ward infection protocol", 18),
                CreateHistory("tech.mina", "Salbutamol", 1, "Pulmonary support", 20),
                CreateHistory("doctor.iva", "Paracetamol", 1, "Routine clinical use", 22)
            }
            .Select(item => new MedicationHistory
            {
                UserId = users.First(u => u.Username == item.Username).Id,
                MedicationId = medications.First(m => m.Name == item.MedicationName).Id,
                Quantity = item.Quantity,
                Reason = item.Reason,
                ReasonText = item.Reason,
                MedicationTakeReasonId = ResolveReasonId(reasonMap, item.Reason),
                TakenAt = DateTime.UtcNow.AddDays(-item.DaysAgo)
            });

            db.MedicationHistories.AddRange(histories);

            var notifications = new[]
            {
                CreateNotification(users[0].Id, "low_stock", "Diazepam is running low", "Only 4 units are left and the minimum level is 6.", 2, false),
                CreateNotification(users[0].Id, "out_of_stock", "Tobrex is out of stock", "Reorder the ophthalmology stock as soon as possible.", 1, false),
                CreateNotification(users[1].Id, "import_summary", "Weekly stock sync completed", "Demo import summary is ready for review.", 3, true),
                CreateNotification(users[2].Id, "medication_taken", "Recent medication activity", "A new medication take was recorded in the ward.", 0, false),
                CreateNotification(users[3].Id, "medication_taken", "Clinical activity updated", "Medication history was updated with a new doctor entry.", 0, false),
                CreateNotification(users[4].Id, "low_stock", "Vitamin C infusion is at threshold", "Current stock has reached the minimum level.", 4, true)
            };

            db.Notifications.AddRange(notifications);

            var logs = new[]
            {
                CreateLog("SEED_BOOTSTRAP", "system", "Initial demo dataset created for ClinicApp.", 1),
                CreateLog("MEDICATION_IMPORT_EXCEL", "admin", "Demo Excel import summary created for presentation mode.", 3),
                CreateLog("MEDICATION_UPDATED", "admin", "Medication stock thresholds were aligned with the new clinic demo workflow.", 4),
                CreateLog("MEDICATION_TAKEN", "doctor.iva", "Doctor Iva recorded medication usage for post-op care.", 5),
                CreateLog("MEDICATION_TAKEN", "nurse.amar", "Nurse Amar recorded ward medication usage.", 6),
                CreateLog("USER_CREATED", "admin", "Demo user tech.mina was added to the system.", 8),
                CreateLog("PASSWORD_RESET_REQUESTED", "system", "Password reset flow was validated for the Angular frontend.", 9)
            };

            db.Logs.AddRange(logs);
            db.SaveChanges();
        }

        private static void SeedMedicationLookups(AppDbContext db)
        {
            if (!db.MedicationCategories.Any())
            {
                db.MedicationCategories.AddRange(
                    new MedicationCategory { Name = "Analgetici", Description = "Lijekovi protiv bolova" },
                    new MedicationCategory { Name = "Antibiotici", Description = "Lijekovi protiv bakterijskih infekcija" },
                    new MedicationCategory { Name = "Kapi za oči", Description = "Oftalmološki lijekovi" },
                    new MedicationCategory { Name = "Vitamini i suplementi", Description = "Dodaci terapiji" },
                    new MedicationCategory { Name = "Antihistaminici", Description = "Lijekovi protiv alergija" },
                    new MedicationCategory { Name = "Kardiološki lijekovi", Description = "Terapija za srce i pritisak" },
                    new MedicationCategory { Name = "Dermatološki lijekovi", Description = "Kreme, masti i terapija za kožu" },
                    new MedicationCategory { Name = "Neurologija", Description = "Lijekovi za neurološka stanja" },
                    new MedicationCategory { Name = "Respiratorno", Description = "Lijekovi za respiratorni sistem" },
                    new MedicationCategory { Name = "Oftalmologija", Description = "Lijekovi i preparati za oči" },
                    new MedicationCategory { Name = "Intenzivna njega", Description = "Terapija za intenzivnu njegu" },
                    new MedicationCategory { Name = "Gastroenterologija", Description = "Lijekovi za probavni sistem" },
                    new MedicationCategory { Name = "Endokrinologija", Description = "Lijekovi za endokrinološka stanja" },
                    new MedicationCategory { Name = "Topikalno", Description = "Kreme, gelovi i lokalna terapija" },
                    new MedicationCategory { Name = "Infuzije", Description = "Infuziona terapija" },
                    new MedicationCategory { Name = "Ostalo", Description = "Nekategorizovani lijekovi" }
                );
            }

            if (!db.MedicationUnits.Any())
            {
                db.MedicationUnits.AddRange(
                    new MedicationUnit { Name = "Komad", Symbol = "kom" },
                    new MedicationUnit { Name = "Tableta", Symbol = "tbl" },
                    new MedicationUnit { Name = "Kapsula", Symbol = "kaps" },
                    new MedicationUnit { Name = "Mililitar", Symbol = "ml" },
                    new MedicationUnit { Name = "Miligram", Symbol = "mg" },
                    new MedicationUnit { Name = "Mikrogram", Symbol = "mcg" },
                    new MedicationUnit { Name = "Gram", Symbol = "g" },
                    new MedicationUnit { Name = "Internacionalna jedinica", Symbol = "IU" },
                    new MedicationUnit { Name = "Bočica", Symbol = "bočica" },
                    new MedicationUnit { Name = "Tuba", Symbol = "tuba" },
                    new MedicationUnit { Name = "Kutija", Symbol = "kutija" }
                );
            }

            if (!db.MedicationManufacturers.Any())
            {
                db.MedicationManufacturers.AddRange(
                    new MedicationManufacturer { Name = "Abbott" },
                    new MedicationManufacturer { Name = "Alcon" },
                    new MedicationManufacturer { Name = "Bayer" },
                    new MedicationManufacturer { Name = "Bosnalijek" },
                    new MedicationManufacturer { Name = "Galenika" },
                    new MedicationManufacturer { Name = "GlaxoSmithKline" },
                    new MedicationManufacturer { Name = "Hemofarm" },
                    new MedicationManufacturer { Name = "Krka" },
                    new MedicationManufacturer { Name = "Lek" },
                    new MedicationManufacturer { Name = "Novartis" },
                    new MedicationManufacturer { Name = "Sandoz" },
                    new MedicationManufacturer { Name = "Teva" }
                );
            }

            if (!db.MedicationTakeReasons.Any())
            {
                db.MedicationTakeReasons.AddRange(
                    new MedicationTakeReason { Name = "Redovna terapija", SortOrder = 1 },
                    new MedicationTakeReason { Name = "Bol", SortOrder = 2 },
                    new MedicationTakeReason { Name = "Temperatura", SortOrder = 3 },
                    new MedicationTakeReason { Name = "Alergija", SortOrder = 4 },
                    new MedicationTakeReason { Name = "Kontrola pritiska", SortOrder = 5 },
                    new MedicationTakeReason { Name = "Postoperativna terapija", SortOrder = 6 },
                    new MedicationTakeReason { Name = "Hitna intervencija", SortOrder = 7 },
                    new MedicationTakeReason { Name = "Respiratorna terapija", SortOrder = 8 },
                    new MedicationTakeReason { Name = "Gastrična zaštita", SortOrder = 9 },
                    new MedicationTakeReason { Name = "Drugo", SortOrder = 99 }
                );
            }

            db.SaveChanges();
        }

        private static bool ReadBooleanFlag(IConfiguration configuration, string key)
        {
            return bool.TryParse(configuration[key], out var value) && value;
        }

        private static void ResetData(AppDbContext db)
        {
            db.BrowserPushSubscriptions.RemoveRange(db.BrowserPushSubscriptions);
            db.Notifications.RemoveRange(db.Notifications);
            db.UserNotificationPreferences.RemoveRange(db.UserNotificationPreferences);
            db.MedicationHistories.RemoveRange(db.MedicationHistories);
            db.Logs.RemoveRange(db.Logs);
            db.Medications.RemoveRange(db.Medications);
            db.Users.RemoveRange(db.Users);

            db.MedicationCategories.RemoveRange(db.MedicationCategories);
            db.MedicationManufacturers.RemoveRange(db.MedicationManufacturers);
            db.MedicationUnits.RemoveRange(db.MedicationUnits);
            db.MedicationTakeReasons.RemoveRange(db.MedicationTakeReasons);

            db.SaveChanges();
        }

        private static Medication CreateMedication(
            IReadOnlyDictionary<string, int> categoryMap,
            IReadOnlyDictionary<string, int> manufacturerMap,
            IReadOnlyDictionary<string, int> unitMap,
            string name,
            string code,
            string category,
            string manufacturer,
            string strength,
            string unit,
            int stock,
            int minimumStock,
            bool requiresPrescription,
            string description)
        {
            return new Medication
            {
                Name = name,
                Code = code,
                Category = category,
                MedicationCategoryId = categoryMap.TryGetValue(category, out var categoryId) ? categoryId : null,
                Manufacturer = manufacturer,
                MedicationManufacturerId = manufacturerMap.TryGetValue(manufacturer, out var manufacturerId) ? manufacturerId : null,
                Strength = strength,
                Unit = unit,
                MedicationUnitId = unitMap.TryGetValue(unit, out var unitId) ? unitId : null,
                Stock = stock,
                MinimumStock = minimumStock,
                RequiresPrescription = requiresPrescription,
                Description = description
            };
        }

        private static (string Username, string MedicationName, int Quantity, string Reason, int DaysAgo) CreateHistory(
            string username,
            string medicationName,
            int quantity,
            string reason,
            int daysAgo)
        {
            return (username, medicationName, quantity, reason, daysAgo);
        }

        private static int? ResolveReasonId(IReadOnlyDictionary<string, int> reasonMap, string reason)
        {
            var normalizedReason = reason.ToLowerInvariant();

            if (normalizedReason.Contains("pain") || normalizedReason.Contains("bol") || normalizedReason.Contains("headache"))
                return TryGetReason(reasonMap, "Bol");

            if (normalizedReason.Contains("temperature") || normalizedReason.Contains("fever") || normalizedReason.Contains("temperatura"))
                return TryGetReason(reasonMap, "Temperatura");

            if (normalizedReason.Contains("allergy") || normalizedReason.Contains("alerg"))
                return TryGetReason(reasonMap, "Alergija");

            if (normalizedReason.Contains("post-op") || normalizedReason.Contains("postop") || normalizedReason.Contains("surgical"))
                return TryGetReason(reasonMap, "Postoperativna terapija");

            if (normalizedReason.Contains("emergency"))
                return TryGetReason(reasonMap, "Hitna intervencija");

            if (normalizedReason.Contains("asthma") || normalizedReason.Contains("pulmonary"))
                return TryGetReason(reasonMap, "Respiratorna terapija");

            if (normalizedReason.Contains("gastric"))
                return TryGetReason(reasonMap, "Gastrična zaštita");

            if (normalizedReason.Contains("routine"))
                return TryGetReason(reasonMap, "Redovna terapija");

            return TryGetReason(reasonMap, "Drugo");
        }

        private static int? TryGetReason(IReadOnlyDictionary<string, int> reasonMap, string reasonName)
        {
            return reasonMap.TryGetValue(reasonName, out var reasonId)
                ? reasonId
                : null;
        }

        private static Notification CreateNotification(
            int userId,
            string type,
            string title,
            string message,
            int daysAgo,
            bool isRead)
        {
            return new Notification
            {
                UserId = userId,
                Type = type,
                Title = title,
                Message = message,
                IsRead = isRead,
                CreatedAt = DateTime.UtcNow.AddDays(-daysAgo)
            };
        }

        private static Log CreateLog(string action, string username, string details, int daysAgo)
        {
            return new Log
            {
                Action = action,
                Username = username,
                Details = details,
                Timestamp = DateTime.UtcNow.AddDays(-daysAgo)
            };
        }
    }
}
