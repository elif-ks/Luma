import { GlassCard, SectionTitle, Tag } from '../design-system'

export function PopularLists({ lists }) {
  return (
    <section className="card-section">
      <SectionTitle eyebrow="Popüler listeler" title="Topluluk derlemeleri" />
      <div className="lists-grid">
        {lists.map((list) => (
          <GlassCard key={list.name} className="list-card">
            <h3>{list.name}</h3>
            <p>{list.description}</p>
            <div className="list-tags">
              {list.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
