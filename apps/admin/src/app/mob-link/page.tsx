"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type Tab = "home" | "search" | "map" | "connected" | "survey" | "profile";
type IconName = Tab | "pin";

type Service = {
  name: string;
  kind: string;
  location: string;
  area: "Nowra" | "Wollongong" | "Port Kembla" | "Culburra Beach" | "National";
  distance: string;
  tags: string[];
  summary: string;
  status: "Recommended" | "New" | "National";
  source: string;
  dot: { x: number; y: number };
};

const services: Service[] = [
  {
    name: "South Coast Medical Service",
    kind: "Health and wellbeing",
    location: "Berry Street, Nowra",
    area: "Nowra",
    distance: "0.8 km",
    tags: ["Health", "Family", "Wellbeing"],
    summary: "Aboriginal community-controlled health, wellbeing and family support in Nowra.",
    status: "Recommended",
    source: "South Coast AMS",
    dot: { x: 47, y: 58 },
  },
  {
    name: "Waminda",
    kind: "Women, family and culture",
    location: "Kinghorne Street, Nowra",
    area: "Nowra",
    distance: "1.1 km",
    tags: ["Women", "Health", "Family"],
    summary: "Culturally safe health and wellbeing support for Aboriginal women and families.",
    status: "Recommended",
    source: "Waminda",
    dot: { x: 51, y: 53 },
  },
  {
    name: "Aboriginal Legal Service Nowra",
    kind: "Legal help",
    location: "Plunkett Street, Nowra",
    area: "Nowra",
    distance: "1.4 km",
    tags: ["Legal", "Bail", "Family"],
    summary: "Criminal law, care and protection, family law and referral pathways.",
    status: "Recommended",
    source: "ALS NSW/ACT",
    dot: { x: 55, y: 62 },
  },
  {
    name: "Cullunghutti Child and Family Centre",
    kind: "Children and families",
    location: "Holloway Road, South Nowra",
    area: "Nowra",
    distance: "3.9 km",
    tags: ["Children", "Family", "Early years"],
    summary: "Aboriginal child and family centre supporting children, parents and carers.",
    status: "New",
    source: "NSW DCJ",
    dot: { x: 63, y: 73 },
  },
  {
    name: "Illawarra Aboriginal Medical Service",
    kind: "Health",
    location: "Church Street, Wollongong",
    area: "Wollongong",
    distance: "72 km",
    tags: ["Health", "Dental", "Mental health"],
    summary: "Primary health care for Aboriginal and Torres Strait Islander people in the Illawarra.",
    status: "Recommended",
    source: "IAMS",
    dot: { x: 37, y: 33 },
  },
  {
    name: "Illawarra Local Aboriginal Land Council",
    kind: "Culture, land and community",
    location: "Young Street, Wollongong",
    area: "Wollongong",
    distance: "73 km",
    tags: ["Culture", "Land council", "Community"],
    summary: "Represents Aboriginal people of the Illawarra and Southern Highlands.",
    status: "New",
    source: "NSW ALC",
    dot: { x: 35, y: 29 },
  },
  {
    name: "Jerrinja Local Aboriginal Land Council",
    kind: "Culture, land and community",
    location: "Culburra Beach",
    area: "Culburra Beach",
    distance: "22 km",
    tags: ["Culture", "Land council", "Community"],
    summary: "Coastal Saltwater People supporting Country, culture and community.",
    status: "Recommended",
    source: "Jerrinja LALC",
    dot: { x: 68, y: 43 },
  },
  {
    name: "Aboriginal Housing Office",
    kind: "Housing",
    location: "NSW-wide",
    area: "National",
    distance: "Online",
    tags: ["Housing", "Tenancy", "Government"],
    summary: "Information and pathways for Aboriginal housing, tenants and providers.",
    status: "National",
    source: "NSW Government",
    dot: { x: 78, y: 28 },
  },
  {
    name: "Services Australia",
    kind: "Centrelink and Medicare",
    location: "National access",
    area: "National",
    distance: "Online",
    tags: ["Centrelink", "Medicare", "Payments"],
    summary: "Mainstream national payments and Medicare access, with assisted-service pathways.",
    status: "National",
    source: "Services Australia",
    dot: { x: 22, y: 67 },
  },
  {
    name: "13YARN",
    kind: "Crisis support",
    location: "National phone service",
    area: "National",
    distance: "Call now",
    tags: ["Crisis", "Yarn", "24/7"],
    summary: "Aboriginal and Torres Strait Islander crisis support. Use 000 if in immediate danger.",
    status: "National",
    source: "13YARN",
    dot: { x: 83, y: 64 },
  },
];

