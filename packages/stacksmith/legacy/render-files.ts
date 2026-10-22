export function renderYaml(config: any) {
  const Anchors = {} as Record<string, any>
  const AnchorNames = [] as string[]
  for (const [anchor, replacement] of Object.entries(config.useAnchors ?? {})) {
    const anchorName = `x-${anchor}`
    AnchorNames.push(anchor)
    Anchors[anchorName] = replacement
  }
  delete config.useAnchors
  const YamlJSContent = {
    name: config.name,
    ...Anchors,
    ...config,
  }
  let content = Bun.YAML.stringify(YamlJSContent, null, 2).replaceAll(': null', ':')
  for (const anchorName of AnchorNames) {
    content = content
      .replace(`x-${anchorName}:`, `x-${anchorName}: &${anchorName}`)
      .replaceAll(`- "<${anchorName}>"`, `<<: *${anchorName}`)
  }
  return content
}
