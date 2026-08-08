import Link from "next/link";
import styles from "./page.module.css";

const programs = [
  {
    title: "MCC",
    description: "Community-led support for people navigating services, referrals and practical needs.",
  },
  {
    title: "YouthScape",
    description: "A proposed Aboriginal youth crisis and bail support pathway for the Illawarra.",
  },
  {
    title: "The Crew",
    description: "Local action, outreach and connection work shaped by what community says it needs.",
  },
  {
    title: "DARC",
    description: "A direct support pathway focused on recovery, accountability and safer futures.",
  },
];

const frontDoor = [
  ["Book a Free 15-Min Call", "Speak with an IRAAC officer over the phone."],
  ["Visit a Local Office", "Drop in and speak with someone face to face."],
  ["Request a Home Visit", "Ask an IRAAC officer to come to you."],
  ["Complete a Survey", "Have Your Say and help shape what IRAAC takes forward."],
];

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="IRAAC home">
          IRAAC<span>.</span>
        </Link>
        <nav className={styles.nav} aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/programs">Programs</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/governance">More</Link>
        </nav>
        <Link href="/app" className={styles.login}>
          Login
        </Link>
      </header>

      <main>
        <section className={styles.frontDoor} aria-labelledby="front-door-title">
          <div className={styles.inner}>
            <h1 id="front-door-title">Get in Touch - Choose What Works for You</h1>
            <p>Whatever brings you here, IRAAC is here to help. Pick one option below to get started.</p>
            <div className={styles.pathways}>
              {frontDoor.map(([title, description], index) => (
                <article className={index === 0 ? styles.primaryPathway : styles.pathway} key={title}>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.hero}>
          <div className={styles.inner}>
            <div className={styles.heroGrid}>
              <div>
                <p className={styles.kicker}>Aboriginal community organisation - local decision making</p>
                <h2>Strong governance. Strong programs. Strong community.</h2>
                <p>
                  IRAAC is a community organisation working with and for community: listening, advocating and reporting
                  back on what changes.
                </p>
                <div className={styles.actions}>
                  <Link href="/app">Open MobLink prototype</Link>
                  <Link href="/survey">Have Your Say</Link>
                </div>
              </div>
              <div className={styles.visual} aria-hidden="true">
                <span>1800 Mob Link</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.programs} aria-labelledby="programs-title">
          <div className={styles.inner}>
            <p className={styles.kicker}>Programs</p>
            <h2 id="programs-title">Practical support pathways</h2>
            <div className={styles.programGrid}>
              {programs.map((program) => (
                <article key={program.title}>
                  <h3>{program.title}</h3>
                  <p>{program.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          <strong>IRAAC.</strong>
          <p>Acknowledgement of Country and local community leadership.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/contact">Contact</Link>
          <Link href="/governance">Governance</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </footer>
    </div>
  );
}
