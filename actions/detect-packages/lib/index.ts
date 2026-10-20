import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as YAML from 'yaml'

function main(): void {
  const basePath = core.getInput('path') || 'packages'
  const absPath = path.resolve(basePath)

  const entries: { name: string; image_env: string; filters: string[]; test_command: string }[] = []

  for (const dir of fs.readdirSync(absPath, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue

    const yamlPath = path.join(absPath, dir.name, 'service.yaml')
    if (!fs.existsSync(yamlPath)) continue

    const config = YAML.parse(fs.readFileSync(yamlPath, 'utf-8'))
    config.filters = [`${basePath}/${dir.name}`, ...(config.filters ?? [])]
    entries.push({
      name: config.name,
      image_env: `${config.name}_image`.toUpperCase(),
      filters: config.filters,
      test_command: config.test_command || 'bun run test',
    })
  }
  core.setOutput('services', JSON.stringify(entries))
}

main()
