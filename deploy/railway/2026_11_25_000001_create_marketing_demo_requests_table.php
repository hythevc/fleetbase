<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    protected $connection = 'mysql';

    public function up(): void
    {
        Schema::connection($this->getConnection())->create('fleetbase_marketing_demo_requests', function (Blueprint $table) {
            $table->id();
            $table->uuid('company_uuid');
            $table->string('name', 120);
            $table->string('email', 254);
            $table->string('company', 160)->nullable();
            $table->text('message')->nullable();
            $table->char('dedupe_key', 64)->unique();
            $table->timestamp('created_at');
            $table->index(['company_uuid', 'id']);
            $table->foreign('company_uuid')->references('uuid')->on('companies')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('fleetbase_marketing_demo_requests');
    }
};
