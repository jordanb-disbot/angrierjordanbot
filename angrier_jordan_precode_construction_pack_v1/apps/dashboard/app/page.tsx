export default function Page() {
  return <main className="entry"><section className="window sign-in">
    <p className="eyebrow">Chairs · Server administration</p>
    <h1>Angrier Jordan</h1>
    <p className="lede">A seat at the controls.</p>
    <p>Sign in with Discord to view your server’s settings. Access is reserved for the server owner and current Administrators.</p>
    <a className="button" href="/api/auth/discord/login">Continue with Discord <span aria-hidden="true">↗</span></a>
    <p className="footnote">Dashboard preview · Configuration is read-only.</p>
  </section></main>;
}
