import { GlassCard, ProfileAvatar, SectionTitle } from '../design-system'

export function FriendsWatched({ people }) {
  return (
    <section className="card-section">
      <SectionTitle eyebrow="Arkadaş akışı" title="Bugün izleyenler" />
      <div className="friends-grid">
        {people.map((person) => (
          <GlassCard key={person.name} className="friend-card">
            <div className="friend-main">
              <ProfileAvatar name={person.name} size="md" accent={person.accent} />
              <div>
                <h3>{person.name}</h3>
                <p>{person.movie}</p>
              </div>
            </div>
            <span className="friend-time">{person.time}</span>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
