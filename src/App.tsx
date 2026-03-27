import {
  type ChangeEvent,
  type FormEvent,
  useEffectEvent,
  useRef,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import logo from "./assets/codeReleaseTrackerLogo.png";
import type { Release, Repository } from "./models";
import "./App.css";

const STORAGE_KEY = "code-release-tracker.releases.v2";
const DEFAULT_MONTHLY_TARGET = 8;
const DEFAULT_QUARTERLY_TARGET = 24;

const createId = () => {
  return window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
};

const today = () => new Date().toISOString().slice(0, 10);

const sortRepositories = (repositories: Repository[]) => {
  return [...repositories].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};

const sortReleases = (releases: Release[]) => {
  return [...releases].sort((left, right) => {
    return right.date.localeCompare(left.date);
  });
};

const formatDate = (value: string) => {
  if (!value) return "No date";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
};

const createEmptyReleaseForm = () => ({
  name: "",
  date: today(),
  description: "",
});

const createEmptyRepoForm = () => ({
  name: "",
  version: "",
  tag: "",
});

const demoReleases: Release[] = sortReleases([
  {
    id: "release-spring-ops",
    name: "Spring Ops Release",
    date: "2026-03-18",
    description:
      "Rolls platform stability work, UI updates, and auth changes into one operational release.",
    repositories: sortRepositories([
      {
        id: "repo-gateway",
        name: "gateway-service",
        version: "2.8.4",
        tag: "stable",
      },
      {
        id: "repo-console",
        name: "ops-console",
        version: "1.17.0",
        tag: "candidate",
      },
      {
        id: "repo-auth",
        name: "identity-worker",
        version: "4.3.1",
      },
    ]),
  },
  {
    id: "release-patch",
    name: "Payments Patch Train",
    date: "2026-03-05",
    description:
      "Targets billing fixes and monitoring updates for the finance pipeline.",
    repositories: sortRepositories([
      {
        id: "repo-billing",
        name: "billing-api",
        version: "1.14.2",
        tag: "hotfix",
      },
      {
        id: "repo-reports",
        name: "reporting-jobs",
        version: "3.6.0",
      },
    ]),
  },
]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const sanitizeRepository = (value: unknown): Repository | null => {
  if (!isRecord(value)) return null;
  if (typeof value.name !== "string" || typeof value.version !== "string") {
    return null;
  }

  return {
    id:
      typeof value.id === "string" && value.id
        ? value.id
        : `repo-${Math.random().toString(36).slice(2)}`,
    name: value.name.trim(),
    version: value.version.trim(),
    tag:
      typeof value.tag === "string" && value.tag.trim()
        ? value.tag.trim()
        : undefined,
  };
};

const sanitizeRelease = (value: unknown): Release | null => {
  if (!isRecord(value)) return null;
  if (typeof value.name !== "string" || typeof value.date !== "string") {
    return null;
  }

  const rawRepositories = Array.isArray(value.repositories)
    ? value.repositories
    : [];
  const repositories = rawRepositories
    .map(sanitizeRepository)
    .filter((repository): repository is Repository => repository !== null);

  return {
    id:
      typeof value.id === "string" && value.id
        ? value.id
        : `release-${Math.random().toString(36).slice(2)}`,
    name: value.name.trim(),
    date: value.date,
    description:
      typeof value.description === "string" && value.description.trim()
        ? value.description.trim()
        : undefined,
    repositories: sortRepositories(repositories),
  };
};

const readStoredReleases = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return sortReleases(
      parsed
        .map(sanitizeRelease)
        .filter((release): release is Release => release !== null),
    );
  } catch {
    return [];
  }
};

type MetricCardProps = {
  label: string;
  value: string;
  accent: "copper" | "ink" | "sage" | "sand";
  detail: string;
};

type RepositorySortKey = "name" | "version" | "tag";
type SortDirection = "asc" | "desc";

