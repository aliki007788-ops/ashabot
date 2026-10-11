-- CreateTable
CREATE TABLE "cluster_outputs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clusterId" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "value" REAL,
    "unit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "metadata" TEXT,
    "botId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cluster_outputs_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cluster_outputs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bot_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "taskType" TEXT,
    "taskPayload" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bot_runs_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cluster_commands" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clusterId" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "command" TEXT NOT NULL,
    "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cluster_commands_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "cluster_outputs_clusterId_idx" ON "cluster_outputs"("clusterId");

-- CreateIndex
CREATE INDEX "cluster_outputs_organizationId_idx" ON "cluster_outputs"("organizationId");

-- CreateIndex
CREATE INDEX "cluster_outputs_createdAt_idx" ON "cluster_outputs"("createdAt");

-- CreateIndex
CREATE INDEX "cluster_outputs_type_idx" ON "cluster_outputs"("type");

-- CreateIndex
CREATE INDEX "bot_runs_botId_idx" ON "bot_runs"("botId");

-- CreateIndex
CREATE INDEX "bot_runs_status_idx" ON "bot_runs"("status");

-- CreateIndex
CREATE INDEX "bot_runs_createdAt_idx" ON "bot_runs"("createdAt");

-- CreateIndex
CREATE INDEX "cluster_commands_clusterId_idx" ON "cluster_commands"("clusterId");

-- CreateIndex
CREATE INDEX "cluster_commands_createdAt_idx" ON "cluster_commands"("createdAt");
