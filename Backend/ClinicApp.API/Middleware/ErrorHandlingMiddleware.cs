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
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

                object response;

                if (_environment.IsDevelopment())
                {
                    response = new
                    {
                        message = "An unexpected error occurred.",
                        error = ex.Message,
                        path = context.Request.Path.Value,
                        method = context.Request.Method
                    };
                }
                else
                {
                    response = new
                    {
                        message = "An unexpected error occurred."
                    };
                }

                var json = JsonSerializer.Serialize(response);
                await context.Response.WriteAsync(json);
            }
        }
    }
}