function MetricCard({ label, value, accent, detail }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

type ReleaseListItemProps = {
  release: Release;
  active: boolean;
  onSelect: (releaseId: string) => void;
};

function ReleaseListItem({
  release,
  active,
  onSelect,
}: ReleaseListItemProps) {
  return (
    <button
      type="button"
      className={`release-list-item${active ? " is-active" : ""}`}
      onClick={() => onSelect(release.id)}
    >
      <div className="release-list-item__meta">
        <span>{formatDate(release.date)}</span>
        <span>{release.repositories.length} repos</span>
      </div>
      <strong>{release.name}</strong>
      <p>{release.description || "No release summary yet."}</p>
    </button>
  );
}

function App() {
  const [releases, setReleases] = useState<Release[]>(readStoredReleases);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [releaseForm, setReleaseForm] = useState(createEmptyReleaseForm);
  const [repoForm, setRepoForm] = useState(createEmptyRepoForm);
  const [releaseSearch, setReleaseSearch] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [repositorySort, setRepositorySort] = useState<{
    key: RepositorySortKey;
    direction: SortDirection;
  }>({
    key: "name",
    direction: "asc",
  });
  const [coveragePeriod, setCoveragePeriod] = useState<"monthly" | "quarterly">(
    "monthly",
  );
  const [monthlyTarget, setMonthlyTarget] = useState(DEFAULT_MONTHLY_TARGET);
  const [quarterlyTarget, setQuarterlyTarget] = useState(
    DEFAULT_QUARTERLY_TARGET,
  );
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  const deferredReleaseSearch = useDeferredValue(releaseSearch);
  const deferredRepoSearch = useDeferredValue(repoSearch);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(releases));
  }, [releases]);

  useEffect(() => {
    if (!releases.length) {
      if (selectedReleaseId) {
        startTransition(() => {
          setSelectedReleaseId("");
        });
      }
      return;
    }

    const selectedReleaseStillExists = releases.some(
      (release) => release.id === selectedReleaseId,
    );

    if (!selectedReleaseId || !selectedReleaseStillExists) {
      startTransition(() => {
        setSelectedReleaseId(releases[0].id);
      });
    }
  }, [releases, selectedReleaseId]);

  const closeFileMenu = useEffectEvent(() => {
    setFileMenuOpen(false);
  });

  const handleWindowMaximizedChange = useEffectEvent((maximized: boolean) => {
    setIsWindowMaximized(maximized);
  });

  useEffect(() => {
    if (!fileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!fileMenuRef.current?.contains(event.target as Node)) {
        closeFileMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFileMenu();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [fileMenuOpen]);

  useEffect(() => {
    if (!window.electronAPI?.onWindowStateChange) return;

    return window.electronAPI.onWindowStateChange(handleWindowMaximizedChange);
  }, []);

  const normalizedReleaseSearch = deferredReleaseSearch.trim().toLowerCase();
  const normalizedRepoSearch = deferredRepoSearch.trim().toLowerCase();

  const filteredReleases = releases.filter((release) => {
    if (!normalizedReleaseSearch) return true;

    const repositoryNames = release.repositories
      .map((repository) => repository.name)
      .join(" ")
      .toLowerCase();

    return (
      release.name.toLowerCase().includes(normalizedReleaseSearch) ||
      (release.description || "")
        .toLowerCase()
        .includes(normalizedReleaseSearch) ||
      repositoryNames.includes(normalizedReleaseSearch)
    );
  });

  const selectedRelease =
    releases.find((release) => release.id === selectedReleaseId) ?? null;

  const visibleRepositories = useMemo(() => {
    if (!selectedRelease) return [];

    const filteredRepositories = selectedRelease.repositories.filter(
      (repository) => {
        if (!normalizedRepoSearch) return true;

        return (
          repository.name.toLowerCase().includes(normalizedRepoSearch) ||
          repository.version.toLowerCase().includes(normalizedRepoSearch) ||
          (repository.tag || "").toLowerCase().includes(normalizedRepoSearch)
        );
      },
    );

    const directionMultiplier = repositorySort.direction === "asc" ? 1 : -1;

    return [...filteredRepositories].sort((left, right) => {
      const leftValue =
        repositorySort.key === "tag"
          ? left.tag || ""
          : repositorySort.key === "version"
            ? left.version
            : left.name;
      const rightValue =
        repositorySort.key === "tag"
          ? right.tag || ""
          : repositorySort.key === "version"
            ? right.version
            : right.name;

      return leftValue.localeCompare(rightValue) * directionMultiplier;
    });
  }, [normalizedRepoSearch, repositorySort, selectedRelease]);

  const repositoryCount = releases.reduce((count, release) => {
    return count + release.repositories.length;
  }, 0);

  const releaseFormValid =
    releaseForm.name.trim().length > 0 && releaseForm.date.length > 0;
  const repoFormValid =
    selectedRelease !== null &&
    repoForm.name.trim().length > 0 &&
    repoForm.version.trim().length > 0;

  const selectedTags = selectedRelease
    ? Array.from(
        new Set(
          selectedRelease.repositories
            .map((repository) => repository.tag)
            .filter((tag): tag is string => Boolean(tag)),
        ),
      )
    : [];

  const { monthlyCoverage, quarterlyCoverage } = useMemo(() => {
    const getWindowCount = (days: number) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      return releases.reduce((total, release) => {
        const releaseTime = new Date(`${release.date}T00:00:00`).getTime();
        if (Number.isNaN(releaseTime) || releaseTime < cutoff) {
          return total;
        }
        return total + release.repositories.length;
      }, 0);
    };

    return {
      monthlyCoverage: getWindowCount(30),
      quarterlyCoverage: getWindowCount(90),
    };
  }, [releases]);

  const activeTarget =
    coveragePeriod === "monthly" ? monthlyTarget : quarterlyTarget;
  const activeCoverage =
    coveragePeriod === "monthly" ? monthlyCoverage : quarterlyCoverage;

  const formatTargetDetail = (count: number, target: number, label: string) => {
    const remaining = target - count;
    if (remaining <= 0) {
      return `${label} target met`;
    }
    return `${remaining} repos short of ${label.toLowerCase()} target`;
  };

  const activeTargetPercent =
    activeTarget > 0
      ? Math.min(999, Math.round((activeCoverage / activeTarget) * 100))
      : 0;

  const handleSelectRelease = (releaseId: string) => {
    startTransition(() => {
      setSelectedReleaseId(releaseId);
    });
  };

  const handleCreateRelease = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!releaseFormValid) return;

    const nextRelease: Release = {
      id: createId(),
      name: releaseForm.name.trim(),
      date: releaseForm.date,
      description: releaseForm.description.trim() || undefined,
      repositories: [],
    };

    setReleases((current) => sortReleases([nextRelease, ...current]));
    setReleaseForm(createEmptyReleaseForm());
    setRepoForm(createEmptyRepoForm());
    startTransition(() => {
      setSelectedReleaseId(nextRelease.id);
    });
  };

  const handleAddRepository = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!repoFormValid || !selectedRelease) return;

    const nextRepository: Repository = {
      id: createId(),
      name: repoForm.name.trim(),
      version: repoForm.version.trim(),
      tag: repoForm.tag.trim() || undefined,
    };

    setReleases((current) =>
      current.map((release) => {
        if (release.id !== selectedRelease.id) return release;

        return {
          ...release,
          repositories: sortRepositories([
            ...release.repositories,
            nextRepository,
          ]),
        };
      }),
    );
    setRepoForm(createEmptyRepoForm());
  };

  const handleUpdateSelectedReleaseDate = (date: string) => {
    if (!selectedRelease || !date) return;

    setReleases((current) =>
      sortReleases(
        current.map((release) =>
          release.id === selectedRelease.id ? { ...release, date } : release,
        ),
      ),
    );
  };

  const handleToggleRepositorySort = (key: RepositorySortKey) => {
    setRepositorySort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleRemoveRepository = (repositoryId: string, repositoryName: string) => {
    if (!selectedRelease) return;
    const confirmed = window.confirm(
      `Are you really sure you want to remove ${repositoryName} from ${selectedRelease.name}?`,
    );
    if (!confirmed) return;

    setReleases((current) =>
      current.map((release) => {
        if (release.id !== selectedRelease.id) return release;

        return {
          ...release,
          repositories: release.repositories.filter(
            (repository) => repository.id !== repositoryId,
          ),
        };
      }),
    );
  };

  const handleDeleteRelease = () => {
    if (!selectedRelease) return;
    const confirmed = window.confirm(
      `Delete ${selectedRelease.name} and all attached repositories?`,
    );
    if (!confirmed) return;

    setReleases((current) =>
      current.filter((release) => release.id !== selectedRelease.id),
    );
  };

  const handleLoadDemoData = () => {
    setReleases(demoReleases);
    startTransition(() => {
      setSelectedReleaseId(demoReleases[0]?.id ?? "");
    });
    setFileMenuOpen(false);
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(
      "Clear every tracked release from local storage?",
    );
    if (!confirmed) return;

    setReleases([]);
    setReleaseSearch("");
    setRepoSearch("");
    setReleaseForm(createEmptyReleaseForm());
    setRepoForm(createEmptyRepoForm());
    setFileMenuOpen(false);
  };

  const handleExportData = () => {
    const payload = JSON.stringify(releases, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = today();

    link.href = url;
    link.download = `code-release-tracker-${stamp}.json`;
    link.click();

    URL.revokeObjectURL(url);
    setFileMenuOpen(false);
  };

  const handleLoadDataClick = () => {
    fileInputRef.current?.click();
    setFileMenuOpen(false);
  };

  const handleToggleWindowMaximize = () => {
    window.electronAPI?.maximize?.();
    setIsWindowMaximized((current) => !current);
  };

  const handleImportData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("Imported data must be an array of releases.");
      }

      const importedReleases = sortReleases(
        parsed
          .map(sanitizeRelease)
          .filter((release): release is Release => release !== null),
      );

      setReleases(importedReleases);
      startTransition(() => {
        setSelectedReleaseId(importedReleases[0]?.id ?? "");
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to import tracker data.";
      window.alert(message);
    } finally {
      event.target.value = "";
    }
  };

  const showWindowControls = Boolean(window.electronAPI);

  return (
    <div className="app-shell">
      <header className="shell-bar">
        <div className="shell-bar__brand">
          <div className="file-menu" ref={fileMenuRef}>
            <button
              type="button"
              className={`file-menu__trigger${fileMenuOpen ? " is-open" : ""}`}
              onClick={() => setFileMenuOpen((current) => !current)}
            >
              File
            </button>
            {fileMenuOpen ? (
              <div className="file-menu__popover">
                <button
                  type="button"
                  className="file-menu__item"
                  onClick={handleLoadDemoData}
                >
                  Load sample data
                </button>
                <button
                  type="button"
                  className="file-menu__item"
                  onClick={handleLoadDataClick}
                >
                  Load tracker data
                </button>
                <button
                  type="button"
                  className="file-menu__item"
                  onClick={() => {
                    window.electronAPI?.checkForUpdates?.();
                    setFileMenuOpen(false);
                  }}
                >
                  Check for updates
                </button>
                <button
                  type="button"
                  className="file-menu__item"
                  onClick={handleExportData}
                  disabled={!releases.length}
                >
                  Export tracker data
                </button>
                <button
                  type="button"
                  className="file-menu__item file-menu__item--danger"
                  onClick={handleClearAll}
                  disabled={!releases.length}
                >
                  Clear tracker
                </button>
              </div>
            ) : null}
          </div>
          <img
            src={logo}
            alt="Code Release Tracker"
            className="shell-bar__logo"
          />
          <strong>Code Release Tracker</strong>
        </div>
        <div className="shell-bar__actions">
          {showWindowControls ? (
            <div className="shell-bar__window">
              <button
                type="button"
                className="shell-bar__control"
                onClick={() => window.electronAPI?.minimize()}
                aria-label="Minimize window"
              >
                -
              </button>
              <button
                type="button"
                className="shell-bar__control shell-bar__control--maximize"
                onClick={handleToggleWindowMaximize}
                aria-label={
                  isWindowMaximized ? "Restore window" : "Maximize window"
                }
              >
                <span
                  aria-hidden="true"
                  className={`shell-bar__maximize-icon${
                    isWindowMaximized ? " is-restored" : ""
                  }`}
                />
              </button>
              <button
                type="button"
                className="shell-bar__control shell-bar__control--close"
                onClick={() => window.electronAPI?.close()}
                aria-label="Close window"
              >
                x
              </button>
            </div>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={handleImportData}
        />
      </header>

      <section className="shell-summary">
        <div className="shell-summary__header">
          <div className="shell-summary__lead">
            <div className="shell-summary__title-block">
              <p className="eyebrow eyebrow--purple">Release operations</p>
              <h1>{selectedRelease?.name || "No release selected"}</h1>
              <p className="shell-summary__subtitle">
                {selectedRelease
                  ? `${formatDate(selectedRelease.date)} - ${selectedRelease.repositories.length} repos attached`
                  : "Create or select a release to begin tracking."}
              </p>
            </div>
          </div>
          <span className="shell-summary__status">
            {selectedRelease ? "Active release selected" : "No release selected"}
          </span>
        </div>
      </section>

      <section className="coverage-control">
        <div>
          <p className="eyebrow eyebrow--dark">Coverage window</p>
          <p className="coverage-control__caption">
            Set target thresholds and compare current monthly or quarterly output.
          </p>
        </div>
        <div className="coverage-control__targets">
          <label className="coverage-control__field">
            Monthly target
            <input
              type="number"
              min="0"
              value={monthlyTarget}
              onChange={(event) =>
                setMonthlyTarget(Math.max(0, Number(event.target.value) || 0))
              }
            />
          </label>
          <label className="coverage-control__field">
            Quarterly target
            <input
              type="number"
              min="0"
              value={quarterlyTarget}
              onChange={(event) =>
                setQuarterlyTarget(Math.max(0, Number(event.target.value) || 0))
              }
            />
          </label>
        </div>
        <div className="coverage-control__buttons">
          {(["monthly", "quarterly"] as const).map((period) => (
            <button
              key={period}
              type="button"
              className={`coverage-control__button${
                coveragePeriod === period ? " is-active" : ""
              }`}
              onClick={() => {
                startTransition(() => setCoveragePeriod(period));
              }}
            >
              {period === "monthly" ? "Monthly" : "Quarterly"}
            </button>
          ))}
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          label="Tracked releases"
          value={`${releases.length}`}
          detail={`${repositoryCount} total repos mapped to releases`}
          accent="ink"
        />
        <MetricCard
          label="Monthly target"
          value={`${monthlyCoverage}/${monthlyTarget}`}
          detail={formatTargetDetail(monthlyCoverage, monthlyTarget, "Monthly")}
          accent="copper"
        />
        <MetricCard
          label="Quarterly target"
          value={`${quarterlyCoverage}/${quarterlyTarget}`}
          detail={formatTargetDetail(
            quarterlyCoverage,
            quarterlyTarget,
            "Quarterly",
          )}
          accent="sage"
        />
        <MetricCard
          label={coveragePeriod === "monthly" ? "Monthly pace" : "Quarterly pace"}
          value={`${activeTargetPercent}%`}
          detail={formatTargetDetail(
            activeCoverage,
            activeTarget,
            coveragePeriod === "monthly" ? "Monthly" : "Quarterly",
          )}
          accent="sand"
        />
      </section>

      <main className="dashboard">
        <aside className="dashboard-sidebar">
          <section className="panel panel--stacked">
            <div className="panel__heading">
              <span className="panel__kicker panel__kicker--badge">
                Create a new release
              </span>
            </div>
            <form className="form" onSubmit={handleCreateRelease}>
              <label className="field-label field-label--required">
                <span className="field-label__row field-label__row--purple">
                  Release name
                  {!releaseForm.name.trim() ? (
                    <span className="field-label__star" aria-hidden="true">
                      ★
                    </span>
                  ) : null}
                </span>
                <input
                  value={releaseForm.name}
                  onChange={(event) =>
                    setReleaseForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Q2 core services drop"
                  required
                />
              </label>
              <label className="field-label field-label--date">
                <span className="field-label__row">Release date</span>
                <input
                  type="date"
                  value={releaseForm.date}
                  onChange={(event) =>
                    setReleaseForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  required
                  aria-label="Release date"
                />
                <span className="field-label__hint">Calendar picker</span>
              </label>
              <label className="field-label">
                <span className="field-label__row">Description</span>
                <textarea
                  value={releaseForm.description}
                  onChange={(event) =>
                    setReleaseForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What changes ship together in this release? How does it impact the business?"
                />
              </label>
              <button
                type="submit"
                className="button button--primary"
                disabled={!releaseFormValid}
              >
                Create release
              </button>
            </form>
          </section>

          <section className="panel panel--stacked">
            <div className="panel__heading">
              <div>
                <p className="eyebrow eyebrow--dark">Release index</p>
                <h2>Browse releases</h2>
              </div>
              <span className="panel__kicker">{filteredReleases.length}</span>
            </div>
            <label className="search-field">
              Search releases
              <input
                value={releaseSearch}
                onChange={(event) => setReleaseSearch(event.target.value)}
                placeholder="Find by release, summary, or repo"
              />
            </label>
            <div className="release-list">
              {filteredReleases.length ? (
                filteredReleases.map((release) => (
                  <ReleaseListItem
                    key={release.id}
                    release={release}
                    active={release.id === selectedRelease?.id}
                    onSelect={handleSelectRelease}
                  />
                ))
              ) : (
                <div className="release-list__empty">
                  <p>No releases match the current search.</p>
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="dashboard-main">
          {selectedRelease ? (
            <>
              <section className="panel panel--feature">
                <div className="release-summary">
                  <div>
                    <p className="eyebrow eyebrow--dark">Selected release</p>
                    <h2>{selectedRelease.name}</h2>
                    <p className="release-summary__meta">
                      {formatDate(selectedRelease.date)} -{" "}
                      {selectedRelease.repositories.length} repositories
                    </p>
                    <label className="field-label field-label--date release-summary__date-field">
                      <span className="field-label__row">Release date</span>
                      <input
                        type="date"
                        value={selectedRelease.date}
                        onChange={(event) =>
                          handleUpdateSelectedReleaseDate(event.target.value)
                        }
                        aria-label="Edit release date"
                      />
                    </label>
                    <p className="release-summary__copy">
                      {selectedRelease.description ||
                        "No description yet. Use the repository list to document what ships in this release."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button--ghost button--danger"
                    onClick={handleDeleteRelease}
                  >
                    Delete release
                  </button>
                </div>
                <div className="tag-strip">
                  {selectedTags.length ? (
                    selectedTags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="tag-chip tag-chip--muted">
                      No tags assigned yet
                    </span>
                  )}
                </div>
              </section>

              <section className="panel panel--stacked">
                <div className="panel__heading">
                  <div>
                    <p className="eyebrow eyebrow--dark">Attach repositories</p>
                    <h2>Versioned services for this release</h2>
                  </div>
                  <span className="panel__kicker">
                    {selectedRelease.name}
                  </span>
                </div>
                <form className="form form--inline" onSubmit={handleAddRepository}>
                  <label className="field-label field-label--required">
                    <span className="field-label__row">
                      Repository
                      {!repoForm.name.trim() ? (
                        <span className="field-label__star" aria-hidden="true">
                          ★
                        </span>
                      ) : null}
                    </span>
                    <input
                      value={repoForm.name}
                      onChange={(event) =>
                        setRepoForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="orders-api"
                      required
                    />
                  </label>
                  <label className="field-label field-label--required">
                    <span className="field-label__row">
                      Version
                      {!repoForm.version.trim() ? (
                        <span className="field-label__star" aria-hidden="true">
                          ★
                        </span>
                      ) : null}
                    </span>
                    <input
                      value={repoForm.version}
                      onChange={(event) =>
                        setRepoForm((current) => ({
                          ...current,
                          version: event.target.value,
                        }))
                      }
                      placeholder="2.5.1"
                      required
                    />
                  </label>
                  <label>
                    Tag
                    <input
                      value={repoForm.tag}
                      onChange={(event) =>
                        setRepoForm((current) => ({
                          ...current,
                          tag: event.target.value,
                        }))
                      }
                      placeholder="stable"
                    />
                  </label>
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={!repoFormValid}
                  >
                    Add repository
                  </button>
                </form>
              </section>

              <section className="panel panel--stacked">
                <div className="panel__heading">
                  <div>
                    <p className="eyebrow eyebrow--dark">Repository ledger</p>
                    <h2>What ships inside this release</h2>
                  </div>
                  <label className="search-field search-field--compact">
                    Filter repositories
                    <input
                      value={repoSearch}
                      onChange={(event) => setRepoSearch(event.target.value)}
                      placeholder="Search repo, version, or tag"
                    />
                  </label>
                </div>

                {selectedRelease.repositories.length ? (
                  <div className="repository-table-wrap">
                    <table className="repository-table">
                      <thead>
                        <tr>
                          <th>
                            <button
                              type="button"
                              className={`repository-table__sort${
                                repositorySort.key === "name" ? " is-active" : ""
                              }`}
                              onClick={() => handleToggleRepositorySort("name")}
                            >
                              Repository
                              <span className="repository-table__sort-indicator">
                                {repositorySort.key === "name"
                                  ? repositorySort.direction.toUpperCase()
                                  : "SORT"}
                              </span>
                            </button>
                          </th>
                          <th>
                            <button
                              type="button"
                              className={`repository-table__sort${
                                repositorySort.key === "version" ? " is-active" : ""
                              }`}
                              onClick={() => handleToggleRepositorySort("version")}
                            >
                              Version
                              <span className="repository-table__sort-indicator">
                                {repositorySort.key === "version"
                                  ? repositorySort.direction.toUpperCase()
                                  : "SORT"}
                              </span>
                            </button>
                          </th>
                          <th>
                            <button
                              type="button"
                              className={`repository-table__sort${
                                repositorySort.key === "tag" ? " is-active" : ""
                              }`}
                              onClick={() => handleToggleRepositorySort("tag")}
                            >
                              Tag
                              <span className="repository-table__sort-indicator">
                                {repositorySort.key === "tag"
                                  ? repositorySort.direction.toUpperCase()
                                  : "SORT"}
                              </span>
                            </button>
                          </th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRepositories.length ? (
                          visibleRepositories.map((repository) => (
                            <tr key={repository.id}>
                              <td>
                                <strong>{repository.name}</strong>
                              </td>
                              <td>
                                <span className="version-pill">
                                  {repository.version}
                                </span>
                              </td>
                              <td>
                                {repository.tag ? (
                                  <span className="tag-chip">
                                    {repository.tag}
                                  </span>
                                ) : (
                                  <span className="tag-chip tag-chip--muted">
                                    Untagged
                                  </span>
                                )}
                              </td>
                              <td className="repository-table__actions">
                                <button
                                  type="button"
                                  className="button button--table button--table-danger"
                                  onClick={() =>
                                    handleRemoveRepository(
                                      repository.id,
                                      repository.name,
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="repository-table__empty">
                              No repositories match the current filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-panel">
                    <h3>No repositories attached yet.</h3>
                    <p>
                      Start with the repository name and the version that ships
                      in this release. Add a tag only when it clarifies rollout
                      state.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="panel panel--feature empty-panel empty-panel--large">
              <h2>No release selected</h2>
              <p>
                Create a release or load the sample data to shape the
                tracker. The workspace opens once there is at least one release.
              </p>
            </section>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>Code Release Tracker</span>
        <span>Version {__APP_VERSION__}</span>
      </footer>
    </div>
  );
}

export default App;
