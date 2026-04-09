import {
  GetCommandInvocationCommand,
  SendCommandCommand,
  SSMClient,
  type GetCommandInvocationCommandOutput
} from "@aws-sdk/client-ssm";

import { sourceConfig } from "../config.js";

const ssmClient = new SSMClient({ region: sourceConfig.awsRegion });

async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForInvocation(commandId: string) {
  let lastResponse: GetCommandInvocationCommandOutput | null = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sleep(1200);

    try {
      const response = await ssmClient.send(
        new GetCommandInvocationCommand({
          CommandId: commandId,
          InstanceId: sourceConfig.collectorInstanceId
        })
      );

      lastResponse = response;

      if (response.Status === "Success" || response.Status === "Failed" || response.Status === "TimedOut") {
        return response;
      }
    } catch (error) {
      if (attempt === 9) {
        throw error;
      }
    }
  }

  return lastResponse;
}

/**
 * Runs a shell command on the EC2 instance via SSM and returns the output.
 */
async function runSsmCommand(commandText: string, comment: string) {
  const command = await ssmClient.send(
    new SendCommandCommand({
      DocumentName: "AWS-RunShellScript",
      InstanceIds: [sourceConfig.collectorInstanceId],
      Comment: comment,
      Parameters: {
        commands: [commandText]
      }
    })
  );

  const commandId = command.Command?.CommandId;
  if (!commandId) {
    throw new Error(`Failed to create SSM command: ${comment}`);
  }

  const invocation = await waitForInvocation(commandId);

  if (!invocation || invocation.Status !== "Success") {
    const error = invocation?.StandardErrorContent?.trim() || `SSM Command execution failed: ${invocation?.Status}`;
    throw new Error(error);
  }

  return invocation.StandardOutputContent?.trim() ?? "";
}

/**
 * Lists files in a given directory.
 */
export async function listEc2Files(directory: string) {
  // -p adds a / to directories, -1 lists one per line
  const output = await runSsmCommand(
    `sudo ls -p "${directory}"`,
    `List files in ${directory}`
  );
  
  if (!output) return [];
  
  return output.split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(name => ({
      name: name.endsWith("/") ? name.slice(0, -1) : name,
      isDirectory: name.endsWith("/")
    }));
}

/**
 * Reads the content of a file.
 */
export async function readEc2File(filePath: string) {
  const output = await runSsmCommand(
    `if sudo test -f "${filePath}"; then sudo cat "${filePath}"; else echo "__FILE_NOT_FOUND__"; fi`,
    `Read file ${filePath}`
  );

  return output === "__FILE_NOT_FOUND__" ? null : output;
}

/**
 * Writes content to a file.
 */
export async function writeEc2File(filePath: string, content: string) {
  // Using tee with a heredoc to handle multi-line content and special characters
  // We use base64 encoding to avoid any shell escaping issues with the content
  const base64Content = Buffer.from(content).toString("base64");
  
  await runSsmCommand(
    `echo "${base64Content}" | base64 -d | sudo tee "${filePath}" > /dev/null`,
    `Write file ${filePath}`
  );
}

/**
 * Deletes a file.
 */
export async function deleteEc2File(filePath: string) {
  await runSsmCommand(
    `sudo rm -f "${filePath}"`,
    `Delete file ${filePath}`
  );
}

// Keep the old export for compatibility during migration if needed, 
// but refactor it to use the new generic function.
export async function readProtectedEc2File() {
  return readEc2File(sourceConfig.protectedFilePath);
}
