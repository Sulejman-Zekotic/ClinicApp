using System.Net;
using System.Text.Json;

namespace ClinicApp.API.Middleware
{
    public class ErrorHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<ErrorHandlingMiddleware> _logger;

        public ErrorHandlingMiddleware(
            RequestDelegate next,
            IWebHostEnvironment environment,
            ILogger<ErrorHandlingMiddleware> logger)
        {
            _next = next;
            _environment = environment;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unhandled exception. Path: {Path}, Method: {Method}",
                    context.Request.Path,
                    context.Request.Method
                );

                context.Response.ContentType = "application/json";
                context.Response.StatusCode = ex switch
                {
                    UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
                    InvalidOperationException => (int)HttpStatusCode.BadRequest,
                    ArgumentException => (int)HttpStatusCode.BadRequest,
                    KeyNotFoundException => (int)HttpStatusCode.NotFound,
                    _ => (int)HttpStatusCode.InternalServerError
                };

                object response;

                if (_environment.IsDevelopment())
                {
                    response = new
                    {
                        message = ResolveMessage(ex),
                        error = ex.Message,
                        path = context.Request.Path.Value,
                        method = context.Request.Method
                    };
                }
                else
                {
                    response = new
                    {
                        message = ResolveMessage(ex)
                    };
                }

                var json = JsonSerializer.Serialize(response);
                await context.Response.WriteAsync(json);
            }
        }

        private static string ResolveMessage(Exception ex)
        {
            return ex switch
            {
                UnauthorizedAccessException => ex.Message,
                InvalidOperationException => ex.Message,
                ArgumentException => ex.Message,
                KeyNotFoundException => ex.Message,
                _ => "Doslo je do neocekivane greske."
            };
        }
    }
}
