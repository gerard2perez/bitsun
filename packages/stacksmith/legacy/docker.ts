import { getFileName, getFilePath } from './get-filename'
import type { DefinitionsService } from 'compose-spec-schema/lib/type'
declare global {
  type Service = DefinitionsService
}

export function dockerCommons(parameters: AppParameters) {
  const uid = `${parameters.name}-${parameters.env}`
  const envFilePath = getFilePath('.env', parameters)
  const envFileName = getFileName('.env', parameters)
  const composeFilePath = getFilePath('compose.yaml', parameters)
  const composeFile = <T>(data: T) =>
    ({
      name: uid,
      ...data,
    }) as any as T & { services: Record<string, Service> }
  return {
    uid,
    composeFile,
    envFilePath,
    envFileName,
    composeFilePath,
  }
}
