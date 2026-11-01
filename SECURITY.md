# Security policy

Noktiq is a development tool. Its UI requires DOM access and the source integration runs in a local development server. Keep the documented development guards in place and avoid exposing your development server to untrusted networks.

## Report privately

Use the repository's **Security → Advisories → Report a vulnerability** action when available. Include affected versions, a minimal reproduction, impact and suggested mitigation. Remove real credentials and personal data.

If the private-report button is unavailable, open an issue asking the maintainer for a private reporting channel **without describing the vulnerability or posting exploit details**. Wait for a private channel before sharing the report. No public email address or response-time guarantee has been established for this preview.

Do not test against other people's projects without permission. Do not publish credentials, private source code or vulnerability details in ordinary issues or pull requests.

## Supported versions

The current development-preview version is the maintenance target. Updates are made on the current development line; historical-version backports are not promised.

## Maintainer setup

Before public release, enable GitHub private vulnerability reporting in the repository settings and verify that the report button is available. This is an account/repository setting; adding this document alone does not enable it. See [GitHub's setup instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).
