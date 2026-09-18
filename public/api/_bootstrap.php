<?php
declare(strict_types=1);

/**
 * Shared bootstrap for public/api/*.php entrypoints.
 */

$autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
if (!is_file($autoload)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo '{"error":{"code":"autoload_missing","message":"Run composer install"}}';
    exit(1);
}
require_once $autoload;

use Sanctum\Canvas\Php\Config\Env;
use Sanctum\Canvas\Php\Http\Authenticator;
use Sanctum\Canvas\Php\Http\Csrf;
use Sanctum\Canvas\Php\Http\ErrorRedactor;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\JsonResponse;
use Sanctum\Canvas\Php\Http\RateLimiter;
use Sanctum\Canvas\Php\Http\Request;
use Sanctum\Canvas\Php\Inference\ChatService;
use Sanctum\Canvas\Php\Inference\LibraryPromptInjector;
use Sanctum\Canvas\Php\Inference\ProviderFactory;
use Sanctum\Canvas\Php\Inference\StreamFormatter;
use Sanctum\Canvas\Php\Storage\ProgramController;
use Sanctum\Canvas\Php\Storage\StoreFactory;
use Sanctum\Canvas\Php\Tools\ToolDispatcher;
use Sanctum\Canvas\Php\Tools\ToolRegistry;

/**
 * @return array{
 *   request: Request,
 *   auth: Authenticator,
 *   csrf: Csrf,
 *   redactor: ErrorRedactor,
 *   rate: RateLimiter,
 *   tools: ToolDispatcher,
 *   programs: ProgramController,
 *   providers: ProviderFactory,
 *   injector: LibraryPromptInjector
 * }
 */
function canvas_api_services(?Request $request = null): array
{
    $storage = Env::storagePath();
    $rateDir = $storage . '/rate';
    return [
        'request' => $request ?? new Request(),
        'auth' => new Authenticator(),
        'csrf' => new Csrf(Env::get('CANVAS_CSRF_SECRET', 'canvas-csrf-dev') ?? 'canvas-csrf-dev'),
        'redactor' => new ErrorRedactor(),
        'rate' => new RateLimiter($rateDir, Env::int('CANVAS_RATE_MAX', 120), 60),
        'tools' => new ToolDispatcher(ToolRegistry::labDefaults()),
        'programs' => new ProgramController(StoreFactory::make()),
        'providers' => new ProviderFactory(),
        'injector' => LibraryPromptInjector::fromEnv(),
    ];
}

function canvas_api_handle(\Throwable $e, ErrorRedactor $redactor): void
{
    if ($e instanceof HttpException) {
        JsonResponse::error($e, $redactor);
        return;
    }
    JsonResponse::send(
        $redactor->publicError('internal_error', 'Internal server error', 500),
        500
    );
}
