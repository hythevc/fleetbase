<?php

declare(strict_types=1);

use Fleetbase\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

$tenant = getenv('FLEETBASE_MARKETING_COMPANY_UUID');
$companyUuid = is_string($tenant) && Str::isUuid($tenant) ? $tenant : null;
$table = 'fleetbase_marketing_demo_requests';
$noStore = ['Cache-Control' => 'private, no-store'];
$throttled = static fn (Request $request, array $headers) => response()->json(
    ['message' => 'Too many requests. Try again shortly.'], 429, $headers + $noStore
);

RateLimiter::for('fleetbase-marketing-demo', static fn (Request $request) => [
    Limit::perMinute(15)->by('ip:' . $request->ip())->response($throttled),
    Limit::perMinute(150)->by('all-demo-requests')->response($throttled),
]);
RateLimiter::for('fleetbase-marketing-operator', static fn (Request $request) => Limit::perMinute(30)
    ->by('operator:' . $request->ip())->response($throttled));

Route::post('/marketing/v1/demo-requests', static function (Request $request) use ($companyUuid, $table, $noStore) {
    if (! $request->isJson()) {
        return response()->json(['message' => 'Send a JSON request.'], 415, $noStore);
    }
    if (strlen($request->getContent()) > 8192) {
        return response()->json(['message' => 'The request is too large.'], 413, $noStore);
    }

    $input = $request->json()->all();
    $website = $input['website'] ?? null;
    if ($website !== null && (! is_string($website) || trim($website) !== '')) {
        return response()->json(['accepted' => true], 202, $noStore);
    }

    $validator = Validator::make($input, [
        'name' => ['required', 'string', 'max:120'],
        'email' => ['required', 'string', 'max:254', 'email:rfc'],
        'company' => ['nullable', 'string', 'max:160'],
        'message' => ['nullable', 'string', 'max:2000'],
    ]);
    if ($validator->fails()) {
        return response()->json([
            'message' => 'Check the highlighted fields.',
            'fields' => $validator->errors()->keys(),
        ], 422, $noStore);
    }
    if ($companyUuid === null) {
        return response()->json(['message' => 'Demo requests are temporarily unavailable.'], 503, $noStore);
    }

    $validated = $validator->validated();
    $lead = [
        'company_uuid' => $companyUuid,
        'name' => trim($validated['name']),
        'email' => Str::lower(trim($validated['email'])),
        'company' => $validated['company'] ?? null,
        'message' => $validated['message'] ?? null,
    ];
    $dedupe = hash('sha256', json_encode($lead, JSON_THROW_ON_ERROR));

    try {
        $db = DB::connection('mysql');
        if (! $db->table('companies')->where('uuid', $companyUuid)->whereNull('deleted_at')->exists()) {
            return response()->json(['message' => 'Demo requests are temporarily unavailable.'], 503, $noStore);
        }
        $db->table($table)->upsert(
            [$lead + ['dedupe_key' => $dedupe, 'created_at' => now('UTC')]],
            ['dedupe_key'],
            ['dedupe_key']
        );
    } catch (QueryException) {
        // Database exceptions may contain applicant details. Keep those out of logs and responses.
        return response()->json(['message' => 'Demo requests are temporarily unavailable.'], 503, $noStore);
    }

    return response()->json(['accepted' => true], 202, $noStore);
})->middleware('throttle:fleetbase-marketing-demo');

Route::get('/marketing/v1/demo-requests', static function (Request $request) use ($companyUuid, $table, $noStore) {
    $user = $request->bearerToken() ? $request->user('sanctum') : null;
    if (! $user instanceof User) {
        return response()->json(['message' => 'Unauthenticated.'], 401, $noStore);
    }
    if (! $user->isAdmin() || $companyUuid === null) {
        return response()->json(['message' => 'Forbidden.'], 403, $noStore);
    }

    $validator = Validator::make($request->query(), [
        'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
        'before' => ['sometimes', 'integer', 'min:1'],
    ]);
    if ($validator->fails()) {
        return response()->json(['message' => 'Invalid pagination.'], 422, $noStore);
    }
    $query = $validator->validated();
    $limit = (int) ($query['limit'] ?? 25);
    $db = DB::connection('mysql');

    try {
        $ownsCompany = $db->table('companies')->where('uuid', $companyUuid)
            ->where('owner_uuid', $user->uuid)->whereNull('deleted_at')->exists();
        if (! $ownsCompany) {
            return response()->json(['message' => 'Forbidden.'], 403, $noStore);
        }
        $leads = $db->table($table)->where('company_uuid', $companyUuid)
            ->when(isset($query['before']), static fn ($builder) => $builder->where('id', '<', (int) $query['before']))
            ->orderByDesc('id')->limit($limit + 1)
            ->get(['id', 'name', 'email', 'company', 'message', 'created_at']);
    } catch (QueryException) {
        return response()->json(['message' => 'Demo requests are temporarily unavailable.'], 503, $noStore);
    }
    $page = $leads->take($limit)->values();

    return response()->json([
        'data' => $page,
        'next_before' => $leads->count() > $limit ? $page->last()->id : null,
    ], 200, $noStore);
})->middleware('throttle:fleetbase-marketing-operator');