const locations = ["Nowra", "Wollongong", "Port Kembla", "Culburra Beach", "National"] as const;

const categories = [
  { name: "Health", tone: "green" },
  { name: "Legal", tone: "blue" },
  { name: "Housing", tone: "gold" },
  { name: "Family", tone: "pink" },
  { name: "Culture", tone: "earth" },
  { name: "Centrelink", tone: "sky" },
];

const navItems: { key: Tab; label: string; icon: IconName }[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "search", label: "Search", icon: "search" },
  { key: "connected", label: "Connected", icon: "connected" },
  { key: "survey", label: "Survey", icon: "survey" },
  { key: "profile", label: "Profile", icon: "profile" },
];

function Icon({ name }: { name: IconName }) {
  const paths = {
    home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z",
    search: "M10.8 18a7.2 7.2 0 1 1 5.1-2.1L21 21l-3 0-4.2-4.2A7.1 7.1 0 0 1 10.8 18Z",
    map: "M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6",
    connected: "M8.5 12a3.5 3.5 0 0 1 0-5l1.7-1.7a3.5 3.5 0 0 1 5 5L14 11.5m-4 1 4-4m1.5 3.5a3.5 3.5 0 0 1 0 5l-1.7 1.7a3.5 3.5 0 1 1-5-5L10 12.5",
    survey: "M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Zm2 5h6m-6 4h6m-6 4h4",
    profile: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm8 10a8 8 0 0 0-16 0",
    pin: "M12 22s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={styles.icon}>
      <path d={paths[name]} />
    </svg>
  );
}

