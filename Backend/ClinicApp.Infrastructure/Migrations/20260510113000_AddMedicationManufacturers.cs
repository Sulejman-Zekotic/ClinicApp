using ClinicApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicApp.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260510113000_AddMedicationManufacturers")]
    public partial class AddMedicationManufacturers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Medications', 'MedicationManufacturerId') IS NULL
                BEGIN
                    ALTER TABLE [Medications] ADD [MedicationManufacturerId] int NULL;
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[MedicationManufacturers]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [MedicationManufacturers]
                    (
                        [Id] int NOT NULL IDENTITY(1,1),
                        [Name] nvarchar(120) NOT NULL,
                        [Description] nvarchar(500) NULL,
                        [IsActive] bit NOT NULL,
                        CONSTRAINT [PK_MedicationManufacturers] PRIMARY KEY ([Id])
                    );
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = N'IX_Medications_MedicationManufacturerId'
                      AND object_id = OBJECT_ID(N'[Medications]')
                )
                BEGIN
                    CREATE INDEX [IX_Medications_MedicationManufacturerId]
                    ON [Medications] ([MedicationManufacturerId]);
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = N'IX_MedicationManufacturers_Name'
                      AND object_id = OBJECT_ID(N'[MedicationManufacturers]')
                )
                BEGIN
                    CREATE UNIQUE INDEX [IX_MedicationManufacturers_Name]
                    ON [MedicationManufacturers] ([Name]);
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.foreign_keys
                    WHERE name = N'FK_Medications_MedicationManufacturers_MedicationManufacturerId'
                )
                BEGIN
                    ALTER TABLE [Medications]
                    ADD CONSTRAINT [FK_Medications_MedicationManufacturers_MedicationManufacturerId]
                    FOREIGN KEY ([MedicationManufacturerId])
                    REFERENCES [MedicationManufacturers] ([Id])
                    ON DELETE SET NULL;
                END
                """
            );

            migrationBuilder.Sql(
                """
                INSERT INTO [MedicationManufacturers] ([Name], [Description], [IsActive])
                SELECT DISTINCT LTRIM(RTRIM(m.[Manufacturer])), NULL, 1
                FROM [Medications] m
                WHERE m.[Manufacturer] IS NOT NULL
                  AND LTRIM(RTRIM(m.[Manufacturer])) <> ''
                  AND NOT EXISTS (
                    SELECT 1
                    FROM [MedicationManufacturers] mm
                    WHERE mm.[Name] = LTRIM(RTRIM(m.[Manufacturer]))
                  );
                """
            );

            migrationBuilder.Sql(
                """
                UPDATE m
                SET m.[MedicationManufacturerId] = mm.[Id]
                FROM [Medications] m
                INNER JOIN [MedicationManufacturers] mm
                    ON mm.[Name] = LTRIM(RTRIM(m.[Manufacturer]))
                WHERE m.[MedicationManufacturerId] IS NULL
                  AND m.[Manufacturer] IS NOT NULL
                  AND LTRIM(RTRIM(m.[Manufacturer])) <> '';
                """
            );
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF EXISTS (
                    SELECT 1
                    FROM sys.foreign_keys
                    WHERE name = N'FK_Medications_MedicationManufacturers_MedicationManufacturerId'
                )
                BEGIN
                    ALTER TABLE [Medications]
                    DROP CONSTRAINT [FK_Medications_MedicationManufacturers_MedicationManufacturerId];
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = N'IX_Medications_MedicationManufacturerId'
                      AND object_id = OBJECT_ID(N'[Medications]')
                )
                BEGIN
                    DROP INDEX [IX_Medications_MedicationManufacturerId] ON [Medications];
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Medications', 'MedicationManufacturerId') IS NOT NULL
                BEGIN
                    ALTER TABLE [Medications] DROP COLUMN [MedicationManufacturerId];
                END
                """
            );

            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[MedicationManufacturers]', N'U') IS NOT NULL
                BEGIN
                    DROP TABLE [MedicationManufacturers];
                END
                """
            );
        }
    }
}
