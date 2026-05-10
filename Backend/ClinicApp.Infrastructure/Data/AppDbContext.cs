using ClinicApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicApp.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<MedicationCategory>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Name)
                    .IsRequired()
                    .HasMaxLength(120);

                entity.Property(x => x.Description)
                    .HasMaxLength(500);

                entity.HasIndex(x => x.Name)
                    .IsUnique();
            });

            builder.Entity<MedicationUnit>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Name)
                    .IsRequired()
                    .HasMaxLength(80);

                entity.Property(x => x.Symbol)
                    .IsRequired()
                    .HasMaxLength(30);

                entity.HasIndex(x => x.Symbol)
                    .IsUnique();
            });

            builder.Entity<MedicationManufacturer>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Name)
                    .IsRequired()
                    .HasMaxLength(120);

                entity.Property(x => x.Description)
                    .HasMaxLength(500);

                entity.HasIndex(x => x.Name)
                    .IsUnique();
            });

            builder.Entity<MedicationTakeReason>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Name)
                    .IsRequired()
                    .HasMaxLength(120);

                entity.Property(x => x.Description)
                    .HasMaxLength(500);

                entity.HasIndex(x => x.Name)
                    .IsUnique();
            });

            builder.Entity<Medication>()
                .HasOne(x => x.MedicationCategory)
                .WithMany(x => x.Medications)
                .HasForeignKey(x => x.MedicationCategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Medication>()
                .HasOne(x => x.MedicationUnit)
                .WithMany(x => x.Medications)
                .HasForeignKey(x => x.MedicationUnitId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Medication>()
                .HasOne(x => x.MedicationManufacturer)
                .WithMany(x => x.Medications)
                .HasForeignKey(x => x.MedicationManufacturerId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<MedicationHistory>()
                .HasOne(x => x.MedicationTakeReason)
                .WithMany()
                .HasForeignKey(x => x.MedicationTakeReasonId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<MedicationHistory>()
                .Property(x => x.ReasonText)
                .HasMaxLength(500);
        }
        public DbSet<User> Users { get; set; }
        public DbSet<Medication> Medications { get; set; }
        public DbSet<Log> Logs { get; set; }
        public DbSet<MedicationHistory> MedicationHistories { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<UserNotificationPreference> UserNotificationPreferences { get; set; }
        public DbSet<BrowserPushSubscription> BrowserPushSubscriptions { get; set; }
        public DbSet<MedicationCategory> MedicationCategories => Set<MedicationCategory>();
        public DbSet<MedicationManufacturer> MedicationManufacturers => Set<MedicationManufacturer>();
        public DbSet<MedicationUnit> MedicationUnits => Set<MedicationUnit>();
        public DbSet<MedicationTakeReason> MedicationTakeReasons => Set<MedicationTakeReason>();
    }
}
