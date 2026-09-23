# Deploy

Two independent deployments live in this folder. They serve different
purposes and share nothing - pick the one you actually need.

| Folder                            | Domain                    | Purpose                                                   |
|-----------------------------------|---------------------------|-----------------------------------------------------------|
| [`nginx-prod/`](nginx-prod/)      | `trem-explorer.org.uk`    | **Production.** Static bundle served by nginx on the client's server. |
| [`aws-test/`](aws-test/)          | `trem-explorer.nicksynes.com` | Test setup. AWS SAM + S3 + CloudFront on Nick's account. |

Which one should I use?
- **Deploying a new build for the client** → `nginx-prod/prod-deployment.md`.
- **Rebuilding the test site (or investigating how AWS SAM is wired up here)**
  → `aws-test/DEPLOYMENT.md`.

The two setups do not interact. Changing one has no effect on the other.