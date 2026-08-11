export function CastCarousel({ cast }) {
  return (
    <div className="cast-carousel">
      {cast.map((person) => (
        <div key={person.name} className="cast-item">
          <div className="cast-photo" />
          <h3>{person.name}</h3>
          <p>{person.character}</p>
        </div>
      ))}
    </div>
  )
}
