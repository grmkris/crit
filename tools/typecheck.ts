/**
 * Typecheck with effect-tsrs: TypeScript's diagnostics and Effect's, at the severities each tsconfig sets. Errors,
 * warnings and unused `@effect-diagnostics` directives fail the run. It checks the root project and the template's.
 */
import { Schema } from 'effect'
import path from 'node:path'

const Diagnostic = Schema.Struct({
  severity: Schema.String,
  message: Schema.String,
  code: Schema.Number,
  name: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
  line: Schema.optional(Schema.Number),
})
const Output = Schema.Struct({
  diagnostics: Schema.Array(Diagnostic),
  typescriptDiagnostics: Schema.Array(Diagnostic),
  summary: Schema.Struct({ filesChecked: Schema.Number, filesWithoutPlugin: Schema.optional(Schema.Number) }),
})
const decode = Schema.decodeUnknownSync(Schema.fromJsonString(Output))

const root = path.join(import.meta.dir, '..')
const UNUSED_DIRECTIVE = 377000

const check = async (project: string): Promise<number> => {
  const child = Bun.spawn(
    [
      path.join(root, 'node_modules', '.bin', 'effect-tsrs'),
      'diagnostics',
      '-p',
      path.join(root, project),
      '--type-check',
      '--format',
      'json',
    ],
    { cwd: root, stdout: 'pipe', stderr: 'pipe' },
  )
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (code !== 0 && code !== 1) throw new Error(`effect-tsrs did not complete for ${project} (${code}): ${stderr}`)
  const output = decode(stdout)
  const findings = [...output.typescriptDiagnostics, ...output.diagnostics].filter(
    (item) => item.severity === 'error' || item.severity === 'warning' || item.code === UNUSED_DIRECTIVE,
  )
  for (const finding of findings)
    console.error(`${finding.file ?? project}:${finding.line ?? 0} ${finding.name ?? finding.code}: ${finding.message}`)
  if (output.summary.filesChecked === 0 || (output.summary.filesWithoutPlugin ?? 0) !== 0)
    throw new Error(`effect-tsrs coverage is incomplete for ${project}`)
  console.log(`effect-tsrs ${project}: ${output.summary.filesChecked} files; ${findings.length} findings`)
  return findings.length + (code === 0 ? 0 : 1)
}

let failures = 0
for (const project of ['tsconfig.json', 'template/tsconfig.json']) failures += await check(project)
process.exit(failures === 0 ? 0 : 1)
