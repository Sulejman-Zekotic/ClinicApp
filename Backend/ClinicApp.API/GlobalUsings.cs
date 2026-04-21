global using Microsoft.AspNetCore.Mvc;
global using Microsoft.AspNetCore.Authorization;
global using Microsoft.AspNetCore.RateLimiting;

global using ClinicApp.Application.DTOs;
global using ClinicApp.Application.Interfaces;
global using ClinicApp.Domain.Entities;
global using ClinicApp.Infrastructure.Data;
global using ClinicApp.Infrastructure.Helpers;
global using System.Security.Claims;
global using System.Text;
global using System.Security.Cryptography;

global using Microsoft.IdentityModel.Tokens;
global using System.IdentityModel.Tokens.Jwt;
global using Microsoft.AspNetCore.WebUtilities;