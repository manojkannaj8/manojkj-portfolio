import { profile } from '../../content/profile'
import { VoxelTitle } from './VoxelTitle'
import './ChapterHead.css'

/** Shared chapter header: index + blurb label, voxel title (decorative) with a real heading, caption. */
export function ChapterHead({ id, titleId }: { id: string; titleId: string }) {
  const index = profile.chapters.findIndex((c) => c.id === id)
  const chapter = profile.chapters[index]
  return (
    <header className="chapter-head">
      <p className="chapter-head__label hud-label">
        <span className="chapter-head__index">Chapter {String(index + 1).padStart(2, '0')}</span>
        <span aria-hidden="true">/</span> {chapter.blurb}
      </p>
      <h2 id={titleId} className="chapter-head__title">
        <span className="sr-only">{`${chapter.label} — ${chapter.blurb}`}</span>
        <VoxelTitle text={chapter.label} />
      </h2>
      {chapter.caption && <p className="chapter-head__caption">{chapter.caption}</p>}
    </header>
  )
}
