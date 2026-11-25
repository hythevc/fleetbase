<?php

declare(strict_types=1);

// Apply the Railway-only deployment overlay to Fleetbase's pinned release image.
// Refuse to start against an unexpected upstream source layout.
function replaceInReleaseFile(string $path, string $original, string $replacement): void
{
    $source = file_get_contents($path);
    if ($source === false) {
        throw new RuntimeException("Cannot read {$path}.");
    }
    if (str_contains($source, $replacement)) {
        return;
    }
    if (substr_count($source, $original) !== 1) {
        throw new RuntimeException("Unexpected Fleetbase release contents in {$path}.");
    }
    if (file_put_contents($path, str_replace($original, $replacement, $source), LOCK_EX) === false) {
        throw new RuntimeException("Cannot update {$path}.");
    }
}

$request = 'vendor/fleetbase/core-api/src/Http/Requests/OnboardRequest.php';
replaceInReleaseFile($request, <<<'ORIGINAL'
    public function authorize()
    {
        return true;
    }
ORIGINAL, <<<'REPLACEMENT'
    public function authorize()
    {
        if (\Fleetbase\Models\User::exists()) {
            return filter_var(getenv('FLEETBASE_PUBLIC_SIGNUPS'), FILTER_VALIDATE_BOOLEAN);
        }

        return $this->hasInstanceSetupToken();
    }

    public function hasInstanceSetupToken(): bool
    {
        $expected = getenv('FLEETBASE_SETUP_TOKEN');
        $provided = $this->header('X-Fleetbase-Setup-Token');

        return is_string($expected) && strlen($expected) >= 32
            && is_string($provided) && hash_equals($expected, $provided);
    }
REPLACEMENT);

if (is_file('routes/railway-marketing.php')) {
    replaceInReleaseFile('app/Providers/RouteServiceProvider.php', <<<'ORIGINAL'
            function () {
                Route::get(
ORIGINAL, <<<'REPLACEMENT'
            function () {
                require base_path('routes/railway-marketing.php');

                Route::get(
REPLACEMENT);
}

$legacyRequest = 'vendor/fleetbase/core-api/src/Http/Requests/SignUpRequest.php';
replaceInReleaseFile($legacyRequest, <<<'ORIGINAL'
    public function authorize()
    {
        return true;
    }
ORIGINAL, <<<'REPLACEMENT'
    public function authorize()
    {
        return filter_var(getenv('FLEETBASE_PUBLIC_SIGNUPS'), FILTER_VALIDATE_BOOLEAN)
            && \Fleetbase\Models\User::exists();
    }
REPLACEMENT);

$controller = 'vendor/fleetbase/core-api/src/Http/Controllers/Internal/v1/OnboardController.php';
replaceInReleaseFile($controller, <<<'ORIGINAL'
    public function createAccount(OnboardRequest $request)
    {
        // if first user make admin
        $isAdmin = !User::exists();
ORIGINAL, <<<'REPLACEMENT'
    public function createAccount(OnboardRequest $request)
    {
        if (User::exists()) {
            abort_unless(filter_var(getenv('FLEETBASE_PUBLIC_SIGNUPS'), FILTER_VALIDATE_BOOLEAN), 403);

            return $this->createAuthorizedAccount($request, false);
        }

        return \Illuminate\Support\Facades\Cache::lock('fleetbase-instance-owner-claim', 120)->block(10, function () use ($request) {
            $isAdmin = !User::exists();
            abort_unless($isAdmin ? $request->hasInstanceSetupToken() : filter_var(getenv('FLEETBASE_PUBLIC_SIGNUPS'), FILTER_VALIDATE_BOOLEAN), 403);

            return $this->createAuthorizedAccount($request, $isAdmin);
        });
    }

    private function createAuthorizedAccount(OnboardRequest $request, bool $isAdmin)
    {
REPLACEMENT);
