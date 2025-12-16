--liquibase formatted sql
--changeset securetag:002_worker_heartbeat
-- Migration: Add worker_heartbeat table for tracking worker health
-- Date: 2025-11-19
-- Description: Creates table to track periodic heartbeats from workers processing tasks

CREATE TABLE IF NOT EXISTS securetag.worker_heartbeat (
  id SERIAL PRIMARY KEY,
  worker_id VARCHAR(255) NOT NULL,
  task_id VARCHAR(255) NOT NULL,
  last_heartbeat TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_heartbeat_task ON securetag.worker_heartbeat(task_id);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeat_worker ON securetag.worker_heartbeat(worker_id);

COMMENT ON TABLE securetag.worker_heartbeat IS 'Tracks periodic heartbeats from workers to detect stuck/dead processes';
COMMENT ON COLUMN securetag.worker_heartbeat.worker_id IS 'Unique identifier for the worker (hostname + PID)';
COMMENT ON COLUMN securetag.worker_heartbeat.task_id IS 'ID of the task being processed';
COMMENT ON COLUMN securetag.worker_heartbeat.status IS 'Current status: processing, completed, failed, timeout';
