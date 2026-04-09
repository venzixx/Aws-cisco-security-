# Protected EC2 File

The secured AWS portal reads this file live from the EC2 instance through AWS Systems Manager:

- instance: `i-0196594d0ab6ada82`
- file path: `/opt/protected-source/secure-workload-note.txt`

## Update the file

You can rewrite it with this command from the project root:

```bash
aws ssm send-command \
  --region ap-south-1 \
  --instance-ids i-0196594d0ab6ada82 \
  --document-name AWS-RunShellScript \
  --parameters file://infra/collector/scripts/create-protected-file-commands.json
```

Then open the secured portal and visit the EC2 workload page after logging in.

## Remove the file

You can remove the workload note from the EC2 instance with:

```bash
aws ssm send-command \
  --region ap-south-1 \
  --instance-ids i-0196594d0ab6ada82 \
  --document-name AWS-RunShellScript \
  --parameters file://infra/collector/scripts/delete-protected-file-commands.json
```

After removal, the secured portal will show that no protected file is currently provisioned.
