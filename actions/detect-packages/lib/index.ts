import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as YAML from 'yaml'

function main(): void {
  const basePath = core.getInput('path') || 'packages'
  const absPath = path.resolve(basePath)

  const entries: { name: string; image_env: string; filters: string[]; test_command: string }[] = []
  const filters = {} as Record<string, string[]>

  for (const dir of fs.readdirSync(absPath, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue

    const yamlPath = path.join(absPath, dir.name, 'service.yaml')
    if (!fs.existsSync(yamlPath)) continue

    const config = YAML.parse(fs.readFileSync(yamlPath, 'utf-8'))
    if (config.disable) continue

    config.paths = [`${basePath}/${dir.name}/**`, ...(config.paths ?? [])]
    entries.push({
      name: config.name,
      image_env: `${config.name}_image`.toUpperCase().replace('-', '_'),
      filters: config.paths,
      test_command: config.test_command || 'bun run test',
    })
    filters[config.name] = config.paths
  }
  core.setOutput('services', JSON.stringify(entries))
  core.setOutput('filters', JSON.stringify(filters))
  console.log(JSON.stringify(filters, null, 2))
}

main()
