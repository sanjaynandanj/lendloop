"use client";
import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  Plus,
  X,
  Check,
  Leaf,
  Drill,
  Utensils,
  Tent,
  LayoutGrid,
  SlidersHorizontal,
  Repeat2,
  Heart,
  ShieldCheck,
  ChevronDown,
  MapPin,
  MoveUpRight,
} from "lucide-react";
import { connected } from "@/components/providers";
import { api } from "@/convex/_generated/api";
const categories = [
  "All tools",
  "Power tools",
  "Garden",
  "Kitchen",
  "Camping",
  "Other",
];
const images: Record<string, string> = {
  "Power tools":
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=85",
  Garden:
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=85",
  Kitchen:
    "https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=800&q=85",
  Camping:
    "https://images.unsplash.com/photo-1478131143081-fd1d858f3c15?w=800&q=85",
  Other:
    "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&q=85",
};
const sample = [
  { _id: "demo1", name: "Cordless drill & bit set", category: "Power tools" },
  { _id: "demo2", name: "A little garden help", category: "Garden" },
  { _id: "demo3", name: "Stand mixer", category: "Kitchen" },
  { _id: "demo4", name: "Weekend camping tent", category: "Camping" },
  { _id: "demo5", name: "Orbital sander", category: "Power tools" },
  { _id: "demo6", name: "Pruning essentials", category: "Garden" },
];
export default function Page() {
  return connected ? <Live /> : <Board tools={sample} demo />;
}
function Live() {
  const { isAuthenticated } = useConvexAuth();
  const tools = useQuery(api.board.browse, {});
  const mine = useQuery(api.board.mine, isAuthenticated ? {} : "skip");
  const save = useMutation(api.board.save),
    request = useMutation(api.board.request),
    transition = useMutation(api.board.transition),
    remove = useMutation(api.board.remove),
    trust = useMutation(api.board.trust);
  return (
    <Board
      tools={tools}
      mine={mine}
      signed={isAuthenticated}
      actions={{ save, request, transition, remove, trust }}
    />
  );
}
function Board({ tools, mine, signed = false, demo = false, actions }: any) {
  const [category, setCategory] = useState("All tools"),
    [search, setSearch] = useState(""),
    [view, setView] = useState("Explore tools"),
    [modal, setModal] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [available, setAvailable] = useState(false),
    [sort, setSort] = useState("Recently added");
  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      setModal(null);
      setNotice("All set! Your neighborhood board is up to date.");
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  let filtered = (tools || []).filter(
    (t: any) =>
      (category === "All tools" || t.category === category) &&
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      (!available || t.available !== false) &&
      (view !== "My listings" || t.owner === mine?.subject),
  );
  if (sort === "Name: A–Z")
    filtered = [...filtered].sort((a: any, b: any) =>
      a.name.localeCompare(b.name),
    );
  const sign = () =>
    demo ? setModal({ type: "setup" }) : setModal({ type: "signin" });
  const tabs = [
    "Explore tools",
    "My listings",
    "My requests",
    "Incoming requests",
    ...(mine?.admin ? ["All loans"] : []),
  ];
  return (
    <>
      <header>
        <a href="/" className="logo">
          <span className="logo-mark">
            <Repeat2 size={25} />
          </span>
          LendLoop<span className="logo-dot">.</span>
        </a>
        <nav>
          <button
            className={view === "Explore tools" ? "nav-active" : ""}
            onClick={() => setView("Explore tools")}
          >
            The tool shed
          </button>
          <a href="#how-it-works">How it works</a>
          <a href="#community">Our neighborhood</a>
        </nav>
        <div className="header-right">
          <span className="location">
            <MapPin size={14} /> Good things, close by
          </span>
          {signed ? (
            <UserButton />
          ) : demo ? (
            <button className="sign-button" onClick={sign}>
              Sign in <ArrowUpRight size={15} />
            </button>
          ) : (
            <SignInButton mode="modal">
              <button className="sign-button">
                Sign in <ArrowUpRight size={15} />
              </button>
            </SignInButton>
          )}
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> YOUR NEIGHBORHOOD, RESOURCEFUL BY NATURE
            </div>
            <h1>
              Big ideas.
              <br />
              Borrowed tools.
            </h1>
            <p>
              Borrow what you need. Lend what you don’t.
              <br />A little sharing goes a long way.
            </p>
            <div className="hero-buttons">
              <button
                className="primary"
                onClick={() =>
                  document
                    .getElementById("tools")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Find your next tool <ArrowUpRight size={18} />
              </button>
              <button
                className="text-button"
                onClick={() => (signed ? setModal({ type: "list" }) : sign())}
              >
                Lend a hand (or a drill) <ArrowRight size={17} />
              </button>
            </div>
            <div className="community-proof">
              <div className="avatars">
                {[
                  "1534528741775-53994a69daeb",
                  "1506794778202-cad84cf45f1d",
                  "1500648767791-00dcc994a43e",
                ].map((p, i) => (
                  <img
                    key={p}
                    src={`https://images.unsplash.com/photo-${p}?w=70&h=70&fit=crop&crop=faces`}
                    alt=""
                  />
                ))}
              </div>
              <span>
                Less buying. More belonging.
                <br />
                <strong>That’s the LendLoop way.</strong>
              </span>
            </div>
          </div>
          <div className="hero-photo">
            <img
              src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1400&q=90"
              alt="Hands tending a garden with shared tools"
            />
            <span className="photo-label">
              <span /> SMALL PROJECTS. STRONGER CONNECTIONS.
            </span>
            <div className="floating-note">
              <span className="note-icon">
                <Heart size={22} />
              </span>
              <div>
                A good tool deserves
                <br />
                <strong>more than one home.</strong>
              </div>
              <MoveUpRight size={20} />
            </div>
            <span className="photo-index">THE EVERYDAY, SHARED. — 01</span>
          </div>
        </section>
        <div className="values-strip">
          <span>
            <Repeat2 size={18} /> Borrow, use, return. Simple.
          </span>
          <span>
            <Leaf size={18} /> Lighter on the planet.
          </span>
          <span>
            <Heart size={18} /> Built on neighborly trust.
          </span>
          <span className="strip-message">A whole shed. Without the shed.</span>
        </div>
        <section id="tools" className="tools-section">
          <div className="section-top">
            <div className="eyebrow">THE COMMUNITY TOOL SHED</div>
            <span className="small-label">
              <span className="green-dot" /> A little something for your next
              project
            </span>
          </div>
          <div className="section-title">
            <h2>What are you working on?</h2>
            <button
              className="outline"
              onClick={() => (signed ? setModal({ type: "list" }) : sign())}
            >
              <Plus size={17} /> List a tool
            </button>
          </div>
          <p className="section-description">
            From a quick fix to a weekend adventure. Find it around the corner.
          </p>
          {signed && (
            <div className="tabs">
              {tabs.map((t) => (
                <button
                  className={view === t ? "active" : ""}
                  key={t}
                  onClick={() => setView(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button aria-label="Dismiss" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {error && !modal && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {["My requests", "Incoming requests", "All loans"].includes(view) ? (
            <div className="loans">
              {(mine?.loans || [])
                .filter(
                  (l: any) =>
                    view === "All loans" ||
                    (view === "My requests"
                      ? l.borrower === mine.subject
                      : l.lender === mine.subject),
                )
                .map((l: any) => (
                  <article className="loan" key={l._id}>
                    <div>
                      <h3>{l.tool?.name || "Removed tool"}</h3>
                      <p>
                        {l.start} → {l.end}
                      </p>
                      <span className="badge">{l.status}</span>
                      {l.activity?.map((a: any) => (
                        <p className="activity" key={a._id}>
                          <Check size={13} />{" "}
                          {a.kind === "reminder"
                            ? "Reminder sent"
                            : "Notification logged"}{" "}
                          · {new Date(a.at).toLocaleDateString()}
                        </p>
                      ))}
                    </div>
                    <div className="loan-actions">
                      {l.status === "pending" &&
                        l.lender === mine.subject &&
                        ["approved", "declined"].map((s) => (
                          <button
                            className="outline"
                            key={s}
                            onClick={() =>
                              run(() =>
                                actions.transition({ id: l._id, status: s }),
                              )
                            }
                            disabled={busy}
                          >
                            {s === "approved" ? "Approve" : "Decline"}
                          </button>
                        ))}
                      {l.status === "approved" &&
                        [l.lender, l.borrower].includes(mine.subject) && (
                          <button
                            className="outline"
                            disabled={busy}
                            onClick={() =>
                              run(() =>
                                actions.transition({
                                  id: l._id,
                                  status: "returned",
                                }),
                              )
                            }
                          >
                            Mark returned
                          </button>
                        )}
                    </div>
                  </article>
                ))}
              {!(mine?.loans || []).some(
                (l: any) =>
                  view === "All loans" ||
                  (view === "My requests"
                    ? l.borrower === mine.subject
                    : l.lender === mine.subject),
              ) && (
                <div className="empty">
                  <Repeat2 />
                  <h3>A new connection starts here.</h3>
                  <p>Your borrowing activity will appear here.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="filters">
                <div className="category-tabs">
                  {categories.map((c, i) => {
                    const Icon = [
                      LayoutGrid,
                      Drill,
                      Leaf,
                      Utensils,
                      Tent,
                      SlidersHorizontal,
                    ][i];
                    return (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={category === c ? "selected" : ""}
                      >
                        <Icon size={16} />
                        {c}
                      </button>
                    );
                  })}
                </div>
                <label className="search">
                  <Search size={17} />
                  <input
                    placeholder="Find a tool…"
                    aria-label="Search tools"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="results-bar">
                <span>
                  {tools === undefined
                    ? "Opening the shed…"
                    : `${filtered.length} tools to get things going`}
                  {demo && (
                    <span className="demo-label"> · Sample neighborhood</span>
                  )}
                </span>
                <div>
                  {signed && (
                    <label className="available-toggle">
                      <input
                        type="checkbox"
                        checked={available}
                        onChange={(e) => setAvailable(e.target.checked)}
                      />{" "}
                      Available now
                    </label>
                  )}
                  <label>
                    Sort by:{" "}
                    <select
                      aria-label="Sort tools"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option>Recently added</option>
                      <option>Name: A–Z</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="tool-grid">
                {filtered.map((t: any, i: number) => (
                  <article className="tool-card" key={t._id}>
                    <button
                      className="tool-image"
                      onClick={() =>
                        signed ? setModal({ type: "borrow", tool: t }) : sign()
                      }
                      aria-label={`View ${t.name}`}
                    >
                      <img
                        src={images[t.category] || images.Other}
                        alt={t.name}
                        style={{
                          objectPosition: i === 4 ? "70% center" : "center",
                        }}
                      />
                      {signed && (
                        <span
                          className={`availability ${t.available === false ? "unavailable" : ""}`}
                        >
                          <span />
                          {t.available === false ? "On loan" : "Available"}
                        </span>
                      )}
                      <span className="card-arrow">
                        <ArrowUpRight size={19} />
                      </span>
                    </button>
                    <div className="card-body">
                      <div className="card-category">{t.category}</div>
                      <h3>
                        <button
                          onClick={() =>
                            signed
                              ? setModal({ type: "borrow", tool: t })
                              : sign()
                          }
                        >
                          {t.name}
                        </button>
                      </h3>
                      {signed && (
                        <div className="private-detail">
                          <span>{t.condition}</span>
                          {t.trusted && (
                            <span>
                              <ShieldCheck size={13} /> Trusted lender
                            </span>
                          )}
                        </div>
                      )}
                      {signed && (t.owner === mine?.subject || mine?.admin) && (
                        <div className="manage">
                          <button
                            onClick={() => setModal({ type: "list", tool: t })}
                            disabled={t.owner !== mine?.subject}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              setModal({ type: "delete", tool: t })
                            }
                          >
                            Remove
                          </button>
                          {mine?.admin && !t.trusted && (
                            <button
                              onClick={() =>
                                run(() => actions.trust({ subject: t.owner }))
                              }
                            >
                              Trust lender
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {filtered.length === 0 && tools !== undefined && (
                <div className="empty">
                  <Search />
                  <h3>No tools found just yet.</h3>
                  <p>Try another category or a different search.</p>
                  <button
                    className="outline"
                    onClick={() => {
                      setSearch("");
                      setCategory("All tools");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
          {!signed && (
            <div className="join-banner">
              <div className="join-icon">
                <Repeat2 size={25} />
              </div>
              <div>
                <h3>Your next project starts with a neighbor.</h3>
                <p>
                  Join the loop to borrow a tool, share your own, and make
                  something happen.
                </p>
              </div>
              {demo ? (
                <button className="primary" onClick={sign}>
                  Sign in to lend or borrow <ArrowUpRight size={17} />
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className="primary">
                    Sign in to lend or borrow <ArrowUpRight size={17} />
                  </button>
                </SignInButton>
              )}
            </div>
          )}
        </section>
        <section id="how-it-works" className="how">
          <div>
            <div className="eyebrow">GOOD THINGS GO AROUND</div>
            <h2>
              Less stuff.
              <br />
              More possibility.
            </h2>
          </div>
          {[
            [
              "01",
              "Find your thing",
              "Explore the shed and pick the tool your project needs.",
            ],
            [
              "02",
              "Make a connection",
              "Choose your dates. Your neighbor takes it from there.",
            ],
            [
              "03",
              "Bring it full circle",
              "Use it, return it, and pass the possibility along.",
            ],
          ].map(([n, t, d]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </section>
        <footer id="community">
          <a className="logo" href="/">
            <Repeat2 /> LendLoop.
          </a>
          <span>Made for neighbors. Better together.</span>
          <span>
            A little sharing goes a long way. <Leaf size={14} />
          </span>
        </footer>
      </main>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setModal(null);
            setError("");
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal.type === "list" ? "List a tool" : "LendLoop"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="Close dialog"
              onClick={() => {
                setModal(null);
                setError("");
              }}
            >
              <X />
            </button>
            {modal.type === "setup" ? (
              <>
                <span className="logo-mark">
                  <Repeat2 />
                </span>
                <h2>A neighborhood in the making.</h2>
                <p>
                  You’re exploring a sample tool shed. Connect Clerk and Convex
                  using the README to enable sign-in, real listings, and
                  borrowing.
                </p>
                <button className="primary" onClick={() => setModal(null)}>
                  Keep exploring <ArrowRight size={16} />
                </button>
              </>
            ) : modal.type === "signin" ? (
              <>
                <h2>Come join the loop.</h2>
                <p>Sign in to meet your next project.</p>
                <SignInButton mode="modal">
                  <button className="primary">Sign in to lend or borrow</button>
                </SignInButton>
              </>
            ) : modal.type === "delete" ? (
              <>
                <h2>Remove this listing?</h2>
                <p>
                  {modal.tool.name} will no longer appear in the community shed.
                </p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    run(() => actions.remove({ id: modal.tool._id }))
                  }
                >
                  Remove listing
                </button>
              </>
            ) : modal.type === "list" ? (
              <>
                <div className="eyebrow">MAKE ROOM FOR POSSIBILITY</div>
                <h2>
                  {modal.tool ? "Edit your listing" : "Share a little useful."}
                </h2>
                <p>A tool sitting idle could be someone’s next big idea.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    run(() =>
                      actions.save({
                        ...(modal.tool ? { id: modal.tool._id } : {}),
                        name: f.get("name"),
                        category: f.get("category"),
                        condition: f.get("condition"),
                        description: f.get("description"),
                      }),
                    );
                  }}
                >
                  <label>
                    Tool name
                    <input
                      name="name"
                      required
                      maxLength={100}
                      defaultValue={modal.tool?.name}
                      placeholder="e.g. Cordless drill & bit set"
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Category
                      <select
                        name="category"
                        defaultValue={modal.tool?.category || "Power tools"}
                      >
                        {categories.slice(1).map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Condition
                      <select
                        name="condition"
                        defaultValue={modal.tool?.condition || "Good"}
                      >
                        {["Like new", "Good", "Well loved"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    A little about it
                    <textarea
                      name="description"
                      required
                      maxLength={600}
                      defaultValue={modal.tool?.description}
                      placeholder="What should a neighbor know?"
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    {busy ? "Saving…" : "Save listing"} <Plus size={17} />
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="eyebrow">{modal.tool.category}</div>
                <h2>{modal.tool.name}</h2>
                <p>{modal.tool.description}</p>
                <p>Condition: {modal.tool.condition}</p>
                {modal.tool.owner === mine?.subject ? (
                  <p>
                    This is your listing. Incoming requests will appear in your
                    dashboard.
                  </p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      run(() =>
                        actions.request({
                          toolId: modal.tool._id,
                          start: f.get("start"),
                          end: f.get("end"),
                        }),
                      );
                    }}
                  >
                    <div className="form-row">
                      <label>
                        Borrow from
                        <input
                          type="date"
                          name="start"
                          min={new Date().toISOString().slice(0, 10)}
                          required
                        />
                      </label>
                      <label>
                        Return by
                        <input
                          type="date"
                          name="end"
                          min={new Date().toISOString().slice(0, 10)}
                          required
                        />
                      </label>
                    </div>
                    <p className="hint">
                      Your neighbor will confirm your dates. A little care goes
                      a long way.
                    </p>
                    <button className="primary" disabled={busy}>
                      {busy ? "Sending…" : "Request to borrow"}{" "}
                      <ArrowUpRight size={17} />
                    </button>
                  </form>
                )}
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
