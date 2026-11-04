import { tag } from '@g2p/cmder'
import type { AppParameters } from '../legacy/parse-args'
import { serviceExplorer } from '../legacy/serviceExplorer'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'

const apps: string[] = tag('apps', 'a', 'Service to generate a Dockerfile for (repeatable)') ?? []

function packagePath(value: string, root: string, appDirectory: string): string {
  if (isAbsolute(value)) {
    throw new Error(`Service path "${value}" must be relative to the repository.`)
  }

  const segments = value.split(/[\\/]/)
  const globIndex = segments.findIndex(segment => /[*?[\]{}]/.test(segment))
  const path = (globIndex < 0 ? segments : segments.slice(0, globIndex)).join('/')

  if (!path) {
    throw new Error(`Service path "${value}" must include a directory before its glob pattern.`)
  }

  const resolvedPath =
    path.startsWith('packages/') || path.startsWith('./packages/')
      ? resolve(root, path)
      : path.startsWith('.') || path.startsWith('..')
        ? resolve(appDirectory, path)
        : resolve(root, 'packages', path)
  const relativePath = relative(root, resolvedPath)

  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`Service path "${value}" must refer to a workspace package inside the repository.`)
  }

  return relativePath.replaceAll('\\', '/')
}

function renderDockerfile(appPath: string, dependencyPaths: string[], family?: ParsedService['family']): string {
  const packagePaths = [appPath, ...dependencyPaths]
  const manifestCopies = packagePaths.map(path => `COPY ${path}/package.json ./${path}/package.json`).join('\n')
  const directoryCopies = packagePaths.map(path => `COPY ${path}/ ./${path}/`).join('\n')
  const nodeModulesCopy = family === 'ejs' ? 'COPY --from=builder /app/node_modules /app/node_modules\n' : ''

  return `# ---------- Stage 1: Build ----------
FROM oven/bun:1.4.3-slim AS builder

ENV LEFTHOOK=0
ENV CI=true

WORKDIR /app

COPY package.json bun.lock .npmrc ./
${manifestCopies}

RUN --mount=type=secret,id=GH_TOKEN,env=GH_TOKEN,required=true bun ci

${directoryCopies}

ENV NODE_ENV=production
WORKDIR /app/${appPath}
RUN bun run build

# ---------- Stage 2: Runtime ----------
FROM ghcr.io/gerard2perez/yesjo-bakery/bun-core:latest

WORKDIR /app

COPY --from=builder /app/${appPath}/.output /app/.output
COPY --from=builder /app/${appPath}/package.json /app/package.json
${nodeModulesCopy}

EXPOSE 3000
CMD ["bun", "start"]
`
}

export default async function generateDockerfiles() {
  const root = process.cwd()
  const services: ParsedService[] = []

  for await (const service of serviceExplorer({} as any)) {
    services.push(service)
  }

  if (services.length === 0) {
    throw new Error(`No service.yaml files found under "${resolve(root, 'packages')}".`)
  }

  const selected = apps.length
    ? services.filter(service => apps.includes(service.name) || apps.includes(basename(service.path)))
    : services

  const unmatchedApps = apps.filter(
    app => !services.some(service => app === service.name || app === basename(service.path))
  )
  if (unmatchedApps.length > 0) {
    throw new Error(`Unknown app(s): ${unmatchedApps.join(', ')}.`)
  }

  for (const service of selected) {
    const appDirectory = service.path
    const appPath = relative(root, appDirectory).replaceAll('\\', '/')
    const paths = service.paths ?? []
    const dependencyPaths = [...new Set(paths.map(path => packagePath(path, root, appDirectory)))].filter(
      path => path !== appPath
    )

    await Bun.write(resolve(appDirectory, 'Dockerfile'), renderDockerfile(appPath, dependencyPaths, service.family))
  }
}
