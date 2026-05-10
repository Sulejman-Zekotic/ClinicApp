using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMedicationLookupsAndPaginationSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MedicationCategoryId",
                table: "Medications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MedicationUnitId",
                table: "Medications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MedicationTakeReasonId",
                table: "MedicationHistories",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReasonText",
                table: "MedicationHistories",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MedicationCategories",
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
                    table.PrimaryKey("PK_MedicationCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MedicationTakeReasons",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicationTakeReasons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MedicationUnits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Symbol = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicationUnits", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Medications_MedicationCategoryId",
                table: "Medications",
                column: "MedicationCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Medications_MedicationUnitId",
                table: "Medications",
                column: "MedicationUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationHistories_MedicationTakeReasonId",
                table: "MedicationHistories",
                column: "MedicationTakeReasonId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationCategories_Name",
                table: "MedicationCategories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MedicationTakeReasons_Name",
                table: "MedicationTakeReasons",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MedicationUnits_Symbol",
                table: "MedicationUnits",
                column: "Symbol",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_MedicationHistories_MedicationTakeReasons_MedicationTakeReasonId",
                table: "MedicationHistories",
                column: "MedicationTakeReasonId",
                principalTable: "MedicationTakeReasons",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Medications_MedicationCategories_MedicationCategoryId",
                table: "Medications",
                column: "MedicationCategoryId",
                principalTable: "MedicationCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Medications_MedicationUnits_MedicationUnitId",
                table: "Medications",
                column: "MedicationUnitId",
                principalTable: "MedicationUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MedicationHistories_MedicationTakeReasons_MedicationTakeReasonId",
                table: "MedicationHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_Medications_MedicationCategories_MedicationCategoryId",
                table: "Medications");

            migrationBuilder.DropForeignKey(
                name: "FK_Medications_MedicationUnits_MedicationUnitId",
                table: "Medications");

            migrationBuilder.DropTable(
                name: "MedicationCategories");

            migrationBuilder.DropTable(
                name: "MedicationTakeReasons");

            migrationBuilder.DropTable(
                name: "MedicationUnits");

            migrationBuilder.DropIndex(
                name: "IX_Medications_MedicationCategoryId",
                table: "Medications");

            migrationBuilder.DropIndex(
                name: "IX_Medications_MedicationUnitId",
                table: "Medications");

            migrationBuilder.DropIndex(
                name: "IX_MedicationHistories_MedicationTakeReasonId",
                table: "MedicationHistories");

            migrationBuilder.DropColumn(
                name: "MedicationCategoryId",
                table: "Medications");

            migrationBuilder.DropColumn(
                name: "MedicationUnitId",
                table: "Medications");

            migrationBuilder.DropColumn(
                name: "MedicationTakeReasonId",
                table: "MedicationHistories");

            migrationBuilder.DropColumn(
                name: "ReasonText",
                table: "MedicationHistories");
        }
    }
}
