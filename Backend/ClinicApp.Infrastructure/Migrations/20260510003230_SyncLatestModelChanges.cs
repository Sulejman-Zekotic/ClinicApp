using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SyncLatestModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MedicationManufacturerId",
                table: "Medications",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MedicationManufacturers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicationManufacturers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Medications_MedicationManufacturerId",
                table: "Medications",
                column: "MedicationManufacturerId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationManufacturers_Name",
                table: "MedicationManufacturers",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Medications_MedicationManufacturers_MedicationManufacturerId",
                table: "Medications",
                column: "MedicationManufacturerId",
                principalTable: "MedicationManufacturers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Medications_MedicationManufacturers_MedicationManufacturerId",
                table: "Medications");

            migrationBuilder.DropTable(
                name: "MedicationManufacturers");

            migrationBuilder.DropIndex(
                name: "IX_Medications_MedicationManufacturerId",
                table: "Medications");

            migrationBuilder.DropColumn(
                name: "MedicationManufacturerId",
                table: "Medications");
        }
    }
}
