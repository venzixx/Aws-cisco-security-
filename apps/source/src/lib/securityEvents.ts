import { randomUUID } from "node:crypto";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { SecurityEvent, SecurityEventType, Severity } from "@monitoring/shared";

import { sourceConfig } from "../config.js";

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: sourceConfig.awsRegion }));

interface CreateSecurityEventInput {
  eventType: SecurityEventType;
  severity: Severity;
  sourceIp: string;
  targetPath: string;
  status: SecurityEvent["status"];
  actor: string;
  summary: string;
  details: string;
}

export async function recordSecurityEvent(input: CreateSecurityEventInput) {
  const timestamp = new Date().toISOString();
  const event: SecurityEvent = {
    id: randomUUID(),
    timestamp,
    ...input
  };

  const ttl = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;

  await dynamoClient.send(
    new PutCommand({
      TableName: sourceConfig.dynamoDbEventsTable,
      Item: {
        partitionKey: "SECURITY_EVENTS",
        sortKey: `${timestamp}#${event.id}`,
        ttl,
        ...event
      }
    })
  );

  return event;
}
