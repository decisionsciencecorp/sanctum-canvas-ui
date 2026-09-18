<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Http;

use PHPUnit\Framework\TestCase;
use Sanctum\Canvas\Php\Http\Authenticator;
use Sanctum\Canvas\Php\Http\Csrf;
use Sanctum\Canvas\Php\Http\ErrorRedactor;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\RateLimiter;
use Sanctum\Canvas\Php\Http\Request;

final class HttpKernelTest extends TestCase
{
    public function testAuthenticatorAcceptsBearerAndHeader(): void
    {
        $auth = new Authenticator([
            'tok-a' => ['ownerId' => 'o1', 'projectId' => 'p1'],
        ]);
        $ctx = $auth->authenticate(['authorization' => 'Bearer tok-a']);
        $this->assertSame('o1', $ctx->ownerId);
        $this->assertSame('p1', $ctx->projectId);

        $ctx2 = $auth->authenticate(['x-canvas-auth' => 'tok-a']);
        $this->assertSame('o1', $ctx2->ownerId);
    }

    public function testAuthenticatorRejectsMissing(): void
    {
        $auth = new Authenticator(['tok-a' => ['ownerId' => 'o1', 'projectId' => 'p1']]);
        $this->expectException(HttpException::class);
        $auth->authenticate([]);
    }

    public function testCsrfRoundTrip(): void
    {
        $csrf = new Csrf('secret');
        $token = $csrf->mint('owner:project');
        $this->assertTrue($csrf->validate('owner:project', $token));
        $this->assertFalse($csrf->validate('other:scope', $token));
        $this->assertFalse($csrf->validate('owner:project', 'bad'));
    }

    public function testErrorRedactorStripsSecrets(): void
    {
        $r = new ErrorRedactor();
        $msg = $r->redact('failed Bearer sk-abc123456789 and VENICE_API_KEY=supersecret');
        $this->assertStringNotContainsString('sk-abc', $msg);
        $this->assertStringNotContainsString('supersecret', $msg);
        $this->assertStringContainsString('[REDACTED]', $msg);
    }

    public function testRateLimiterTrips(): void
    {
        $rl = new RateLimiter(null, 2, 60);
        $rl->hit('k');
        $rl->hit('k');
        $this->expectException(HttpException::class);
        $rl->hit('k');
    }

    public function testRequestJsonBody(): void
    {
        $req = new Request(
            ['REQUEST_METHOD' => 'POST', 'HTTP_X_CANVAS_AUTH' => 't', 'CONTENT_TYPE' => 'application/json'],
            '{"a":1}',
            []
        );
        $this->assertSame('POST', $req->method());
        $this->assertSame('t', $req->headers()['x-canvas-auth']);
        $this->assertSame(['a' => 1], $req->jsonBody());
    }

    public function testRequestRejectsHugeBody(): void
    {
        $req = new Request(['REQUEST_METHOD' => 'POST'], str_repeat('x', 100));
        $this->expectException(HttpException::class);
        $req->jsonBody(10);
    }
}
