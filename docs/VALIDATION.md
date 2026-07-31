# Validation status

Checks performed after the merge:

- TypeScript/TSX syntax parse: 36 files, 0 syntax errors.
- Java compiler parse phase: 76 Java files, 0 syntax errors.
- YAML parse: root Compose, backend Compose, and AWS Compose all parsed successfully.
- Relative frontend import check: no missing relative imports.
- Flyway versions: V1, V2, V3 indexes, V4 VNPay payment fields; no duplicate migration version.
- ZIP integrity: verified with `unzip -t`.

Full dependency-backed builds could not be completed in the sandbox:

- `npm ci` was blocked by the environment package mirror returning HTTP 404 for `zod-validation-error-4.0.2.tgz`.
- `./mvnw test` was blocked because the sandbox could not download Maven 3.9.15 from Maven Central.

Run the normal Docker build on the target machine/EC2 to perform the final dependency-backed build.
