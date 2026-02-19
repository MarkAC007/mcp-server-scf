# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue**
2. Email security concerns to the repository owner via GitHub's private vulnerability reporting
3. Go to the [Security tab](https://github.com/MarkAC007/mcp-server-scf/security) and click "Report a vulnerability"

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 7 days
- **Fix:** Critical vulnerabilities patched within 14 days

## Security Measures

This project implements:

- **Secret scanning:** Gitleaks runs on every commit and PR
- **SAST:** Semgrep static analysis on every PR
- **CodeQL:** GitHub's semantic code analysis (weekly + PRs)
- **Dependency auditing:** npm audit + Dependabot automated updates
- **Branch protection:** Required PR reviews before merge to main
- **No credential logging:** API keys are never included in logs or error output
- **HTTPS only:** All API communication uses TLS
- **Rate limiting:** Server-side rate limits prevent abuse

## Dependency Management

- Dependabot monitors for vulnerable dependencies
- Production dependency updates reviewed individually
- Dev dependency patches grouped and auto-merged when CI passes
