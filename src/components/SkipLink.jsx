/* Skip link is a <button>, not <a href="#main">: the app uses HashRouter, so a
   hash anchor would be parsed as a route and navigate away instead of moving focus. */
export default function SkipLink() {
  return (
    <button className="skip-link" type="button" onClick={() => {
      const m = document.getElementById('main');
      if (m) { m.focus(); m.scrollIntoView(); }
    }}>Skip to content</button>
  );
}
