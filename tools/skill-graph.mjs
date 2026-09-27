// Prints which experience / project / achievement each skill links to (Learn chapter).
// Run after editing skills, stacks or skillAliases in src/content/profile.ts:  node tools/skill-graph.mjs
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { buildSkillGraph } = await server.ssrLoadModule('/src/lib/skillGraph.ts')
for (const s of buildSkillGraph().skills) {
  const links = s.applied.map((a) => a.title).join(', ') || '—'
  console.log(`${s.category.padEnd(24)} ${s.name.padEnd(24)} → ${links}  [${s.related.length} related]`)
}
await server.close()
