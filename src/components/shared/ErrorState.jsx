export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card">
      <h3>Bir şeyler ters gitti</h3>
      <p>{message}</p>
      {onRetry ? <button className="primary-btn" onClick={onRetry}>Tekrar dene</button> : null}
    </div>
  )
}