function ServiceCard({
  service,
  compact = false,
  connected = false,
  onConnect,
}: {
  service: Service;
  compact?: boolean;
  connected?: boolean;
  onConnect?: (service: Service) => void;
}) {
  return (
    <article className={compact ? styles.compactCard : styles.serviceCard}>
      <div className={styles.serviceArt}>
        <span>{service.kind.split(" ")[0]}</span>
      </div>
      <div className={styles.serviceBody}>
        <div className={styles.cardTopline}>
          <span>{service.distance}</span>
          <span>{service.status}</span>
        </div>
        <h3>{service.name}</h3>
        <p className={styles.kind}>{service.kind}</p>
        <p className={styles.place}>{service.location}</p>
        <p className={styles.summary}>{service.summary}</p>
        <div className={styles.tags}>
          {service.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {onConnect && (
          <button className={styles.serviceAction} type="button" onClick={() => onConnect(service)}>
            {connected ? "Connected" : "Connect service"}
          </button>
        )}
      </div>
    </article>
  );
}

export default function MobLinkPage() {
  const [tab, setTab] = useState<Tab>("home");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<(typeof locations)[number]>("Nowra");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [connectedNames, setConnectedNames] = useState<string[]>(["South Coast Medical Service", "Waminda"]);

  const visibleServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((service) => {
      const matchesLocation = location === "National" || service.area === location || service.area === "National";
      const matchesCategory =
        selectedCategory === "All" || service.tags.some((tag) => tag.toLowerCase() === selectedCategory.toLowerCase());
      const matchesQuery =
        !q ||
        [service.name, service.kind, service.location, service.summary, service.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesLocation && matchesCategory && matchesQuery;
    });
  }, [location, query, selectedCategory]);

  const recommended = visibleServices.filter((service) => service.status === "Recommended").slice(0, 5);
  const newlyAdded = visibleServices.filter((service) => service.status === "New").slice(0, 5);
  const national = services.filter((service) => service.status === "National");
  const connectedServices = services.filter((service) => connectedNames.includes(service.name));

  function connectService(service: Service) {
    setConnectedNames((current) => (current.includes(service.name) ? current : [...current, service.name]));
    setTab("connected");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.phone} aria-label="1800 Mob Link app prototype">
        <header className={styles.statusBar} aria-hidden="true">
          <span>4:05</span>
          <span>5G 40</span>
        </header>

        <div className={styles.appHeader}>
          <div>
            <p className={styles.kicker}>1800 Mob Link</p>
            <h1>
              {tab === "search"
                ? "Search"
                : tab === "map"
                  ? "Map"
                  : tab === "connected"
                    ? "Connected"
                    : tab === "survey"
                      ? "Survey"
                      : tab === "profile"
                        ? "Profile"
                        : "For you"}
            </h1>
          </div>
          <button className={styles.roundButton} type="button" onClick={() => setTab("search")} aria-label="Open search">
            <Icon name="search" />
          </button>
        </div>

        <div className={styles.locationRow}>
          <label>
            <Icon name="pin" />
            <select value={location} onChange={(event) => setLocation(event.target.value as typeof location)}>
              {locations.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setTab("map")}>
            View map
          </button>
        </div>

        {(tab === "search" || tab === "map") && (
          <div className={styles.searchBox}>
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search legal, housing, health..."
              aria-label="Search services"
            />
          </div>
        )}

        {tab === "home" && (
          <div className={styles.content}>
            <section className={styles.heroCard}>
              <div>
                <p>Recommended around {location}</p>
                <h2>Find support near you</h2>
                <span>Health, legal, housing, family, culture and Centrelink pathways.</span>
              </div>
              <button type="button" onClick={() => setTab("search")}>
                Start
              </button>
            </section>

            <section>
              <div className={styles.sectionTitle}>
                <h2>Recommended for you</h2>
                <button type="button" onClick={() => setTab("search")}>
                  See all
                </button>
              </div>
              <div className={styles.cardRail}>
                {recommended.map((service) => (
                  <ServiceCard
                    key={service.name}
                    service={service}
                    connected={connectedNames.includes(service.name)}
                    onConnect={connectService}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className={styles.sectionTitle}>
                <h2>Newly added</h2>
                <button type="button" onClick={() => setTab("search")}>
                  See all
                </button>
              </div>
              <div className={styles.cardRail}>
                {newlyAdded.map((service) => (
                  <ServiceCard
                    key={service.name}
                    service={service}
                    connected={connectedNames.includes(service.name)}
                    onConnect={connectService}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className={styles.sectionTitle}>
                <h2>National programs</h2>
                <button type="button" onClick={() => setTab("search")}>
                  See all
                </button>
              </div>
              <div className={styles.cardRail}>
                {national.map((service) => (
                  <ServiceCard
                    key={service.name}
                    service={service}
                    connected={connectedNames.includes(service.name)}
                    onConnect={connectService}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "search" && (
          <div className={styles.content}>
            <section>
              <h2 className={styles.browseTitle}>Browse nearby</h2>
              <button className={styles.mapPreview} type="button" onClick={() => setTab("map")}>
                <span>Map around {location}</span>
                {visibleServices.slice(0, 7).map((service) => (
                  <i key={service.name} style={{ left: `${service.dot.x}%`, top: `${service.dot.y}%` }} />
                ))}
              </button>
            </section>

            <section>
              <h2 className={styles.browseTitle}>Browse all</h2>
              <div className={styles.categoryGrid}>
                <button type="button" onClick={() => setSelectedCategory("All")} className={styles.allCategory}>
                  All services
                </button>
                {categories.map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    data-tone={category.tone}
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.listStack}>
              {visibleServices.map((service) => (
                <ServiceCard
                  key={service.name}
                  service={service}
                  compact
                  connected={connectedNames.includes(service.name)}
                  onConnect={connectService}
                />
              ))}
            </section>
          </div>
        )}

        {tab === "map" && (
          <div className={styles.content}>
            <section className={styles.largeMap} aria-label={`Service map around ${location}`}>
              <div className={styles.mapSearchPill}>
                <button type="button" onClick={() => setTab("search")} aria-label="Back to search">
                  <Icon name="search" />
                </button>
                <strong>Services</strong>
                <span>{location}</span>
              </div>
              <div className={styles.mapWater} />
              <div className={styles.mapRoads} />
              {visibleServices.map((service) => (
                <button
                  key={service.name}
                  type="button"
                  className={styles.mapDot}
                  style={{ left: `${service.dot.x}%`, top: `${service.dot.y}%` }}
                  aria-label={service.name}
                  title={service.name}
                >
                  {service.tags[0].slice(0, 1)}
                </button>
              ))}
            </section>
            <section className={styles.filterSheet}>
              <div className={styles.sheetHandle} />
              <div className={styles.filterChips}>
                <button type="button">Sort by</button>
                <button type="button">Need</button>
                <button type="button">Distance</button>
                <button type="button">Open now</button>
              </div>
              <p>{visibleServices.length} services around {location}</p>
            </section>
            <section className={styles.listStack}>
              {visibleServices.map((service) => (
                <ServiceCard
                  key={service.name}
                  service={service}
                  compact
                  connected={connectedNames.includes(service.name)}
                  onConnect={connectService}
                />
              ))}
            </section>
          </div>
        )}

        {tab === "connected" && (
          <div className={styles.content}>
            <section className={styles.emptyState}>
              <h2>Connected services</h2>
              <p>These are services you have added so IRAAC can help track referrals and follow up later.</p>
              <button type="button" onClick={() => setTab("search")}>
                Add another
              </button>
            </section>
            <section className={styles.listStack}>
              {connectedServices.map((service) => (
                <ServiceCard key={service.name} service={service} compact connected onConnect={connectService} />
              ))}
            </section>
          </div>
        )}

        {tab === "survey" && (
          <div className={styles.content}>
            <section className={styles.profilePanel}>
              <h2>Tell us what is working</h2>
              <p>
                Use the general IRAAC survey or give feedback on a service you are connected with. This prototype does
                not submit anything yet.
              </p>
              <div className={styles.surveyChoices}>
                <a href="/survey">Open Have Your Say</a>
                {connectedServices.map((service) => (
                  <button key={service.name} type="button">
                    Survey: {service.name}
                  </button>
                ))}
              </div>
            </section>
            <section className={styles.contactCard}>
              <div>
                <h2>1800 Mob Link request</h2>
                <p>Speak or type what you need. A bot can take the first note, then IRAAC can call back safely.</p>
              </div>
              <button type="button">Start request</button>
            </section>
          </div>
        )}

        {tab === "profile" && (
          <div className={styles.content}>
            <section className={styles.profilePanel}>
              <h2>Your Mob Link account</h2>
              <p>
                Login will use Supabase Auth phone OTP. Collect only what is needed for a service, with clear consent.
              </p>
              <dl>
                <div>
                  <dt>Mobile number</dt>
                  <dd>Verified at login</dd>
                </div>
                <div>
                  <dt>Email address</dt>
                  <dd>Optional</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{location}</dd>
                </div>
                <div>
                  <dt>Home address</dt>
                  <dd>Only if needed</dd>
                </div>
                <div>
                  <dt>Nationality</dt>
                  <dd>Australian</dd>
                </div>
                <div>
                  <dt>Safe contact</dt>
                  <dd>Not set</dd>
                </div>
                <div>
                  <dt>Follow-up consent</dt>
                  <dd>Ask each time</dd>
                </div>
                <div>
                  <dt>Driver licence</dt>
                  <dd>Only if needed</dd>
                </div>
                <div>
                  <dt>Medicare</dt>
                  <dd>Only if needed</dd>
                </div>
                <div>
                  <dt>Centrelink CRN</dt>
                  <dd>Only if needed</dd>
                </div>
                <div>
                  <dt>Tax file number</dt>
                  <dd>Do not collect</dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        <nav className={styles.bottomNav} aria-label="Mob Link sections">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? styles.activeTab : undefined}
              onClick={() => setTab(item.key)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}
