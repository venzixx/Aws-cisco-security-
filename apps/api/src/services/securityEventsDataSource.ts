import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { SecurityEvent } from "@monitoring/shared";

import { env } from "../config/env.js";

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.AWS_REGION }));

export async function fetchSecurityEvents(limit = 50): Promise<SecurityEvent[]> {
  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: env.DYNAMODB_EVENTS_TABLE,
      KeyConditionExpression: "partitionKey = :partitionKey",
      ExpressionAttributeValues: {
        ":partitionKey": "SECURITY_EVENTS"
      },
      ScanIndexForward: false,
      Limit: limit
    })
  );

  return (response.Items ?? []).map((item) => ({
    id: String(item.id),
    timestamp: String(item.timestamp),
    eventType: item.eventType as SecurityEvent["eventType"],
    severity: item.severity as SecurityEvent["severity"],
    sourceIp: String(item.sourceIp),
    targetPath: String(item.targetPath),
    status: item.status as SecurityEvent["status"],
    actor: String(item.actor),
    summary: String(item.summary),
    details: String(item.details)
  }));
}
