import { join } from 'path'
export function getFileName(_filepath: string, parameters: AppParameters) {
  const [filename, ext] = _filepath.split('.')
  let fileName = `${filename}.${parameters.env}.${ext}`
  if (!filename) {
    fileName = `.${ext}.${parameters.env}-compose`
  }
  return fileName
}

export function getFilePath(_filepath: string, parameters: AppParameters) {
  return join(parameters.output, getFileName(_filepath, parameters))
}
